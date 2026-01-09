import { getImportHistory } from "@/lib/data-store";
import { errorResponse, successResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const history = await getImportHistory();
    return successResponse({ history });
  } catch (error) {
    return errorResponse(error);
  }
}
