/**
 * Data Store - Abstraction layer for data persistence
 *
 * This module provides a consistent API for data operations.
 * It now uses Turso (libSQL) with Drizzle ORM for persistence.
 *
 * All functions maintain backward compatibility with the original JSON-based API.
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

export async function getCards(): Promise<Card[]> {
  return cardsRepo.getCards();
}

// ============================================================================
// Owners
// ============================================================================

export async function getOwners(): Promise<Owner[]> {
  return ownersRepo.getOwners();
}

// ============================================================================
// Categories
// ============================================================================

export async function getCategories(): Promise<Category[]> {
  return categoriesRepo.getCategories();
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await categoriesRepo.saveCategories(categories);
}

export async function upsertCategory(category: Category): Promise<Category> {
  return categoriesRepo.upsertCategory(category);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await categoriesRepo.deleteCategory(categoryId);
}

// ============================================================================
// Transactions
// ============================================================================

export async function listTransactionMonths(): Promise<string[]> {
  return transactionsRepo.listTransactionMonths();
}

export async function loadTransactionFile(month: string): Promise<TransactionFile | null> {
  return transactionsRepo.loadTransactionFile(month);
}

export async function loadAllTransactions(): Promise<TransactionRecord[]> {
  return transactionsRepo.loadAllTransactions();
}

export async function saveTransactionFile(month: string, data: TransactionFile): Promise<void> {
  await transactionsRepo.saveTransactionFile(month, data);
}

export async function createOrUpdateTransaction(
  month: string,
  transaction: TransactionRecord,
): Promise<TransactionRecord> {
  return transactionsRepo.createOrUpdateTransaction(month, transaction);
}

export async function deleteTransaction(month: string, transactionId: string): Promise<void> {
  await transactionsRepo.deleteTransaction(month, transactionId);
}

// ============================================================================
// Import Runs
// ============================================================================

export async function getImportHistory(): Promise<ImportRun[]> {
  return importRunsRepo.getImportHistory();
}

export async function appendImportHistory(entry: ImportRun): Promise<void> {
  await importRunsRepo.appendImportHistory(entry);
}

export async function savePendingExtraction(runId: string, payload: unknown): Promise<void> {
  await importRunsRepo.savePendingExtraction(runId, payload);
}

export async function loadPendingExtraction(runId: string): Promise<unknown | null> {
  return importRunsRepo.loadPendingExtraction(runId);
}

export async function deletePendingExtraction(runId: string): Promise<void> {
  await importRunsRepo.deletePendingExtraction(runId);
}

export async function listPendingRunIds(): Promise<string[]> {
  return importRunsRepo.listPendingRunIds();
}

export async function loadPendingExtractionWithMeta(
  runId: string,
): Promise<{ data: unknown; savedAt: string } | null> {
  return importRunsRepo.loadPendingExtractionWithMeta(runId);
}
