import { getCards, getCategories, getOwners, listTransactionMonths } from "@/lib/data-store";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const [cards, owners, categories, months] = await Promise.all([
      getCards(userId),
      getOwners(userId),
      getCategories(userId),
      listTransactionMonths(userId),
    ]);

    return successResponse({
      cards,
      owners,
      categories,
      months,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
