import { NextRequest, NextResponse } from "next/server";
import { AvailabilityService } from "@/lib/availability-service";
import { AvailabilityQuerySchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const resourceId = searchParams.get("resourceId") || undefined;

    const validated = AvailabilityQuerySchema.parse({ date, resourceId });
    const availability = await AvailabilityService.getAvailabilityForDate(validated.date, validated.resourceId);

    return NextResponse.json({ data: availability });
  } catch (error) {
    return handleApiError(error);
  }
}
