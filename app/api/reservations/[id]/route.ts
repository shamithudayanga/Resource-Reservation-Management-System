import { NextRequest, NextResponse } from "next/server";
import { ReservationService } from "@/lib/reservation-service";
import { UpdateReservationSchema } from "@/lib/validation";
import { handleApiError, createErrorResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const reservation = await ReservationService.getById(id);
    if (!reservation) {
      return createErrorResponse(404, "NOT_FOUND", "Reservation not found");
    }
    return NextResponse.json({ data: reservation });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validated = UpdateReservationSchema.parse(body);
    const updated = await ReservationService.update(id, validated);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cancelled = await ReservationService.cancel(id);
    return NextResponse.json({ data: cancelled, message: "Reservation cancelled successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
