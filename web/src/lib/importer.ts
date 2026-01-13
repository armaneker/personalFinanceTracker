/**
 * Importer Module - Orchestrates the import flow
 *
 * This module acts as a thin orchestration layer that coordinates:
 * - validation.ts: Input validation and sanitization
 * - category-service.ts: Category management
 * - transaction-builder.ts: Transaction record building and preparation
 * - pending-extraction-service.ts: Pending run management
 * - fx-service.ts: Currency conversion (already extracted)
 *
 * All functions require a userId parameter for multi-user support.
 */

import {
  appendImportHistory,
  createOrUpdateTransaction,
  getImportHistory,
  listPendingRunIds,
  loadPendingExtractionWithMeta,
  deletePendingExtraction,
} from "./data-store";
import { StatementExtractionInput } from "./schemas";
import { ensureCategories } from "./category-service";
import {
  prepareExtraction,
  inferMonthFromExtraction,
  type CommitExtractionOptions,
  type PreparedExtraction,
} from "./transaction-builder";
import {
  normalizePendingExtractionRecord,
  loadStoredPendingExtraction,
  getPreparedExtraction,
} from "./pending-extraction-service";

// Re-export public APIs from sub-modules
export { validateExtraction } from "./validation";
export {
  persistExtractionToPending,
  listPendingRunSummaries,
  getPendingRunDetail,
  discardPendingRun,
  type PendingRunSummary,
  type PendingRunDetail,
  type ApprovePendingOverrides,
  type StoredPendingExtraction,
} from "./pending-extraction-service";
export { type CommitExtractionOptions, type PreparedExtraction } from "./transaction-builder";

export interface ExistingImportMatch {
  type: "history" | "pending";
  run_id: string;
  month?: string;
}

/**
 * Find existing import by fingerprint in history or pending runs
 */
export async function findExistingImportByFingerprint(
  userId: string,
  fingerprint: string,
  cardId?: string,
): Promise<ExistingImportMatch | null> {
  if (!fingerprint) return null;

  // Check import history first
  const history = await getImportHistory(userId);
  const historyMatch = history.find(
    (entry) => entry.fingerprint === fingerprint && (!cardId || entry.card_id === cardId),
  );
  if (historyMatch) {
    return {
      type: "history",
      run_id: historyMatch.run_id,
      month: historyMatch.month,
    };
  }

  // Check pending runs
  const pendingIds = await listPendingRunIds(userId);
  for (const runId of pendingIds) {
    const meta = await loadPendingExtractionWithMeta(userId, runId);
    if (!meta) continue;
    const record = await normalizePendingExtractionRecord(userId, runId, meta.data, meta.savedAt);
    if (!record) continue;
    if (
      record.options?.fingerprint === fingerprint &&
      (!cardId || record.options.cardId === cardId)
    ) {
      return {
        type: "pending",
        run_id: runId,
        month: record.options.month,
      };
    }
  }

  return null;
}

/**
 * Commit extraction to database and history
 */
export async function commitExtraction(
  userId: string,
  payload: StatementExtractionInput,
  options: CommitExtractionOptions,
  precomputed?: PreparedExtraction,
) {
  // Ensure all categories exist
  await ensureCategories(userId, payload);

  // Prepare extraction if not precomputed
  const prepared = precomputed ?? (await prepareExtraction(payload, options, userId));

  // Commit each transaction
  const commitMonths = new Set<string>();
  for (const item of prepared.records) {
    commitMonths.add(item.month);
    // Ensure source_llm metadata is propagated
    item.record.source_llm = {
      run_id: payload.run_id,
      model: payload.model,
      ...item.record.source_llm,
    };
    await createOrUpdateTransaction(userId, item.month, item.record);
  }

  // Record in import history
  await appendImportHistory(userId, {
    run_id: payload.run_id,
    statement_file: options.statementFile,
    card_id: options.cardId ?? "unknown-card",
    month:
      options.month ??
      prepared.primaryMonth ??
      Array.from(commitMonths)[0] ??
      payload.transactions[0]?.transaction_date.slice(0, 7) ??
      "unknown",
    statement_month: payload.metadata?.statement_month,
    imported_at: new Date().toISOString(),
    status: "completed",
    summary: payload.summary,
    fingerprint: options.fingerprint,
  });
}

/**
 * Approve and commit a pending run
 */
export async function approvePendingRun(
  userId: string,
  runId: string,
  overrides?: {
    month?: string;
    ownerId?: string;
    cardId?: string;
    statementFile?: string;
  },
) {
  const record = await loadStoredPendingExtraction(userId, runId);
  if (!record) {
    throw new Error(`Pending run ${runId} not found`);
  }

  const baseOptions = record.options ?? {
    statementFile:
      record.extraction.transactions[0]?.statement_ref ?? `pending-${runId}`,
  };

  const finalOptions: CommitExtractionOptions = {
    ...baseOptions,
    ...overrides,
    statementFile:
      overrides?.statementFile ??
      baseOptions.statementFile ??
      record.extraction.transactions[0]?.statement_ref ??
      `pending-${runId}`,
  };

  const prepared = await getPreparedExtraction(userId, runId, record);
  await commitExtraction(userId, record.extraction, finalOptions, prepared);

  // Delete pending extraction
  await deletePendingExtraction(userId, runId);

  return {
    run_id: runId,
    summary: record.extraction.summary,
    month: inferMonthFromExtraction(record.extraction, finalOptions.month),
  };
}
