'use client';

import { useMemo, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";

import { Card, Category, Owner, TransactionFile, TransactionRecord } from "@/lib/types";

type Props = {
  months: string[];
  cards: Card[];
  categories: Category[];
  owners: Owner[];
  initialMonth: string | null;
  initialFile: TransactionFile | null;
};

type ApiResponse = {
  month: string;
  meta: TransactionFile["meta"];
  transactions: TransactionRecord[];
};

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to load transactions");
    }
    return res.json();
  });

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

interface FilterState {
  month: string;
  cardId?: string;
  ownerId?: string;
  categoryId?: string;
  search?: string;
}

export default function TransactionsView({
  months,
  cards,
  categories,
  owners,
  initialMonth,
  initialFile,
}: Props) {
  const [filters, setFilters] = useState<FilterState>({
    month: initialMonth ?? months[0] ?? "",
    cardId: undefined,
    ownerId: undefined,
    categoryId: undefined,
    search: "",
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const key = filters.month ? `/api/transactions?month=${filters.month}` : null;
  const fallback =
    initialFile && initialMonth === filters.month
      ? ({
          month: initialMonth,
          meta: initialFile.meta,
          transactions: initialFile.transactions,
        } satisfies ApiResponse)
      : undefined;

  const { data, mutate, isLoading } = useSWR<ApiResponse>(key, fetcher, {
    fallbackData: fallback,
  });

  const transactions = useMemo(
    () => data?.transactions ?? [],
    [data?.transactions],
  );
  const currency = data?.meta.currency ?? "TRY";

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.cardId && tx.card_id !== filters.cardId) return false;
      if (filters.ownerId && tx.owner_id !== filters.ownerId) return false;
      if (filters.categoryId && tx.category_id !== filters.categoryId) return false;
      if (filters.search) {
        const haystack = `${tx.merchant} ${tx.description ?? ""}`.toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [filters, transactions]);

  const groupedByCard = useMemo(() => {
    const groups = new Map<string, TransactionRecord[]>();
    for (const tx of filteredTransactions) {
      const list = groups.get(tx.card_id) ?? [];
      list.push(tx);
      groups.set(tx.card_id, list);
    }
    return Array.from(groups.entries()).map(([cardId, txs]) => ({
      cardId,
      card: cards.find((card) => card.id === cardId),
      transactions: txs.sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1)),
    }));
  }, [filteredTransactions, cards]);

  async function updateTransaction(
    transaction: TransactionRecord,
    updates: Partial<TransactionRecord>,
  ) {
    setSavingId(transaction.id);
    setErrorMessage(null);
    try {
      const payload = {
        ...transaction,
        ...updates,
        month: filters.month,
      };
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error ?? "Failed to save transaction");
      }
      await mutate();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function deleteTransactionRow(transaction: TransactionRecord) {
    setSavingId(transaction.id);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: filters.month, transactionId: transaction.id }),
      });
      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error ?? "Failed to delete transaction");
      }
      await mutate();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">
            Review, categorize, and annotate expenses grouped by credit card.
          </p>
        </div>
      </header>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm grid-cols-1 sm:grid-cols-2 md:grid-cols-5">
        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
          Month
          <select
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 min-h-11"
            value={filters.month}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, month: event.target.value ?? "" }))
            }
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {format(new Date(`${month}-01`), "LLLL yyyy")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
          Card
          <select
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 min-h-11"
            value={filters.cardId ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                cardId: event.target.value || undefined,
              }))
            }
          >
            <option value="">All</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
          Owner
          <select
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 min-h-11"
            value={filters.ownerId ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                ownerId: event.target.value || undefined,
              }))
            }
          >
            <option value="">All</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
          Category
          <select
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 min-h-11"
            value={filters.categoryId ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                categoryId: event.target.value || undefined,
              }))
            }
          >
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500 sm:col-span-2 md:col-span-1">
          Search
          <input
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 min-h-11"
            placeholder="Merchant or note"
            value={filters.search ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          />
        </label>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading transactions...
        </div>
      )}

      {!isLoading && groupedByCard.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No transactions match the current filters.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByCard.map(({ cardId, card, transactions: rows }) => (
            <div key={cardId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <header className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {card?.name ?? cardId}
                  </h2>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {rows.length} transactions
                  </p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p>
                    Total spent:{" "}
                    <span className="font-medium">
                      {formatMoney(
                        rows.reduce(
                          (acc, tx) => (tx.amount < 0 ? acc + Math.abs(tx.amount) : acc),
                          0,
                        ),
                        currency,
                      )}
                    </span>
                  </p>
                  <p>
                    Net:{" "}
                    <span className="font-medium">
                      {formatMoney(
                        rows.reduce((acc, tx) => acc + tx.amount, 0),
                        currency,
                      )}
                    </span>
                  </p>
                </div>
              </header>
              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{row.merchant}</p>
                        {row.description && (
                          <p className="text-xs text-slate-500">{row.description}</p>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900">
                        {formatMoney(row.amount, row.currency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>{format(new Date(row.transaction_date), "dd MMM yyyy")}</span>
                      {row.original_currency && row.original_amount !== undefined && (
                        <span className="text-xs text-slate-500">
                          {`${row.original_currency} ${Math.abs(row.original_amount).toFixed(2)}`}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col text-xs font-medium text-slate-500">
                        Owner
                        <select
                          value={row.owner_id}
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700 min-h-11"
                          onChange={(event) =>
                            updateTransaction(row, { owner_id: event.target.value })
                          }
                          disabled={savingId === row.id}
                        >
                          {owners.map((owner) => (
                            <option key={owner.id} value={owner.id}>
                              {owner.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col text-xs font-medium text-slate-500">
                        Category
                        <select
                          value={row.category_id}
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700 min-h-11"
                          onChange={(event) =>
                            updateTransaction(row, {
                              category_id: event.target.value,
                              llm_category_id: event.target.value,
                            })
                          }
                          disabled={savingId === row.id}
                        >
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {row.notes && (
                      <p className="text-xs text-slate-600">Notes: {row.notes}</p>
                    )}
                    <div className="flex justify-end pt-2 border-t border-slate-200">
                      <button
                        className="min-h-11 min-w-11 px-4 py-2 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        onClick={() => deleteTransactionRow(row)}
                        disabled={savingId === row.id}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Merchant</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Notes</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-2 font-medium">
                          {format(new Date(row.transaction_date), "dd MMM yyyy")}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">{row.merchant}</div>
                          <div className="text-xs text-slate-500">{row.description}</div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.owner_id}
                            className="w-36 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                            onChange={(event) =>
                              updateTransaction(row, { owner_id: event.target.value })
                            }
                            disabled={savingId === row.id}
                          >
                            {owners.map((owner) => (
                              <option key={owner.id} value={owner.id}>
                                {owner.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.category_id}
                            className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                            onChange={(event) =>
                              updateTransaction(row, {
                                category_id: event.target.value,
                                llm_category_id: event.target.value,
                              })
                            }
                            disabled={savingId === row.id}
                          >
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                          {formatMoney(row.amount, row.currency)}
                          {row.original_currency && row.original_amount !== undefined && (
                            <div className="text-xs text-slate-500">
                              {`${row.original_currency} ${Math.abs(row.original_amount).toFixed(2)}`}
                              {row.fx_rate && row.original_currency !== row.currency ? (
                                <span className="ml-1">({row.fx_rate.toFixed(4)} FX)</span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {row.notes ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="text-xs font-semibold text-red-500 hover:text-red-600"
                            onClick={() => deleteTransactionRow(row)}
                            disabled={savingId === row.id}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
