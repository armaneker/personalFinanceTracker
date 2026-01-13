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
  getCards,
  getOwners,
} from "./data-store";
import { upsertCard } from "@/db/repositories/cards";
import { upsertOwner } from "@/db/repositories/owners";
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
 * Ensure that the card exists for the user.
 * If the card doesn't exist, create it with default values.
 * This is necessary to satisfy foreign key constraints.
 */
async function ensureCardExists(userId: string, cardId: string): Promise<void> {
  console.log(`[ensureCardExists] Checking card ${cardId} for user ${userId}`);
  const cards = await getCards(userId);
  const cardExists = cards.some(card => card.id === cardId);
  console.log(`[ensureCardExists] Card exists: ${cardExists}, existing cards: ${cards.map(c => c.id).join(', ')}`);

  if (!cardExists) {
    // Auto-create the card with default values
    // Try to parse card info from the ID (format: card-issuer-last4)
    const parts = cardId.split('-');
    let issuer = 'Unknown';
    let last4 = '0000';

    if (parts.length >= 3) {
      // e.g., card-visa-1234 -> issuer: visa, last4: 1234
      issuer = parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1) || 'Unknown';
      last4 = parts[parts.length - 1] || '0000';
    }

    console.log(`[ensureCardExists] Creating card ${cardId} with issuer=${issuer}, last4=${last4}`);
    await upsertCard(userId, {
      id: cardId,
      name: cardId === 'unknown-card' ? 'Unknown Card' : `${issuer} ${last4}`,
      issuer,
      last4,
      currency: 'TRY',
    });
    console.log(`[ensureCardExists] Card ${cardId} created successfully`);
  }
}

/**
 * Ensure that the owner exists for the user.
 * If the owner doesn't exist, create it with default values.
 * This is necessary to satisfy foreign key constraints.
 */
async function ensureOwnerExists(userId: string, ownerId: string): Promise<void> {
  const ownerList = await getOwners(userId);
  const ownerExists = ownerList.some(owner => owner.id === ownerId);

  if (!ownerExists) {
    // Auto-create the owner with default values
    // Try to parse owner label from the ID (format: owner-name)
    const parts = ownerId.split('-');
    let label = 'Unknown';

    if (parts.length >= 2) {
      // e.g., owner-arman -> label: Arman
      label = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }

    await upsertOwner(userId, {
      id: ownerId,
      label,
    });
  }
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

  // Ensure all cards and owners exist (auto-create if needed)
  // Collect all unique card and owner IDs from transactions
  const uniqueCardIds = new Set<string>();
  const uniqueOwnerIds = new Set<string>();
  for (const item of prepared.records) {
    if (item.record.card_id) {
      uniqueCardIds.add(item.record.card_id);
    }
    if (item.record.owner_id) {
      uniqueOwnerIds.add(item.record.owner_id);
    }
  }
  // Also add the import-level card ID (this is what gets stored in import_runs)
  const importCardId = options.cardId ?? "unknown-card";
  uniqueCardIds.add(importCardId);
  console.log(`[commitExtraction] User: ${userId}, Cards to ensure: ${Array.from(uniqueCardIds).join(', ')}, Owners to ensure: ${Array.from(uniqueOwnerIds).join(', ')}`);

  // Ensure each card exists
  for (const cid of uniqueCardIds) {
    await ensureCardExists(userId, cid);
  }

  // Ensure each owner exists
  for (const oid of uniqueOwnerIds) {
    await ensureOwnerExists(userId, oid);
  }
  console.log(`[commitExtraction] All cards and owners ensured, proceeding with commit`)

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
