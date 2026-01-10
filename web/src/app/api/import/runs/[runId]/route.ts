import type { NextRequest } from "next/server";

import {
  getImportRunById,
  deleteImportRun,
  deleteTransactionsByStatementRef,
} from "@/lib/data-store";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";
import { ErrorFactory } from "@/lib/errors";

/**
 * DELETE /api/import/runs/[runId]
 * Delete an import run and all associated transactions
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: { runId: string } | Promise<{ runId: string }> },
) {
  try {
    const userId = await requireUserId();
    const params = await context.params;
    const runId = params.runId;

    // Get the import run to find the statement_file
    const importRun = await getImportRunById(userId, runId);
    if (!importRun) {
      throw ErrorFactory.notFound(`Import run ${runId}`);
    }

    // Delete all transactions with matching statement_ref
    const deletedTransactions = await deleteTransactionsByStatementRef(
      userId,
      importRun.statement_file,
    );

    // Delete the import run record
    await deleteImportRun(userId, runId);

    return successResponse({
      ok: true,
      deleted: {
        runId,
        transactionsCount: deletedTransactions,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * GET /api/import/runs/[runId]
 * Get details of a specific import run
 */
export async function GET(
  _request: NextRequest,
  context: { params: { runId: string } | Promise<{ runId: string }> },
) {
  try {
    const userId = await requireUserId();
    const params = await context.params;
    const runId = params.runId;

    const importRun = await getImportRunById(userId, runId);
    if (!importRun) {
      throw ErrorFactory.notFound(`Import run ${runId}`);
    }

    return successResponse(importRun);
  } catch (error) {
    return errorResponse(error);
  }
}
