import {
  deletePendingExtraction,
  listPendingRunIds,
  loadPendingExtractionWithMeta,
  savePendingExtraction,
} from "./data-store";

/**
 * All pending extraction functions require a userId parameter for multi-user support.
 */
import { TransactionRecord, ImportRunSummary } from "./types";
import { statementExtractionSchema, StatementExtractionInput } from "./schemas";
import { sanitizeExtraction } from "./validation";
import {
  prepareExtraction,
  inferMonthFromExtraction,
  type PreparedRecord,
  type PreparedExtraction,
  type CommitExtractionOptions,
} from "./transaction-builder";

export interface StoredPendingExtraction {
  version: 1;
  saved_at: string;
  extraction: StatementExtractionInput;
  options: CommitExtractionOptions;
  prepared_records?: PreparedRecord[];
  months?: string[];
}

export interface PendingRunSummary {
  run_id: string;
  statement_file: string;
  saved_at: string;
  summary: ImportRunSummary;
  month?: string;
  card_id?: string;
  owner_id?: string;
  warnings: string[];
  total_transactions: number;
  sample_count: number;
  sample_transactions: Array<{
    id: string;
    transaction_date: string;
    merchant: string;
    amount: number;
    card_id: string;
  }>;
  months: string[];
}

export interface PendingRunDetail {
  summary: PendingRunSummary;
  transactions: TransactionRecord[];
  statement_notes?: string | null;
}

export interface ApprovePendingOverrides {
  month?: string;
  ownerId?: string;
  cardId?: string;
  statementFile?: string;
}

/**
 * Get prepared extraction from stored record, computing if needed
 */
export async function getPreparedExtraction(
  userId: string,
  runId: string,
  record: StoredPendingExtraction,
): Promise<PreparedExtraction> {
  if (record.prepared_records && record.prepared_records.length > 0) {
    let preparedRecords: PreparedRecord[];
    const first = record.prepared_records[0] as PreparedRecord | TransactionRecord;
    if (first && typeof first === "object" && "record" in first && "month" in first) {
      preparedRecords = record.prepared_records as PreparedRecord[];
    } else {
      const fallbackMonth = inferMonthFromExtraction(record.extraction, record.options.month);
      preparedRecords = (record.prepared_records as unknown as TransactionRecord[]).map((tx) => ({
        record: tx,
        month: tx.transaction_date?.slice(0, 7) ?? fallbackMonth,
      }));
      record.prepared_records = preparedRecords;
    }

    const months =
      record.months && record.months.length > 0
        ? record.months
        : Array.from(
            new Set(
              preparedRecords
                .map((item) => item.month)
                .filter((value): value is string => typeof value === "string" && value.length > 0),
            ),
          );
    record.months = months;

    const totalSpent = preparedRecords.reduce(
      (acc, item) => (item.record.amount < 0 ? acc + Math.abs(item.record.amount) : acc),
      0,
    );
    record.extraction.summary = {
      transactions: preparedRecords.length,
      total_spend: Number(totalSpent.toFixed(2)),
      currency: "TRY",
    };

    return {
      records: preparedRecords,
      extraction: record.extraction,
      months,
      primaryMonth: months[0] ?? record.options.month,
    };
  }

  const prepared = await prepareExtraction(record.extraction, record.options, userId);
  record.prepared_records = prepared.records;
  record.months = prepared.months;
  await savePendingExtraction(userId, runId, record);
  return prepared;
}

/**
 * Type guard for StoredPendingExtraction
 */
function isStoredPendingExtraction(data: unknown): data is StoredPendingExtraction {
  if (!data || typeof data !== "object") {
    return false;
  }
  const candidate = data as Partial<StoredPendingExtraction> & { version?: unknown };
  return (
    candidate.version === 1 &&
    typeof candidate.extraction === "object" &&
    typeof candidate.options === "object"
  );
}

/**
 * Normalize and migrate pending extraction record to current format
 */
