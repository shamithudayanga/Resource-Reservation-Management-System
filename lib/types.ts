// lib/types.ts

export type ResourceType = 'ROOM' | 'EQUIPMENT' | 'VEHICLE';
export type ReservationStatus = 'CONFIRMED' | 'CANCELLED';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    reservations: number;
  };
  stats?: {
    totalHours: number;
    reservationCount: number;
    utilizationRate: number; // percentage 0 - 100
  };
}

export interface Reservation {
  id: string;
  resourceId: string;
  bookedBy: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  resource?: Resource;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AvailabilitySlot {
  id?: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  reservation?: {
    id: string;
    bookedBy: string;
    purpose: string;
  };
}

export interface ResourceAvailability {
  resource: Resource;
  slots: AvailabilitySlot[];
  reservations: Reservation[];
}

export interface DashboardStats {
  totalResources: number;
  activeResources: number;
  reservationsToday: number;
  confirmedReservationsToday: number;
  weeklyUtilizationRate: number;
  upcomingReservations: Reservation[];
  todayReservations: Reservation[];
}
