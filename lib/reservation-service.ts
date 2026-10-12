import { prisma } from "./prisma";
import { CreateReservationInput, UpdateReservationInput } from "./validation";
import { formatDateTime } from "./utils";

export class ReservationService {
  static async getAll(filters?: {
    resourceId?: string;
    status?: "CONFIRMED" | "CANCELLED";
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: Record<string, unknown> = {};

    if (filters?.resourceId && filters.resourceId !== "ALL") {
      where.resourceId = filters.resourceId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { bookedBy: { contains: filters.search, mode: "insensitive" } },
        { purpose: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.startDate || filters?.endDate) {
      const timeFilter: Record<string, unknown> = {};
      if (filters.startDate) {
        timeFilter.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        timeFilter.lte = new Date(filters.endDate);
      }
      where.startTime = timeFilter;
    }

    return prisma.reservation.findMany({
      where,
      include: {
        resource: true,
      },
      orderBy: { startTime: "desc" },
    });
  }

  static async getById(id: string) {
    return prisma.reservation.findUnique({
      where: { id },
      include: { resource: true },
    });
  }

  /**
   * Check for overlapping reservations before attempting insertion.
   * Note: The PostgreSQL GiST exclusion constraint remains the atomic source of truth
   * for race conditions and concurrent requests.
   */
  static async checkOverlap(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeReservationId?: string
  ) {
    const conflicting = await prisma.reservation.findFirst({
      where: {
        resourceId,
        status: "CONFIRMED",
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
        // Overlap condition: start < other.end AND end > other.start
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
      include: {
        resource: true,
      },
    });

    return conflicting;
  }

  static async create(data: CreateReservationInput) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    // 1. Verify resource exists and is active
    const resource = await prisma.resource.findUnique({
      where: { id: data.resourceId },
    });

    if (!resource) {
      const err = new Error("Selected resource does not exist");
      Object.assign(err, { code: "NOT_FOUND" });
      throw err;
    }

    if (!resource.isActive) {
      const err = new Error(`Resource "${resource.name}" is currently inactive and cannot be booked`);
      Object.assign(err, { code: "RESOURCE_INACTIVE" });
      throw err;
    }

    // 2. Perform pre-check query for a helpful conflict message
    const conflict = await this.checkOverlap(data.resourceId, start, end);
    if (conflict) {
      const conflictMsg = `Conflict detected: "${conflict.resource.name}" is already booked by ${conflict.bookedBy} (${conflict.purpose}) from ${formatDateTime(conflict.startTime.toISOString())} to ${formatDateTime(conflict.endTime.toISOString())}.`;
      const err = new Error(conflictMsg);
      Object.assign(err, { code: "23P01" });
      throw err;
    }

    // 3. Insert record. If a concurrent race condition occurs, PostgreSQL constraint "no_overlapping_confirmed_reservations" will trigger error 23P01.
    return prisma.reservation.create({
      data: {
        resourceId: data.resourceId,
        bookedBy: data.bookedBy,
        purpose: data.purpose,
        startTime: start,
        endTime: end,
        status: data.status ?? "CONFIRMED",
      },
      include: { resource: true },
    });
  }

  static async update(id: string, data: UpdateReservationInput) {
    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { resource: true },
    });

    if (!existing) {
      const err = new Error("Reservation not found");
      Object.assign(err, { code: "P2025" });
      throw err;
    }

    const targetResourceId = data.resourceId ?? existing.resourceId;
    const start = data.startTime ? new Date(data.startTime) : existing.startTime;
    const end = data.endTime ? new Date(data.endTime) : existing.endTime;
    const targetStatus = data.status ?? existing.status;

    // If changing to another resource, ensure target resource is active
    if (data.resourceId && data.resourceId !== existing.resourceId) {
      const targetResource = await prisma.resource.findUnique({
        where: { id: data.resourceId },
      });
      if (!targetResource || !targetResource.isActive) {
        const err = new Error("Target resource is inactive or does not exist");
        Object.assign(err, { code: "RESOURCE_INACTIVE" });
        throw err;
      }
    }

    // Check overlap if confirmed
    if (targetStatus === "CONFIRMED") {
      const conflict = await this.checkOverlap(targetResourceId, start, end, id);
      if (conflict) {
        const conflictMsg = `Conflict detected: "${conflict.resource.name}" is already booked by ${conflict.bookedBy} from ${formatDateTime(conflict.startTime.toISOString())} to ${formatDateTime(conflict.endTime.toISOString())}.`;
        const err = new Error(conflictMsg);
        Object.assign(err, { code: "23P01" });
        throw err;
      }
    }

    return prisma.reservation.update({
      where: { id },
      data: {
        ...(data.resourceId ? { resourceId: data.resourceId } : {}),
        ...(data.bookedBy ? { bookedBy: data.bookedBy } : {}),
        ...(data.purpose ? { purpose: data.purpose } : {}),
        ...(data.startTime ? { startTime: start } : {}),
        ...(data.endTime ? { endTime: end } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
      include: { resource: true },
    });
  }

  static async cancel(id: string) {
    return prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { resource: true },
    });
  }
}
