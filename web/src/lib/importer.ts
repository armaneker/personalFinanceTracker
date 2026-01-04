import {
  appendImportHistory,
  createOrUpdateTransaction,
  deletePendingExtraction,
  listPendingRunIds,
  loadPendingExtractionWithMeta,
  savePendingExtraction,
  getCategories,
  saveCategories,
  getImportHistory,
} from "./data-store";
import { generateTransactionId } from "./ids";
import {
  StatementExtraction,
  TransactionRecord,
  ImportRunSummary,
} from "./types";
import { statementExtractionSchema, StatementExtractionInput } from "./schemas";
import { slugifyId } from "./utils";
import { convertAmount, type FxConversionResult } from "./fx-service";

const DEFAULT_CATEGORY = "cat-other";

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

export interface ExistingImportMatch {
  type: "history" | "pending";
  run_id: string;
  month?: string;
}

export interface CommitExtractionOptions {
  month?: string;
  cardId?: string;
  ownerId?: string;
  autoCommit?: boolean;
  statementFile: string;
  fingerprint?: string;
}

interface PreparedRecord {
  month: string;
  record: TransactionRecord;
}

interface PreparedExtraction {
  records: PreparedRecord[];
  extraction: StatementExtractionInput;
  months: string[];
  primaryMonth?: string;
}

