import { getTransactionsGroupedByCard } from "@/lib/analytics";
import { errorResponse, successResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const grouped = await getTransactionsGroupedByCard();
    return successResponse({ grouped });
  } catch (error) {
    return errorResponse(error);
  }
}
