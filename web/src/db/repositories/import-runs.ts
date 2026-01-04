import { eq, desc } from "drizzle-orm";

import { db } from "../index";
import { importRuns, pendingExtractions } from "../schema";
import type { ImportRun as ImportRunEntity } from "../schema";
import type { ImportRun } from "@/lib/types";

// Default user ID for single-user mode (will be replaced with actual auth)
const DEFAULT_USER_ID = "default-user";

/**
 * Convert database entity to API type
 */
function toApiType(entity: ImportRunEntity): ImportRun {
  return {
    run_id: entity.runId,
    statement_file: entity.statementFile,
    card_id: entity.cardId,
    month: entity.month,
    imported_at: entity.importedAt,
    status: entity.status,
    summary:
      entity.summaryTransactions !== null
        ? {
            transactions: entity.summaryTransactions,
            total_spend: entity.summaryTotalSpend ?? 0,
            currency: entity.summaryCurrency ?? "TRY",
          }
        : undefined,
    error: entity.error ?? undefined,
    fingerprint: entity.fingerprint ?? undefined,
  };
}

/**
 * Get import history for the current user
 */
export async function getImportHistory(userId: string = DEFAULT_USER_ID): Promise<ImportRun[]> {
  const result = await db
    .select()
    .from(importRuns)
    .where(eq(importRuns.userId, userId))
    .orderBy(desc(importRuns.importedAt));

  return result.map(toApiType);
}

/**
 * Append a new import run to history
 */
export async function appendImportHistory(
  entry: ImportRun,
  userId: string = DEFAULT_USER_ID,
): Promise<void> {
  await db.insert(importRuns).values({
    runId: entry.run_id,
    userId,
    statementFile: entry.statement_file,
    cardId: entry.card_id,
    month: entry.month,
    importedAt: entry.imported_at,
    status: entry.status,
    summaryTransactions: entry.summary?.transactions ?? null,
    summaryTotalSpend: entry.summary?.total_spend ?? null,
    summaryCurrency: entry.summary?.currency ?? null,
    error: entry.error ?? null,
    fingerprint: entry.fingerprint ?? null,
  });
}

/**
 * Update an import run status
 */
export async function updateImportRun(
  runId: string,
  updates: Partial<ImportRun>,
  _userId: string = DEFAULT_USER_ID,
): Promise<void> {
  // TODO: Add user ownership check when multi-tenancy is enabled
  await db
    .update(importRuns)
    .set({
      status: updates.status,
      summaryTransactions: updates.summary?.transactions,
      summaryTotalSpend: updates.summary?.total_spend,
      summaryCurrency: updates.summary?.currency,
      error: updates.error,
      fingerprint: updates.fingerprint,
    })
    .where(eq(importRuns.runId, runId));
}

/**
 * Save a pending extraction
 */
export async function savePendingExtraction(
  runId: string,
  payload: unknown,
  userId: string = DEFAULT_USER_ID,
): Promise<void> {
  const now = new Date().toISOString();

  // Check if exists
  const existing = await db
    .select()
    .from(pendingExtractions)
    .where(eq(pendingExtractions.runId, runId))
    .limit(1);

  if (existing.length > 0) {
    // Update
    await db
      .update(pendingExtractions)
      .set({
        payload: JSON.stringify(payload),
        savedAt: now,
      })
      .where(eq(pendingExtractions.runId, runId));
  } else {
    // Insert
    await db.insert(pendingExtractions).values({
      runId,
      userId,
      payload: JSON.stringify(payload),
      savedAt: now,
    });
  }
}

/**
 * Load a pending extraction
 */
export async function loadPendingExtraction(
  runId: string,
  userId: string = DEFAULT_USER_ID,
): Promise<unknown | null> {
  const result = await db
    .select()
    .from(pendingExtractions)
    .where(eq(pendingExtractions.runId, runId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  // Verify user ownership
  if (result[0].userId !== userId) {
    return null;
  }

  return JSON.parse(result[0].payload);
}

/**
 * Delete a pending extraction
 */
export async function deletePendingExtraction(
  runId: string,
  _userId: string = DEFAULT_USER_ID,
): Promise<void> {
  // TODO: Add user ownership check when multi-tenancy is enabled
  await db.delete(pendingExtractions).where(eq(pendingExtractions.runId, runId));
}

/**
 * List all pending run IDs for the current user
 */
export async function listPendingRunIds(userId: string = DEFAULT_USER_ID): Promise<string[]> {
  const result = await db
    .select({ runId: pendingExtractions.runId })
    .from(pendingExtractions)
    .where(eq(pendingExtractions.userId, userId))
    .orderBy(desc(pendingExtractions.savedAt));

  return result.map((row) => row.runId);
}

/**
 * Load a pending extraction with metadata
 */
export async function loadPendingExtractionWithMeta(
  runId: string,
  userId: string = DEFAULT_USER_ID,
): Promise<{ data: unknown; savedAt: string } | null> {
  const result = await db
    .select()
    .from(pendingExtractions)
    .where(eq(pendingExtractions.runId, runId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  // Verify user ownership
  if (result[0].userId !== userId) {
    return null;
  }

  return {
    data: JSON.parse(result[0].payload),
    savedAt: result[0].savedAt,
  };
}
