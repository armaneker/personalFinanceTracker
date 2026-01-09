import { listPendingRunSummaries } from "@/lib/importer";
import { errorResponse, successResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const pending = await listPendingRunSummaries();
    return successResponse({ pending });
  } catch (error) {
    return errorResponse(error);
  }
}
