// lib/validation.ts
import { z } from "zod";

export const ResourceTypeEnum = z.enum(["ROOM", "EQUIPMENT", "VEHICLE"]);

export const CreateResourceSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  type: ResourceTypeEnum,
  capacity: z.coerce.number().int("Capacity must be an integer").min(1, "Capacity must be at least 1").max(10000, "Capacity cannot exceed 10,000"),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UpdateResourceSchema = CreateResourceSchema.partial();

export const CreateReservationSchema = z
  .object({
    resourceId: z.string().min(1, "Resource ID is required"),
    bookedBy: z.string().trim().min(2, "Booked by must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
    purpose: z.string().trim().min(3, "Purpose must be at least 3 characters").max(255, "Purpose cannot exceed 255 characters"),
    startTime: z.string().datetime({ message: "Invalid start time format (ISO 8601 required)" }),
    endTime: z.string().datetime({ message: "Invalid end time format (ISO 8601 required)" }),
    status: z.enum(["CONFIRMED", "CANCELLED"]).default("CONFIRMED"),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return end.getTime() > start.getTime();
    },
    {
      message: "End time must be strictly after start time",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      // Give a small grace window of 60 seconds for network latency
      const now = new Date(Date.now() - 60 * 1000);
      return start >= now;
    },
    {
      message: "Reservations cannot be made in the past",
      path: ["startTime"],
    }
  );

export const UpdateReservationSchema = z
  .object({
    resourceId: z.string().optional(),
    bookedBy: z.string().trim().min(2).max(100).optional(),
    purpose: z.string().trim().min(3).max(255).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime).getTime() > new Date(data.startTime).getTime();
      }
      return true;
    },
    {
      message: "End time must be strictly after start time",
      path: ["endTime"],
    }
  );

export const AvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  resourceId: z.string().optional(),
});

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;
export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>;
