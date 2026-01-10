import { eq, desc, and } from "drizzle-orm";

import { db } from "../index";
import { importRuns, pendingExtractions } from "../schema";
import type { ImportRun as ImportRunEntity } from "../schema";
import type { ImportRun } from "@/lib/types";

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
 * Get import history for a user
 */
export async function getImportHistory(userId: string): Promise<ImportRun[]> {
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
  userId: string,
  entry: ImportRun,
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
  userId: string,
  runId: string,
  updates: Partial<ImportRun>,
): Promise<void> {
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
    .where(and(eq(importRuns.runId, runId), eq(importRuns.userId, userId)));
}

/**
 * Save a pending extraction
 */
export async function savePendingExtraction(
  userId: string,
  runId: string,
  payload: unknown,
): Promise<void> {
  const now = new Date().toISOString();

  // Check if exists for this user
  const existing = await db
    .select()
    .from(pendingExtractions)
    .where(and(eq(pendingExtractions.runId, runId), eq(pendingExtractions.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Update
    await db
      .update(pendingExtractions)
      .set({
        payload: JSON.stringify(payload),
        savedAt: now,
      })
      .where(and(eq(pendingExtractions.runId, runId), eq(pendingExtractions.userId, userId)));
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
  userId: string,
  runId: string,
): Promise<unknown | null> {
  const result = await db
    .select()
    .from(pendingExtractions)
    .where(and(eq(pendingExtractions.runId, runId), eq(pendingExtractions.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return JSON.parse(result[0].payload);
}

/**
 * Delete a pending extraction
 */
export async function deletePendingExtraction(
  userId: string,
  runId: string,
): Promise<void> {
  await db
    .delete(pendingExtractions)
    .where(and(eq(pendingExtractions.runId, runId), eq(pendingExtractions.userId, userId)));
}

/**
 * List all pending run IDs for a user
 */
export async function listPendingRunIds(userId: string): Promise<string[]> {
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
  userId: string,
  runId: string,
): Promise<{ data: unknown; savedAt: string } | null> {
  const result = await db
    .select()
    .from(pendingExtractions)
    .where(and(eq(pendingExtractions.runId, runId), eq(pendingExtractions.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    data: JSON.parse(result[0].payload),
    savedAt: result[0].savedAt,
  };
}
