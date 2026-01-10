import { buildDashboardSummary } from "@/lib/analytics";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? undefined;

    const summary = await buildDashboardSummary(userId, month);
    if (!summary) {
      return successResponse({ summary: null });
    }

    return successResponse({ summary });
  } catch (error) {
    return errorResponse(error);
  }
}
