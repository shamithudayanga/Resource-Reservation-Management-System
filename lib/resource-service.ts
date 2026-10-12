import { prisma } from "./prisma";
import { CreateResourceInput, UpdateResourceInput } from "./validation";

export class ResourceService {
  static async getAll(includeStats = true) {
    const resources = await prisma.resource.findMany({
      orderBy: { name: "asc" },
      include: {
        reservations: {
          where: { status: "CONFIRMED" },
          select: {
            startTime: true,
            endTime: true,
          },
        },
        _count: {
          select: { reservations: true },
        },
      },
    });

    if (!includeStats) {
      return resources.map((r) => {
        const { reservations: _res, ...rest } = r;
        return rest;
      });
    }

    // Calculate usage stats per resource
    return resources.map((r) => {
      let totalMilliseconds = 0;
      for (const res of r.reservations) {
        const dur = new Date(res.endTime).getTime() - new Date(res.startTime).getTime();
        if (dur > 0) totalMilliseconds += dur;
      }
      const totalHours = Math.round((totalMilliseconds / (1000 * 60 * 60)) * 10) / 10;
      
      // Calculate realistic utilization bar based on 60 hours working capacity
      const utilizationRate = Math.min(100, Math.round((totalHours / 60) * 100));

      const { reservations: _res, ...rest } = r;
      return {
        ...rest,
        stats: {
          totalHours,
          reservationCount: r._count.reservations,
          utilizationRate,
        },
      };
    });
  }

  static async getById(id: string) {
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        reservations: {
          orderBy: { startTime: "asc" },
        },
        _count: {
          select: { reservations: true },
        },
      },
    });

    if (!resource) return null;

    let totalMilliseconds = 0;
    for (const res of resource.reservations.filter((r) => r.status === "CONFIRMED")) {
      const dur = new Date(res.endTime).getTime() - new Date(res.startTime).getTime();
      if (dur > 0) totalMilliseconds += dur;
    }
    const totalHours = Math.round((totalMilliseconds / (1000 * 60 * 60)) * 10) / 10;
    const utilizationRate = Math.min(100, Math.round((totalHours / 60) * 100));

    return {
      ...resource,
      stats: {
        totalHours,
        reservationCount: resource._count.reservations,
        utilizationRate,
      },
    };
  }

  static async create(data: CreateResourceInput) {
    return prisma.resource.create({
      data: {
        name: data.name,
        type: data.type,
        capacity: data.capacity,
        description: data.description,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async update(id: string, data: UpdateResourceInput) {
    return prisma.resource.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    // Check if there are future confirmed reservations
    const now = new Date();
    const futureReservationsCount = await prisma.reservation.count({
      where: {
        resourceId: id,
        status: "CONFIRMED",
        endTime: { gte: now },
      },
    });

    if (futureReservationsCount > 0) {
      const error: Error & { code?: string; futureCount?: number } = new Error(
        `Cannot delete this resource because it has ${futureReservationsCount} active or upcoming reservation(s). Please cancel or reassign them first, or deactivate the resource instead.`
      );
      error.code = "RESOURCE_HAS_FUTURE_BOOKINGS";
      error.futureCount = futureReservationsCount;
      throw error;
    }

    return prisma.resource.delete({
      where: { id },
    });
  }

  static async toggleActive(id: string, isActive: boolean) {
    return prisma.resource.update({
      where: { id },
      data: { isActive },
    });
  }
}
