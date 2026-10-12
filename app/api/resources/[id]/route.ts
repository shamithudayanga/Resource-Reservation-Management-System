import { NextRequest, NextResponse } from "next/server";
import { ResourceService } from "@/lib/resource-service";
import { UpdateResourceSchema } from "@/lib/validation";
import { handleApiError, createErrorResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const resource = await ResourceService.getById(id);
    if (!resource) {
      return createErrorResponse(404, "NOT_FOUND", "Resource not found");
    }
    return NextResponse.json({ data: resource });
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
    const validated = UpdateResourceSchema.parse(body);
    const updated = await ResourceService.update(id, validated);
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
    const deleted = await ResourceService.delete(id);
    return NextResponse.json({ data: deleted, message: "Resource deleted successfully" });
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    if (err?.code === "RESOURCE_HAS_FUTURE_BOOKINGS") {
      return createErrorResponse(
        400,
        "BAD_REQUEST",
        (err.message as string) || "Resource has future bookings"
      );
    }
    return handleApiError(error);
  }
}