function sanitizeExtraction(
  payload: StatementExtractionInput,
): StatementExtractionInput {
  const spendTransactions = payload.transactions.filter((tx) => tx.amount < 0);
  const filteredCount = payload.transactions.length - spendTransactions.length;

  const totalSpend = spendTransactions.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  const warnings = [...(payload.warnings?.filter(Boolean) ?? [])];
  if (filteredCount > 0) {
    warnings.push(`Filtered ${filteredCount} non-spending transactions (amount >= 0).`);
  }

  return {
    ...payload,
    transactions: spendTransactions,
    summary: {
      transactions: spendTransactions.length,
      total_spend: Number(totalSpend.toFixed(2)),
      currency: payload.summary.currency,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function validateExtraction(payload: StatementExtraction): StatementExtractionInput {
  const parsed = statementExtractionSchema.parse(payload);
  return sanitizeExtraction(parsed);
}

export async function findExistingImportByFingerprint(
  fingerprint: string,
  cardId?: string,
): Promise<ExistingImportMatch | null> {
  if (!fingerprint) return null;

  const history = await getImportHistory();
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

  const pendingIds = await listPendingRunIds();
  for (const runId of pendingIds) {
    const meta = await loadPendingExtractionWithMeta(runId);
    if (!meta) continue;
    const record = await normalizePendingExtractionRecord(runId, meta.data, meta.savedAt);
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

function inferMonthFromExtraction(payload: StatementExtractionInput, explicitMonth?: string) {
  if (explicitMonth) {
    return explicitMonth;
  }
  const sample = payload.transactions[0];
  if (!sample) {
    throw new Error("Extraction returned no transactions; provide month explicitly.");
  }
  return sample.transaction_date.slice(0, 7);
}

/**
 * Convert amount to TRY using the FX service with caching and fallback
 */
async function convertAmountToTry(
  amount: number,
  currency: string | undefined,
  transactionDate: string,
): Promise<{ amount: number; currency: string; originalCurrency: string; fxRate: number }> {
  const code = currency?.toUpperCase() ?? "TRY";
  if (code === "TRY") {
    return { amount, currency: "TRY", originalCurrency: code, fxRate: 1 };
  }

  const targetDate = transactionDate || new Date().toISOString().slice(0, 10);

  const result: FxConversionResult = await convertAmount(amount, code, "TRY", targetDate);

  return {
    amount: result.amount,
    currency: result.currency,
    originalCurrency: result.originalCurrency,
    fxRate: result.fxRate,
  };
}

async function buildTransactionRecord(
  extractionTx: StatementExtractionInput["transactions"][number],
  runId: string,
  statementFile: string,
  overrides: { month: string; cardId?: string; ownerId?: string },
): Promise<PreparedRecord> {
  const timestamp = new Date().toISOString();
  const categoryId = extractionTx.category_id ?? extractionTx.llm_category_id ?? DEFAULT_CATEGORY;

  const conversion = await convertAmountToTry(
    extractionTx.amount,
    extractionTx.currency,
    extractionTx.transaction_date,
  );

  const record: TransactionRecord = {
    id: extractionTx.id || generateTransactionId(overrides.month),
    card_id: extractionTx.card_id || overrides.cardId || "unknown-card",
    statement_ref: statementFile,
    owner_id: extractionTx.owner_id || overrides.ownerId || "owner-arman",
    llm_category_id: extractionTx.llm_category_id ?? categoryId,
    category_id: categoryId,
    amount: conversion.amount,
    currency: conversion.currency,
    original_amount: extractionTx.amount,
    original_currency: conversion.originalCurrency,
    fx_rate: conversion.fxRate,
    transaction_date: extractionTx.transaction_date,
    post_date: extractionTx.post_date ?? undefined,
    merchant: extractionTx.merchant,
    description: extractionTx.description ?? undefined,
    notes: extractionTx.notes ?? undefined,
    source_llm: {
      run_id: runId,
      model: "unknown",
    },
    created_at: timestamp,
    updated_at: timestamp,
    flags: {
      review: false,
      duplicate: false,
    },
  };

  const commitMonth =
    extractionTx.transaction_date?.slice(0, 7) || overrides.month;

  return {
    month: commitMonth ?? overrides.month,
    record,
  };
}

async function prepareExtraction(
  payload: StatementExtractionInput,
  options: CommitExtractionOptions,
): Promise<PreparedExtraction> {
  const fallbackMonth = inferMonthFromExtraction(payload, options.month);
  const preparedRecords = await Promise.all(
    payload.transactions.map((tx) =>
      buildTransactionRecord(tx, payload.run_id, options.statementFile, {
        month: fallbackMonth,
        cardId: options.cardId,
        ownerId: options.ownerId,
      }),
    ),
  );

  const totalSpent = preparedRecords.reduce(
    (acc, item) => (item.record.amount < 0 ? acc + Math.abs(item.record.amount) : acc),
    0,
  );
  payload.summary = {
    transactions: preparedRecords.length,
    total_spend: Number(totalSpent.toFixed(2)),
    currency: "TRY",
  };

  const months = Array.from(
    new Set(
      preparedRecords
        .map((item) => item.month)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  return {
    records: preparedRecords,
    extraction: payload,
    months,
    primaryMonth: months[0] ?? fallbackMonth,
  };
}

async function getPreparedExtraction(
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

  const prepared = await prepareExtraction(record.extraction, record.options);
  record.prepared_records = prepared.records;
  record.months = prepared.months;
  await savePendingExtraction(runId, record);
  return prepared;
}

async function ensureCategories(extraction: StatementExtractionInput) {
  const categories = await getCategories();
  const map = new Map(categories.map((cat) => [cat.id, cat]));
  let changed = false;

  const palette = ["#3b82f6", "#22c55e", "#ef4444", "#eab308", "#a855f7", "#14b8a6", "#f97316"];
  let paletteIndex = categories.length;

  const addCategory = (id: string, name: string, color?: string) => {
    if (map.has(id)) return;
    const assignedColor = color ?? palette[paletteIndex % palette.length];
    paletteIndex += 1;
    const category = { id, name, color: assignedColor };
    map.set(id, category);
    categories.push(category);
    changed = true;
  };

  extraction.new_categories?.forEach((cat) => {
    const id = cat.id || slugifyId(cat.name, "cat");
    addCategory(id, cat.name, cat.color);
  });

  extraction.transactions.forEach((tx) => {
    const targetId = tx.category_id ?? tx.llm_category_id;
    if (!targetId) {
      return;
    }
    if (!map.has(targetId)) {
      addCategory(targetId, targetId.replace(/^cat-/, "").replace(/-/g, " ") || targetId);
    }
  });

  if (changed) {
    await saveCategories(categories);
  }
}

export async function persistExtractionToPending(
  runId: string,
  payload: StatementExtractionInput,
  options: CommitExtractionOptions,
): Promise<PreparedExtraction> {
  const prepared = await prepareExtraction(payload, options);
  const record: StoredPendingExtraction = {
    version: 1,
    saved_at: new Date().toISOString(),
    extraction: prepared.extraction,
    options,
    prepared_records: prepared.records,
    months: prepared.months,
  };
  await savePendingExtraction(runId, record);
  return prepared;
}

export async function commitExtraction(
  payload: StatementExtractionInput,
  options: CommitExtractionOptions,
  precomputed?: PreparedExtraction,
) {
  await ensureCategories(payload);
  const prepared = precomputed ?? (await prepareExtraction(payload, options));

  const commitMonths = new Set<string>();
  for (const item of prepared.records) {
    commitMonths.add(item.month);
    // ensure the run id + model propagate
    item.record.source_llm = {
      run_id: payload.run_id,
      model: payload.model,
      ...item.record.source_llm,
    };
    await createOrUpdateTransaction(item.month, item.record);
  }

  await appendImportHistory({
    run_id: payload.run_id,
    statement_file: options.statementFile,
    card_id: options.cardId ?? "unknown-card",
    month:
      options.month ??
      prepared.primaryMonth ??
      Array.from(commitMonths)[0] ??
      payload.transactions[0]?.transaction_date.slice(0, 7) ??
      "unknown",
    imported_at: new Date().toISOString(),
    status: "completed",
    summary: payload.summary,
    fingerprint: options.fingerprint,
  });
}

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

async function normalizePendingExtractionRecord(
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
        await savePendingExtraction(runId, normalized);
      }
    } else if (!raw.saved_at && !normalized.prepared_records) {
      await savePendingExtraction(runId, normalized);
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
    await savePendingExtraction(runId, normalized);
    return normalized;
  } catch {
    return null;
  }
}

async function loadStoredPendingExtraction(runId: string): Promise<StoredPendingExtraction | null> {
  const meta = await loadPendingExtractionWithMeta(runId);
  if (!meta) {
    return null;
  }
  return normalizePendingExtractionRecord(runId, meta.data, meta.savedAt);
}

export async function listPendingRunSummaries(): Promise<PendingRunSummary[]> {
  const ids = await listPendingRunIds();
  const summaries: PendingRunSummary[] = [];

  for (const runId of ids) {
    const meta = await loadPendingExtractionWithMeta(runId);
    if (!meta) continue;
    const record = await normalizePendingExtractionRecord(runId, meta.data, meta.savedAt);
    if (!record) continue;
    const { extraction, options } = record;
    const prepared = await getPreparedExtraction(runId, record);
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

export interface ApprovePendingOverrides {
  month?: string;
  ownerId?: string;
  cardId?: string;
  statementFile?: string;
}

export async function approvePendingRun(
  runId: string,
  overrides?: ApprovePendingOverrides,
) {
  const record = await loadStoredPendingExtraction(runId);
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

  const prepared = await getPreparedExtraction(runId, record);
  await commitExtraction(record.extraction, finalOptions, prepared);
  await deletePendingExtraction(runId);

  return {
    run_id: runId,
    summary: record.extraction.summary,
    month: inferMonthFromExtraction(record.extraction, finalOptions.month),
  };
}

export async function discardPendingRun(runId: string) {
  const record = await loadStoredPendingExtraction(runId);
  if (!record) {
    throw new Error(`Pending run ${runId} not found`);
  }
  await deletePendingExtraction(runId);
  return {
    run_id: runId,
    summary: record.extraction.summary,
  };
}

export interface PendingRunDetail {
  summary: PendingRunSummary;
  transactions: TransactionRecord[];
  statement_notes?: string | null;
}

export async function getPendingRunDetail(runId: string): Promise<PendingRunDetail> {
  const record = await loadStoredPendingExtraction(runId);
  if (!record) {
    throw new Error(`Pending run ${runId} not found`);
  }

  const summaries = await listPendingRunSummaries();
  const summary = summaries.find((run) => run.run_id === runId);
  if (!summary) {
    throw new Error(`Unable to load summary for ${runId}`);
  }

  const prepared = await getPreparedExtraction(runId, record);

  return {
    summary,
    transactions: prepared.records.map((item) => item.record),
    statement_notes: record.extraction.statement_notes ?? null,
  };
}
