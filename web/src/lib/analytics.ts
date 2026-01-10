import {
  getCards,
  getCategories,
  getOwners,
  listTransactionMonths,
  loadTransactionFile,
  loadAllTransactions,
} from "./data-store";
import { Category, Owner, TransactionRecord } from "./types";

/**
 * All analytics functions require a userId parameter for multi-user support.
 */

export interface BreakdownRow<T> {
  key: string;
  label: string;
  entity?: T;
  total: number;
  net: number;
  count: number;
  percentage: number;
}

export interface DashboardSummary {
  month: string;
  currency: string;
  total_spent: number;
  net: number;
  transactions: number;
  vs_previous?: {
    month: string;
    total_spent: number;
    change: number;
    pct_change: number;
  };
  by_category: BreakdownRow<Category>[];
  by_owner: BreakdownRow<Owner>[];
  by_card: BreakdownRow<{ id: string; name: string }>[]; // avoid leaking full card meta
  trend: Array<{ month: string; total_spent: number; net: number }>;
}

function sumSpend(amounts: number[]): { totalSpent: number; net: number } {
  let totalSpent = 0;
  let net = 0;
  for (const value of amounts) {
    if (value < 0) {
      totalSpent += Math.abs(value);
    }
    net += value;
  }
  return { totalSpent, net };
}

export async function buildDashboardSummary(userId: string, targetMonth?: string): Promise<DashboardSummary | null> {
  const months = await listTransactionMonths(userId);
  if (months.length === 0) {
    return null;
  }

  const month = targetMonth ?? months[0];
  const currentFile = await loadTransactionFile(userId, month);
  if (!currentFile) {
    return null;
  }

  const [categories, owners, cards] = await Promise.all([getCategories(userId), getOwners(userId), getCards(userId)]);
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));
  const ownerMap = new Map(owners.map((owner) => [owner.id, owner]));
  const cardMap = new Map(cards.map((card) => [card.id, card]));

  const { totalSpent, net } = sumSpend(currentFile.transactions.map((tx) => tx.amount));

  const byCategoryTotals = new Map<
    string,
    { label: string; entity?: Category; spent: number; net: number; count: number }
  >();
  const byOwnerTotals = new Map<
    string,
    { label: string; entity?: Owner; spent: number; net: number; count: number }
  >();
  const byCardTotals = new Map<
    string,
    { label: string; entity?: { id: string; name: string }; spent: number; net: number; count: number }
  >();

  for (const transaction of currentFile.transactions) {
    const spendValue = transaction.amount < 0 ? Math.abs(transaction.amount) : 0;

    const category = categoryMap.get(transaction.category_id);
    const categoryTotals = byCategoryTotals.get(transaction.category_id) ?? {
      label: category?.name ?? transaction.category_id,
      entity: category,
      spent: 0,
      net: 0,
      count: 0,
    };
    categoryTotals.spent += spendValue;
    categoryTotals.net += transaction.amount;
    categoryTotals.count += 1;
    byCategoryTotals.set(transaction.category_id, categoryTotals);

    const owner = ownerMap.get(transaction.owner_id);
    const ownerTotals = byOwnerTotals.get(transaction.owner_id) ?? {
      label: owner?.label ?? transaction.owner_id,
      entity: owner,
      spent: 0,
      net: 0,
      count: 0,
    };
    ownerTotals.spent += spendValue;
    ownerTotals.net += transaction.amount;
    ownerTotals.count += 1;
    byOwnerTotals.set(transaction.owner_id, ownerTotals);

    const card = cardMap.get(transaction.card_id);
    const cardTotals = byCardTotals.get(transaction.card_id) ?? {
      label: card?.name ?? transaction.card_id,
      entity: card ? { id: card.id, name: card.name } : { id: transaction.card_id, name: transaction.card_id },
      spent: 0,
      net: 0,
      count: 0,
    };
    cardTotals.spent += spendValue;
    cardTotals.net += transaction.amount;
    cardTotals.count += 1;
    byCardTotals.set(transaction.card_id, cardTotals);
  }

  const summary: DashboardSummary = {
    month,
    currency: currentFile.meta.currency,
    total_spent: Number(totalSpent.toFixed(2)),
    net: Number(net.toFixed(2)),
    transactions: currentFile.transactions.length,
    by_category: [],
    by_owner: [],
    by_card: [],
    trend: [],
  };

  for (const [key, totals] of byCategoryTotals.entries()) {
    summary.by_category.push({
      key,
      label: totals.label,
      entity: totals.entity,
      total: Number(totals.spent.toFixed(2)),
      net: Number(totals.net.toFixed(2)),
      count: totals.count,
      percentage: totalSpent === 0 ? 0 : Number(((totals.spent / totalSpent) * 100).toFixed(2)),
    });
  }
  summary.by_category.sort((a, b) => b.total - a.total);

  for (const [key, totals] of byOwnerTotals.entries()) {
    summary.by_owner.push({
      key,
      label: totals.label,
      entity: totals.entity,
      total: Number(totals.spent.toFixed(2)),
      net: Number(totals.net.toFixed(2)),
      count: totals.count,
      percentage: totalSpent === 0 ? 0 : Number(((totals.spent / totalSpent) * 100).toFixed(2)),
    });
  }
  summary.by_owner.sort((a, b) => b.total - a.total);

  for (const [key, totals] of byCardTotals.entries()) {
    summary.by_card.push({
      key,
      label: totals.label,
      entity: totals.entity,
      total: Number(totals.spent.toFixed(2)),
      net: Number(totals.net.toFixed(2)),
      count: totals.count,
      percentage: totalSpent === 0 ? 0 : Number(((totals.spent / totalSpent) * 100).toFixed(2)),
    });
  }
  summary.by_card.sort((a, b) => b.total - a.total);

  const trend: DashboardSummary["trend"] = [];
  let previous: { month: string; total_spent: number; net: number } | undefined;
  for (const trendMonth of months.slice().reverse()) {
    const file = await loadTransactionFile(userId, trendMonth);
    if (!file) {
      continue;
    }
    const totals = sumSpend(file.transactions.map((tx) => tx.amount));
    const entry = {
      month: trendMonth,
      total_spent: Number(totals.totalSpent.toFixed(2)),
      net: Number(totals.net.toFixed(2)),
    };
    trend.push(entry);
    if (trendMonth < month) {
      previous = entry;
    }
  }

  summary.trend = trend.sort((a, b) => (a.month > b.month ? 1 : -1));
  const prior = months.find((m) => m !== month);
  if (prior) {
    const priorEntry =
      summary.trend.find((item) => item.month === prior) ?? previous;
    if (priorEntry) {
      const change = summary.total_spent - priorEntry.total_spent;
      const pct =
        priorEntry.total_spent === 0 ? 0 : (change / priorEntry.total_spent) * 100;
      summary.vs_previous = {
        month: prior,
        total_spent: priorEntry.total_spent,
        change: Number(change.toFixed(2)),
        pct_change: Number(pct.toFixed(2)),
      };
    }
  }

  return summary;
}

