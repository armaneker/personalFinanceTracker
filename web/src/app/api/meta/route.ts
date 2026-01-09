import { getCards, getCategories, getOwners, listTransactionMonths } from "@/lib/data-store";
import { errorResponse, successResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const [cards, owners, categories, months] = await Promise.all([
      getCards(),
      getOwners(),
      getCategories(),
      listTransactionMonths(),
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
