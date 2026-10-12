import { NextRequest, NextResponse } from "next/server";
import { ReservationService } from "@/lib/reservation-service";
import { CreateReservationSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get("resourceId") || undefined;
    const statusParam = searchParams.get("status");
    const status = (statusParam === "CONFIRMED" || statusParam === "CANCELLED") ? statusParam : undefined;
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const reservations = await ReservationService.getAll({
      resourceId,
      status,
      search,
      startDate,
      endDate,
    });

    return NextResponse.json({ data: reservations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateReservationSchema.parse(body);
    const reservation = await ReservationService.create(validated);
    return NextResponse.json({ data: reservation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
