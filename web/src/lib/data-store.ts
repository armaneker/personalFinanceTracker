/**
 * Data Store - Abstraction layer for data persistence
 *
 * This module provides a consistent API for data operations.
 * It uses Turso (libSQL) with Drizzle ORM for persistence.
 *
 * All functions require a userId parameter for multi-user support.
 */

import {
  Card,
  Category,
  ImportRun,
  TransactionFile,
  TransactionRecord,
  Owner,
} from "./types";

import * as cardsRepo from "@/db/repositories/cards";
import * as categoriesRepo from "@/db/repositories/categories";
import * as ownersRepo from "@/db/repositories/owners";
import * as transactionsRepo from "@/db/repositories/transactions";
import * as importRunsRepo from "@/db/repositories/import-runs";

// ============================================================================
// Cards
// ============================================================================

export async function getCards(userId: string): Promise<Card[]> {
  return cardsRepo.getCards(userId);
}

// ============================================================================
// Owners
// ============================================================================

export async function getOwners(userId: string): Promise<Owner[]> {
  return ownersRepo.getOwners(userId);
}

// ============================================================================
// Categories
// ============================================================================

export async function getCategories(userId: string): Promise<Category[]> {
  return categoriesRepo.getCategories(userId);
}

export async function saveCategories(userId: string, categories: Category[]): Promise<void> {
  await categoriesRepo.saveCategories(userId, categories);
}

export async function upsertCategory(userId: string, category: Category): Promise<Category> {
  return categoriesRepo.upsertCategory(userId, category);
}

export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  await categoriesRepo.deleteCategory(userId, categoryId);
}

// ============================================================================
// Transactions
// ============================================================================

export async function listTransactionMonths(userId: string): Promise<string[]> {
  return transactionsRepo.listTransactionMonths(userId);
}

export async function loadTransactionFile(userId: string, month: string): Promise<TransactionFile | null> {
  return transactionsRepo.loadTransactionFile(userId, month);
}

export async function loadAllTransactions(userId: string): Promise<TransactionRecord[]> {
  return transactionsRepo.loadAllTransactions(userId);
}

export async function saveTransactionFile(userId: string, month: string, data: TransactionFile): Promise<void> {
  await transactionsRepo.saveTransactionFile(userId, month, data);
}

export async function createOrUpdateTransaction(
  userId: string,
  month: string,
  transaction: TransactionRecord,
): Promise<TransactionRecord> {
  return transactionsRepo.createOrUpdateTransaction(userId, month, transaction);
}

export async function deleteTransaction(userId: string, month: string, transactionId: string): Promise<void> {
  await transactionsRepo.deleteTransaction(userId, month, transactionId);
}

// ============================================================================
// Import Runs
// ============================================================================

export async function getImportHistory(userId: string): Promise<ImportRun[]> {
  return importRunsRepo.getImportHistory(userId);
}

export async function appendImportHistory(userId: string, entry: ImportRun): Promise<void> {
  await importRunsRepo.appendImportHistory(userId, entry);
}

export async function savePendingExtraction(userId: string, runId: string, payload: unknown): Promise<void> {
  await importRunsRepo.savePendingExtraction(userId, runId, payload);
}

export async function loadPendingExtraction(userId: string, runId: string): Promise<unknown | null> {
  return importRunsRepo.loadPendingExtraction(userId, runId);
}

export async function deletePendingExtraction(userId: string, runId: string): Promise<void> {
  await importRunsRepo.deletePendingExtraction(userId, runId);
}

export async function listPendingRunIds(userId: string): Promise<string[]> {
  return importRunsRepo.listPendingRunIds(userId);
}

export async function loadPendingExtractionWithMeta(
  userId: string,
  runId: string,
): Promise<{ data: unknown; savedAt: string } | null> {
  return importRunsRepo.loadPendingExtractionWithMeta(userId, runId);
}

export async function getImportRunById(userId: string, runId: string): Promise<ImportRun | null> {
  return importRunsRepo.getImportRunById(userId, runId);
}

export async function deleteImportRun(userId: string, runId: string): Promise<void> {
  await importRunsRepo.deleteImportRun(userId, runId);
}

export async function deleteTransactionsByStatementRef(userId: string, statementRef: string): Promise<number> {
  return transactionsRepo.deleteTransactionsByStatementRef(userId, statementRef);
}

export async function countTransactionsByStatementRef(userId: string, statementRef: string): Promise<number> {
  return transactionsRepo.countTransactionsByStatementRef(userId, statementRef);
}
