import { NextRequest, NextResponse } from "next/server";
import { ResourceService } from "@/lib/resource-service";
import { CreateResourceSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") !== "false";
    const resources = await ResourceService.getAll(includeStats);
    return NextResponse.json({ data: resources });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateResourceSchema.parse(body);
    const resource = await ResourceService.create(validated);
    return NextResponse.json({ data: resource }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
