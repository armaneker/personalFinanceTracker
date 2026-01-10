import { eq, desc, and, like } from "drizzle-orm";

import { db } from "../index";
import { transactions } from "../schema";
import type { Transaction as TransactionEntity } from "../schema";
import type { TransactionRecord, TransactionFile, TransactionFileMeta } from "@/lib/types";

/**
 * Convert database entity to API type
 */
function toApiType(entity: TransactionEntity): TransactionRecord {
  return {
    id: entity.id,
    card_id: entity.cardId,
    statement_ref: entity.statementRef,
    owner_id: entity.ownerId,
    llm_category_id: entity.llmCategoryId ?? undefined,
    category_id: entity.categoryId,
    amount: entity.amount,
    currency: entity.currency,
    original_amount: entity.originalAmount ?? undefined,
    original_currency: entity.originalCurrency ?? undefined,
    fx_rate: entity.fxRate ?? undefined,
    transaction_date: entity.transactionDate,
    post_date: entity.postDate ?? undefined,
    merchant: entity.merchant,
    description: entity.description ?? undefined,
    notes: entity.notes ?? undefined,
    source_llm: entity.sourceLlmRunId
      ? {
          run_id: entity.sourceLlmRunId,
          model: entity.sourceLlmModel ?? "",
          confidence: entity.sourceLlmConfidence ?? undefined,
          raw_response_path: entity.sourceLlmRawResponsePath ?? undefined,
        }
      : undefined,
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
    flags: {
      review: entity.flagReview,
      duplicate: entity.flagDuplicate,
    },
  };
}

/**
 * Convert API type to database entity values
 */
function toDbValues(transaction: TransactionRecord, userId: string) {
  return {
    id: transaction.id,
    userId,
    cardId: transaction.card_id,
    statementRef: transaction.statement_ref,
    ownerId: transaction.owner_id,
    llmCategoryId: transaction.llm_category_id ?? null,
    categoryId: transaction.category_id,
    amount: transaction.amount,
    currency: transaction.currency,
    originalAmount: transaction.original_amount ?? null,
    originalCurrency: transaction.original_currency ?? null,
    fxRate: transaction.fx_rate ?? null,
    transactionDate: transaction.transaction_date,
    postDate: transaction.post_date ?? null,
    merchant: transaction.merchant,
    description: transaction.description ?? null,
    notes: transaction.notes ?? null,
    sourceLlmRunId: transaction.source_llm?.run_id ?? null,
    sourceLlmModel: transaction.source_llm?.model ?? null,
    sourceLlmConfidence: transaction.source_llm?.confidence ?? null,
    sourceLlmRawResponsePath: transaction.source_llm?.raw_response_path ?? null,
    flagReview: transaction.flags.review,
    flagDuplicate: transaction.flags.duplicate,
    createdAt: transaction.created_at,
    updatedAt: transaction.updated_at,
  };
}

/**
 * Extract month (YYYY-MM) from transaction date
 */
function getMonth(transactionDate: string): string {
  return transactionDate.substring(0, 7);
}

/**
 * List all transaction months for a user
 */
export async function listTransactionMonths(userId: string): Promise<string[]> {
  const result = await db
    .selectDistinct({ month: transactions.transactionDate })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  // Extract unique months and sort descending
  const months = new Set<string>();
  for (const row of result) {
    months.add(getMonth(row.month));
  }

  return Array.from(months).sort().reverse();
}

/**
 * Load all transactions for a specific month
 */
export async function loadTransactionFile(
  userId: string,
  month: string,
): Promise<TransactionFile | null> {
  const result = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), like(transactions.transactionDate, `${month}%`)),
    )
    .orderBy(desc(transactions.transactionDate));

  if (result.length === 0) {
    return null;
  }

  const transactionRecords = result.map(toApiType);

  const meta: TransactionFileMeta = {
    month,
    currency: transactionRecords[0]?.currency ?? "TRY",
    generated_at: new Date().toISOString(),
  };

  return {
    meta,
    transactions: transactionRecords,
  };
}

/**
 * Load all transactions for a user
 */
export async function loadAllTransactions(
  userId: string,
): Promise<TransactionRecord[]> {
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.transactionDate));

  return result.map(toApiType);
}

/**
 * Save a transaction file (upsert all transactions for the month)
 */
export async function saveTransactionFile(
  userId: string,
  month: string,
  data: TransactionFile,
): Promise<void> {
  // Delete existing transactions for this month
  await db
    .delete(transactions)
    .where(
      and(eq(transactions.userId, userId), like(transactions.transactionDate, `${month}%`)),
    );

  // Insert all transactions
  if (data.transactions.length > 0) {
    await db.insert(transactions).values(data.transactions.map((t) => toDbValues(t, userId)));
  }
}

/**
 * Create or update a single transaction
 */
export async function createOrUpdateTransaction(
  userId: string,
  month: string,
  transaction: TransactionRecord,
): Promise<TransactionRecord> {
  const existing = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transaction.id), eq(transactions.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Update - omit id and userId from the update values
    const dbValues = toDbValues(transaction, userId);
    const { id: _id, userId: _uid, ...updateValues } = dbValues;
    await db
      .update(transactions)
      .set(updateValues)
      .where(and(eq(transactions.id, transaction.id), eq(transactions.userId, userId)));
  } else {
    // Insert
    await db.insert(transactions).values(toDbValues(transaction, userId));
  }

  return transaction;
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(
  userId: string,
  month: string,
  transactionId: string,
): Promise<void> {
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(
  userId: string,
  transactionId: string,
): Promise<TransactionRecord | null> {
  const result = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return toApiType(result[0]);
}

/**
 * Delete transactions by statement reference
 */
export async function deleteTransactionsByStatementRef(
  userId: string,
  statementRef: string,
): Promise<number> {
  const result = await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.statementRef, statementRef)));

  return result.rowsAffected ?? 0;
}

/**
 * Count transactions by statement reference
 */
export async function countTransactionsByStatementRef(
  userId: string,
  statementRef: string,
): Promise<number> {
  const result = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.statementRef, statementRef)));

  return result.length;
}
