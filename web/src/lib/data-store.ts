import { promises as fs } from "node:fs";
import path from "node:path";

import {
  Card,
  Category,
  ImportRun,
  TransactionFile,
  TransactionRecord,
  Owner,
} from "./types";

const DATA_ROOT = path.join(process.cwd(), "data");

async function readJsonFile<T>(relativePath: string, fallback: T): Promise<T> {
  const filePath = path.join(DATA_ROOT, relativePath);
  try {
    const file = await fs.readFile(filePath, "utf8");
    return JSON.parse(file) as T;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile<T>(relativePath: string, data: T) {
  const filePath = path.join(DATA_ROOT, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, `${serialized}\n`, "utf8");
}

export async function getCards(): Promise<Card[]> {
  return readJsonFile<Card[]>("cards.json", []);
}

export async function getOwners(): Promise<Owner[]> {
  return readJsonFile<Owner[]>("owners.json", []);
}

export async function getCategories(): Promise<Category[]> {
  return readJsonFile<Category[]>("categories.json", []);
}

export async function saveCategories(categories: Category[]) {
  await writeJsonFile("categories.json", categories);
}

export async function upsertCategory(category: Category) {
  const categories = await getCategories();
  const index = categories.findIndex((item) => item.id === category.id);
  if (index >= 0) {
    categories[index] = category;
  } else {
    categories.push(category);
  }
  await saveCategories(categories);
  return category;
}

export async function deleteCategory(categoryId: string) {
  const categories = await getCategories();
  const next = categories.filter((category) => category.id !== categoryId);
  if (next.length === categories.length) {
    throw new Error(`Category ${categoryId} not found`);
  }
  await saveCategories(next);
}

export async function listTransactionMonths(): Promise<string[]> {
  const dir = path.join(DATA_ROOT, "transactions");
  try {
    const files = await fs.readdir(dir);
    const months: string[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const month = file.replace(".json", "");
      const data = await loadTransactionFile(month);
      if (data?.transactions?.length) {
        months.push(month);
      }
    }
    return months.sort().reverse();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function loadTransactionFile(month: string): Promise<TransactionFile | null> {
  return readJsonFile<TransactionFile | null>(
    path.join("transactions", `${month}.json`),
    null,
  );
}

export async function loadAllTransactions(): Promise<TransactionRecord[]> {
  const months = await listTransactionMonths();
  const records: TransactionRecord[] = [];
  for (const month of months) {
    const file = await loadTransactionFile(month);
    if (file?.transactions) {
      records.push(...file.transactions);
    }
  }
  return records;
}

export async function saveTransactionFile(month: string, data: TransactionFile) {
  await writeJsonFile(path.join("transactions", `${month}.json`), data);
}

export async function createOrUpdateTransaction(
  month: string,
  transaction: TransactionRecord,
): Promise<TransactionRecord> {
  const file = (await loadTransactionFile(month)) ?? { meta: { month, currency: transaction.currency, generated_at: new Date().toISOString() }, transactions: [] };
  const idx = file.transactions.findIndex((existing) => existing.id === transaction.id);
  if (idx >= 0) {
    file.transactions[idx] = transaction;
  } else {
    file.transactions.push(transaction);
  }
  await saveTransactionFile(month, file);
  return transaction;
}

export async function deleteTransaction(month: string, transactionId: string): Promise<void> {
  const file = await loadTransactionFile(month);
  if (!file) {
    return;
  }
  const next = file.transactions.filter((record) => record.id !== transactionId);
  if (next.length === file.transactions.length) {
    return;
  }
  file.transactions = next;
  await saveTransactionFile(month, file);
}

export async function getImportHistory(): Promise<ImportRun[]> {
  return readJsonFile<ImportRun[]>("imports/history.json", []);
}

export async function appendImportHistory(entry: ImportRun) {
  const history = await getImportHistory();
  history.unshift(entry);
  await writeJsonFile("imports/history.json", history);
}

export async function savePendingExtraction(runId: string, payload: unknown) {
  await writeJsonFile(path.join("imports", "pending", `${runId}.json`), payload);
}

export async function loadPendingExtraction(runId: string): Promise<unknown | null> {
  return readJsonFile(path.join("imports", "pending", `${runId}.json`), null);
}

export async function deletePendingExtraction(runId: string) {
  const filePath = path.join(DATA_ROOT, "imports", "pending", `${runId}.json`);
  try {
    await fs.unlink(filePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function listPendingRunIds(): Promise<string[]> {
  const dir = path.join(DATA_ROOT, "imports", "pending");
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""))
      .sort((a, b) => (a > b ? -1 : 1));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function loadPendingExtractionWithMeta(
  runId: string,
): Promise<{ data: unknown; savedAt: string } | null> {
  const relativePath = path.join("imports", "pending", `${runId}.json`);
  const filePath = path.join(DATA_ROOT, relativePath);
  try {
    const [file, stats] = await Promise.all([
      fs.readFile(filePath, "utf8"),
      fs.stat(filePath),
    ]);
    return {
      data: JSON.parse(file),
      savedAt: stats.mtime.toISOString(),
    };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
