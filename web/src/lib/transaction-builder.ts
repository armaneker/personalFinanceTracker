import { generateTransactionId } from "./ids";
import { TransactionRecord } from "./types";
import { StatementExtractionInput } from "./schemas";
import { convertAmount } from "./fx-service";

const DEFAULT_CATEGORY = "cat-other";

export interface PreparedRecord {
  month: string;
  record: TransactionRecord;
}

export interface PreparedExtraction {
  records: PreparedRecord[];
  extraction: StatementExtractionInput;
  months: string[];
  primaryMonth?: string;
}

export interface CommitExtractionOptions {
  month?: string;
  cardId?: string;
  ownerId?: string;
  autoCommit?: boolean;
  statementFile: string;
  fingerprint?: string;
}

/**
 * Infer month from extraction transactions or use explicit month
 */
export function inferMonthFromExtraction(
  payload: StatementExtractionInput,
  explicitMonth?: string,
): string {
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
 * Build a transaction record from extraction data with FX conversion
 */
export async function buildTransactionRecord(
  extractionTx: StatementExtractionInput["transactions"][number],
  runId: string,
  statementFile: string,
  overrides: { month: string; cardId?: string; ownerId?: string },
): Promise<PreparedRecord> {
  const timestamp = new Date().toISOString();
  const categoryId = extractionTx.category_id ?? extractionTx.llm_category_id ?? DEFAULT_CATEGORY;

  // Convert amount to TRY using FX service
  const code = extractionTx.currency?.toUpperCase() ?? "TRY";
  const conversion = code === "TRY"
    ? { amount: extractionTx.amount, currency: "TRY", originalCurrency: code, fxRate: 1, originalAmount: extractionTx.amount, source: "api" as const }
    : await convertAmount(extractionTx.amount, code, "TRY", extractionTx.transaction_date || new Date().toISOString().slice(0, 10));

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

  const commitMonth = extractionTx.transaction_date?.slice(0, 7) || overrides.month;

  return {
    month: commitMonth ?? overrides.month,
    record,
  };
}

/**
 * Prepare extraction by building transaction records and calculating summary
 */
export async function prepareExtraction(
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
