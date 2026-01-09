import { getDistinctFilters } from "@/lib/analytics";
import { errorResponse, successResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const filters = await getDistinctFilters();
    return successResponse(filters);
  } catch (error) {
    return errorResponse(error);
  }
}
