import { prisma } from "./prisma";
import { format, parseISO, startOfDay, endOfDay, setHours, setMinutes } from "date-fns";
import { ResourceAvailability, AvailabilitySlot } from "./types";

export class AvailabilityService {
  /**
   * Generates availability for resources on a specific date between 08:00 and 20:00
   */
  static async getAvailabilityForDate(dateStr: string, resourceIdFilter?: string): Promise<ResourceAvailability[]> {
    const selectedDate = parseISO(dateStr);
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    // Fetch resources
    const resources = await prisma.resource.findMany({
      where: {
        ...(resourceIdFilter && resourceIdFilter !== "ALL" ? { id: resourceIdFilter } : {}),
      },
      orderBy: { name: "asc" },
    });

    // Fetch confirmed reservations for the day
    const reservations = await prisma.reservation.findMany({
      where: {
        ...(resourceIdFilter && resourceIdFilter !== "ALL" ? { resourceId: resourceIdFilter } : {}),
        status: "CONFIRMED",
        // reservation overlaps with the day
        AND: [
          { startTime: { lt: dayEnd } },
          { endTime: { gt: dayStart } },
        ],
      },
      orderBy: { startTime: "asc" },
    });

    // Timeline hours: 08:00 to 20:00 (12 hours) in 1-hour slots
    return resources.map((resource) => {
      const resReservations = reservations.filter((r) => r.resourceId === resource.id);
      const slots: AvailabilitySlot[] = [];

      for (let hour = 8; hour < 20; hour++) {
        const slotStart = setMinutes(setHours(selectedDate, hour), 0);
        const slotEnd = setMinutes(setHours(selectedDate, hour + 1), 0);

        // Find if any reservation covers this hour
        const bookedRes = resReservations.find((r) => {
          const rStart = new Date(r.startTime);
          const rEnd = new Date(r.endTime);
          return rStart < slotEnd && rEnd > slotStart;
        });

        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          isBooked: !!bookedRes,
          reservation: bookedRes
            ? {
                id: bookedRes.id,
                bookedBy: bookedRes.bookedBy,
                purpose: bookedRes.purpose,
              }
            : undefined,
        });
      }

      return {
        resource: {
          ...resource,
          createdAt: resource.createdAt.toISOString(),
          updatedAt: resource.updatedAt.toISOString(),
        },
        slots,
        reservations: resReservations.map((r) => ({
          ...r,
          startTime: r.startTime.toISOString(),
          endTime: r.endTime.toISOString(),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      };
    });
  }

  static async getDashboardStats() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [totalResources, activeResources, todayReservations, upcomingReservations, allRecentReservations] =
      await Promise.all([
        prisma.resource.count(),
        prisma.resource.count({ where: { isActive: true } }),
        prisma.reservation.findMany({
          where: {
            startTime: { gte: todayStart, lte: todayEnd },
          },
          include: { resource: true },
          orderBy: { startTime: "asc" },
        }),
        prisma.reservation.findMany({
          where: {
            status: "CONFIRMED",
            startTime: { gte: now },
          },
          include: { resource: true },
          orderBy: { startTime: "asc" },
          take: 6,
        }),
        prisma.reservation.findMany({
          where: {
            status: "CONFIRMED",
            startTime: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

    const confirmedToday = todayReservations.filter((r) => r.status === "CONFIRMED");

    // Calculate weekly utilization: total booked hours / (activeResources * 50 working hours)
    let totalWeeklyHours = 0;
    for (const res of allRecentReservations) {
      const dur = new Date(res.endTime).getTime() - new Date(res.startTime).getTime();
      if (dur > 0) totalWeeklyHours += dur / (1000 * 60 * 60);
    }
    const maxCapacityHours = Math.max(1, activeResources * 50);
    const weeklyUtilizationRate = Math.min(100, Math.round((totalWeeklyHours / maxCapacityHours) * 100));

    return {
      totalResources,
      activeResources,
      reservationsToday: todayReservations.length,
      confirmedReservationsToday: confirmedToday.length,
      weeklyUtilizationRate,
      upcomingReservations: upcomingReservations.map((r) => ({
        ...r,
        startTime: r.startTime.toISOString(),
        endTime: r.endTime.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      todayReservations: todayReservations.map((r) => ({
        ...r,
        startTime: r.startTime.toISOString(),
        endTime: r.endTime.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }
}
