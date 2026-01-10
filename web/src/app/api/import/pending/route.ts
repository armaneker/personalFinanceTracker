import { listPendingRunSummaries } from "@/lib/importer";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const pending = await listPendingRunSummaries(userId);
    return successResponse({ pending });
  } catch (error) {
    return errorResponse(error);
  }
}
