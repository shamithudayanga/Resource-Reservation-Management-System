import { describe, it, expect } from "vitest";
import { CreateReservationSchema, CreateResourceSchema } from "@/lib/validation";

describe("Validation Schemas & Business Rules", () => {
  it("rejects reservation when end_time is before or equal to start_time", () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const start = futureDate.toISOString();
    const end = new Date(futureDate.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour earlier

    const result = CreateReservationSchema.safeParse({
      resourceId: "res-123",
      bookedBy: "John Doe",
      purpose: "Sprint Planning",
      startTime: start,
      endTime: end,
      status: "CONFIRMED",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("End time must be strictly after start time");
    }
  });

  it("rejects reservations created in the past", () => {
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const pastEnd = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    const result = CreateReservationSchema.safeParse({
      resourceId: "res-123",
      bookedBy: "Jane Smith",
      purpose: "Retrospective",
      startTime: pastStart,
      endTime: pastEnd,
      status: "CONFIRMED",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Reservations cannot be made in the past");
    }
  });

  it("accepts valid reservation data in the future", () => {
    const futureStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    const result = CreateReservationSchema.safeParse({
      resourceId: "res-123",
      bookedBy: "Alex Rivera",
      purpose: "Architecture Review",
      startTime: futureStart,
      endTime: futureEnd,
      status: "CONFIRMED",
    });

    expect(result.success).toBe(true);
  });

  it("validates resource capacity and bounds", () => {
    const invalidCapacity = CreateResourceSchema.safeParse({
      name: "Pod 1",
      type: "ROOM",
      capacity: 0,
      description: "Mini pod",
      isActive: true,
    });

    expect(invalidCapacity.success).toBe(false);

    const validResource = CreateResourceSchema.safeParse({
      name: "Boardroom A",
      type: "ROOM",
      capacity: 20,
      description: "Main conference room",
      isActive: true,
    });

    expect(validResource.success).toBe(true);
  });
});

describe("Reservation Interval Overlap Logic", () => {
  // Pure algorithm test matching Postgres GiST [) range overlap
  function doesOverlap(
    reqStart: Date,
    reqEnd: Date,
    existingStart: Date,
    existingEnd: Date
  ): boolean {
    // [reqStart, reqEnd) overlaps with [existingStart, existingEnd) iff:
    // reqStart < existingEnd AND reqEnd > existingStart
    return reqStart.getTime() < existingEnd.getTime() && reqEnd.getTime() > existingStart.getTime();
  }

  const bookedStart = new Date("2026-10-15T10:00:00Z");
  const bookedEnd = new Date("2026-10-15T12:00:00Z");

  it("detects exact overlap", () => {
    expect(doesOverlap(new Date("2026-10-15T10:00:00Z"), new Date("2026-10-15T12:00:00Z"), bookedStart, bookedEnd)).toBe(true);
  });

  it("detects subset overlap (inside existing booking)", () => {
    expect(doesOverlap(new Date("2026-10-15T10:30:00Z"), new Date("2026-10-15T11:30:00Z"), bookedStart, bookedEnd)).toBe(true);
  });

  it("detects superset overlap (enveloping existing booking)", () => {
    expect(doesOverlap(new Date("2026-10-15T09:00:00Z"), new Date("2026-10-15T13:00:00Z"), bookedStart, bookedEnd)).toBe(true);
  });

  it("detects overlap on partial left edge", () => {
    expect(doesOverlap(new Date("2026-10-15T09:30:00Z"), new Date("2026-10-15T10:30:00Z"), bookedStart, bookedEnd)).toBe(true);
  });

  it("detects overlap on partial right edge", () => {
    expect(doesOverlap(new Date("2026-10-15T11:30:00Z"), new Date("2026-10-15T12:30:00Z"), bookedStart, bookedEnd)).toBe(true);
  });

  it("permits back-to-back adjacent bookings without overlap ([) half-open interval)", () => {
    // Immediately adjacent preceding slot ending right at 10:00:00
    expect(doesOverlap(new Date("2026-10-15T08:00:00Z"), new Date("2026-10-15T10:00:00Z"), bookedStart, bookedEnd)).toBe(false);

    // Immediately adjacent subsequent slot starting right at 12:00:00
    expect(doesOverlap(new Date("2026-10-15T12:00:00Z"), new Date("2026-10-15T14:00:00Z"), bookedStart, bookedEnd)).toBe(false);
  });
});
