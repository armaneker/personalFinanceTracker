import { buildDashboardSummary } from "@/lib/analytics";
import { errorResponse, successResponse } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? undefined;

    const summary = await buildDashboardSummary(month);
    if (!summary) {
      return successResponse({ summary: null });
    }

    return successResponse({ summary });
  } catch (error) {
    return errorResponse(error);
  }
}