export async function normalizePendingExtractionRecord(
  userId: string,
  runId: string,
  raw: unknown,
  savedAt: string,
): Promise<StoredPendingExtraction | null> {
  if (isStoredPendingExtraction(raw)) {
    const normalized: StoredPendingExtraction = {
      version: 1,
      saved_at: raw.saved_at ?? savedAt,
      extraction: raw.extraction,
      options: raw.options,
      prepared_records: raw.prepared_records,
    };
    const detectedMonth =
      raw.extraction.transactions[0]?.transaction_date?.slice(0, 7) ?? raw.options.month;
    if (detectedMonth && !normalized.options?.month) {
      normalized.options = {
        ...normalized.options,
        month: detectedMonth,
      };
      if (!normalized.prepared_records) {
        await savePendingExtraction(userId, runId, normalized);
      }
    } else if (!raw.saved_at && !normalized.prepared_records) {
      await savePendingExtraction(userId, runId, normalized);
    }
    return normalized;
  }

  if (!raw || typeof raw !== "object") {
    return null;
  }

  try {
    const extraction = sanitizeExtraction(statementExtractionSchema.parse(raw));
    const firstTx = extraction.transactions[0];
    const normalized: StoredPendingExtraction = {
      version: 1,
      saved_at: savedAt,
      extraction,
      options: {
        statementFile: firstTx?.statement_ref ?? `pending-${runId}`,
        month: firstTx ? firstTx.transaction_date.slice(0, 7) : undefined,
        cardId: firstTx?.card_id,
        ownerId: firstTx?.owner_id ?? undefined,
      },
      prepared_records: undefined,
    };
    await savePendingExtraction(userId, runId, normalized);
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Load stored pending extraction by run ID
 */
export async function loadStoredPendingExtraction(
  userId: string,
  runId: string,
): Promise<StoredPendingExtraction | null> {
  const meta = await loadPendingExtractionWithMeta(userId, runId);
  if (!meta) {
    return null;
  }
  return normalizePendingExtractionRecord(userId, runId, meta.data, meta.savedAt);
}

/**
 * List all pending run summaries
 */
export async function listPendingRunSummaries(userId: string): Promise<PendingRunSummary[]> {
  const ids = await listPendingRunIds(userId);
  const summaries: PendingRunSummary[] = [];

  for (const runId of ids) {
    const meta = await loadPendingExtractionWithMeta(userId, runId);
    if (!meta) continue;
    const record = await normalizePendingExtractionRecord(userId, runId, meta.data, meta.savedAt);
    if (!record) continue;
    const { extraction, options } = record;
    const prepared = await getPreparedExtraction(userId, runId, record);
    const transactions = prepared.records;
    const sampleSize = Math.min(transactions.length, 5);
    const firstTx = transactions[0]?.record;
    summaries.push({
      run_id: runId,
      statement_file: options.statementFile ?? firstTx?.statement_ref ?? runId,
      saved_at: record.saved_at,
      summary: extraction.summary,
      month: options.month ?? prepared.primaryMonth ?? firstTx?.transaction_date?.slice(0, 7),
      card_id: options.cardId ?? firstTx?.card_id,
      owner_id: options.ownerId ?? firstTx?.owner_id ?? undefined,
      warnings: extraction.warnings?.filter(Boolean) ?? [],
      total_transactions: transactions.length,
      sample_count: sampleSize,
      sample_transactions: transactions.slice(0, sampleSize).map((item) => ({
        id: item.record.id,
        transaction_date: item.record.transaction_date,
        merchant: item.record.merchant,
        amount: item.record.amount,
        card_id: item.record.card_id,
      })),
      months: prepared.months,
    });
  }

  return summaries;
}

/**
 * Get detailed information about a pending run
 */
export async function getPendingRunDetail(userId: string, runId: string): Promise<PendingRunDetail> {
  const record = await loadStoredPendingExtraction(userId, runId);
  if (!record) {
    throw new Error(`Pending run ${runId} not found`);
  }

  const summaries = await listPendingRunSummaries(userId);
  const summary = summaries.find((run) => run.run_id === runId);
  if (!summary) {
    throw new Error(`Unable to load summary for ${runId}`);
  }

  const prepared = await getPreparedExtraction(userId, runId, record);

  return {
    summary,
    transactions: prepared.records.map((item) => item.record),
    statement_notes: record.extraction.statement_notes ?? null,
  };
}

/**
 * Discard a pending run
 */
export async function discardPendingRun(userId: string, runId: string) {
  const record = await loadStoredPendingExtraction(userId, runId);
  if (!record) {
    throw new Error(`Pending run ${runId} not found`);
  }
  await deletePendingExtraction(userId, runId);
  return {
    run_id: runId,
    summary: record.extraction.summary,
  };
}

/**
 * Persist extraction to pending storage
 */
export async function persistExtractionToPending(
  userId: string,
  runId: string,
  payload: StatementExtractionInput,
  options: CommitExtractionOptions,
): Promise<PreparedExtraction> {
  const prepared = await prepareExtraction(payload, options, userId);
  const record: StoredPendingExtraction = {
    version: 1,
    saved_at: new Date().toISOString(),
    extraction: prepared.extraction,
    options,
    prepared_records: prepared.records,
    months: prepared.months,
  };
  await savePendingExtraction(userId, runId, record);
  return prepared;
}
