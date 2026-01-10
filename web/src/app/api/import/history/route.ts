import { getImportHistory } from "@/lib/data-store";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const history = await getImportHistory(userId);
    return successResponse({ history });
  } catch (error) {
    return errorResponse(error);
  }
}
