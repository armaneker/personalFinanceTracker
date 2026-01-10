import { getDistinctFilters } from "@/lib/analytics";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const filters = await getDistinctFilters(userId);
    return successResponse(filters);
  } catch (error) {
    return errorResponse(error);
  }
}