export async function getTransactionsGroupedByCard(userId: string) {
  const [cards, months] = await Promise.all([getCards(userId), listTransactionMonths(userId)]);
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const result: Array<{
    card_id: string;
    card_name: string;
    month: string;
    transactions: TransactionRecord[];
  }> = [];

  for (const month of months) {
    const file = await loadTransactionFile(userId, month);
    if (!file) continue;
    const grouped = new Map<string, typeof file.transactions>();
    for (const tx of file.transactions) {
      const list = grouped.get(tx.card_id) ?? [];
      list.push(tx);
      grouped.set(tx.card_id, list);
    }
    for (const [cardId, txs] of grouped.entries()) {
      const card = cardMap.get(cardId);
      result.push({
        card_id: cardId,
        card_name: card?.name ?? cardId,
        month,
        transactions: txs,
      });
    }
  }

  return result;
}

export async function getDistinctFilters(userId: string) {
  const [cards, categories, owners, transactions] = await Promise.all([
    getCards(userId),
    getCategories(userId),
    getOwners(userId),
    loadAllTransactions(userId),
  ]);

  return {
    cards,
    categories,
    owners,
    years: Array.from(
      new Set(transactions.map((tx) => tx.transaction_date.slice(0, 4))),
    ).sort(),
    merchants: Array.from(new Set(transactions.map((tx) => tx.merchant))).sort(),
  };
}
