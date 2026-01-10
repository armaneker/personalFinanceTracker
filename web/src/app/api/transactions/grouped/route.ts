import { getTransactionsGroupedByCard } from "@/lib/analytics";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const grouped = await getTransactionsGroupedByCard(userId);
    return successResponse({ grouped });
  } catch (error) {
    return errorResponse(error);
  }
}
