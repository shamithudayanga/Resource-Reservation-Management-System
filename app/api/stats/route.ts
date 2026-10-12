import { NextResponse } from "next/server";
import { AvailabilityService } from "@/lib/availability-service";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await AvailabilityService.getDashboardStats();
    return NextResponse.json({ data: stats });
  } catch (error) {
    return handleApiError(error);
  }
}
