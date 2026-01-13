'use client';

import { useMemo, useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { format } from "date-fns";

import { Card, Category, Owner, TransactionFile, TransactionRecord } from "@/lib/types";
import { SkeletonTransactionCard } from "@/components/ui/skeleton";
import { EmptyState, DocumentIcon } from "@/components/ui/empty-state";

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

const FILTER_STORAGE_KEY = "transactions-filters";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function FunnelIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
    </svg>
  );
}

function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300">
      <span className="text-slate-500 dark:text-slate-400">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors min-h-[22px] min-w-[22px] flex items-center justify-center"
        aria-label={`Remove ${label} filter`}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export default function TransactionsView({
  months,
  cards,
  categories,
  owners,
  initialMonth,
  initialFile,
}: Props) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted filters from localStorage
  const getInitialFilters = useCallback((): FilterState => {
    if (typeof window === "undefined") {
      return {
        month: initialMonth ?? months[0] ?? "",
        cardId: undefined,
        ownerId: undefined,
        categoryId: undefined,
        search: "",
      };
    }

    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<FilterState>;
        // Validate month is still available
        const validMonth = parsed.month && months.includes(parsed.month)
          ? parsed.month
          : initialMonth ?? months[0] ?? "";
        return {
          month: validMonth,
          cardId: parsed.cardId,
          ownerId: parsed.ownerId,
          categoryId: parsed.categoryId,
          search: parsed.search || "",
        };
      }
    } catch {
      // Ignore localStorage errors
    }

    return {
      month: initialMonth ?? months[0] ?? "",
      cardId: undefined,
      ownerId: undefined,
      categoryId: undefined,
      search: "",
    };
  }, [initialMonth, months]);

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setFilters(getInitialFilters());
    setIsHydrated(true);
  }, [getInitialFilters]);

  // Persist filters to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore localStorage errors
    }
  }, [filters, isHydrated]);

  // Auto-expand more filters if any advanced filter is active
  useEffect(() => {
    if (filters.cardId || filters.ownerId || filters.categoryId) {
      setShowMoreFilters(true);
    }
  }, [filters.cardId, filters.ownerId, filters.categoryId]);

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

  // Count active advanced filters
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (filters.cardId) count++;
    if (filters.ownerId) count++;
    if (filters.categoryId) count++;
    return count;
  }, [filters]);

  // Get active filter details for chips
  const activeFilters = useMemo(() => {
    const active: { key: keyof FilterState; label: string; value: string }[] = [];

    if (filters.cardId) {
      const card = cards.find(c => c.id === filters.cardId);
      active.push({ key: "cardId", label: "Card", value: card?.name ?? filters.cardId });
    }
    if (filters.ownerId) {
      const owner = owners.find(o => o.id === filters.ownerId);
      active.push({ key: "ownerId", label: "Owner", value: owner?.label ?? filters.ownerId });
    }
    if (filters.categoryId) {
      const category = categories.find(c => c.id === filters.categoryId);
      active.push({ key: "categoryId", label: "Category", value: category?.name ?? filters.categoryId });
    }
    if (filters.search) {
      active.push({ key: "search", label: "Search", value: filters.search });
    }

    return active;
  }, [filters, cards, owners, categories]);

  function clearFilter(key: keyof FilterState) {
    setFilters(prev => ({ ...prev, [key]: key === "search" ? "" : undefined }));
  }

  function clearAllFilters() {
    setFilters(prev => ({
      month: prev.month,
      cardId: undefined,
      ownerId: undefined,
      categoryId: undefined,
      search: "",
    }));
    setShowMoreFilters(false);
  }

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
    <div className="space-y-4 md:space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review, categorize, and annotate expenses grouped by credit card.
          </p>
        </div>
      </header>

      {/* Filter Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        {/* Primary Filters - Always visible */}
        <div className="p-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {/* Search */}
            <div className="relative sm:col-span-2 md:col-span-1 md:order-first">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-9 pr-3 py-2.5 text-sm text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[44px] focus:border-slate-500 dark:focus:border-slate-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                placeholder="Search merchant or note..."
                value={filters.search ?? ""}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.target.value }))
                }
              />
            </div>

            {/* Month */}
            <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Month
              <select
                className="mt-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-white min-h-[44px] focus:border-slate-500 dark:focus:border-slate-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
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

            {/* More Filters Toggle */}
            <div className="flex items-end">
              <button
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] w-full justify-center ${
                  showMoreFilters || activeAdvancedFilterCount > 0
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                }`}
              >
                <FunnelIcon className="h-4 w-4" />
                More Filters
                {activeAdvancedFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-slate-800 dark:bg-slate-500 px-2 py-0.5 text-xs text-white dark:text-slate-900">
                    {activeAdvancedFilterCount}
                  </span>
                )}
                <ChevronDownIcon className={`h-4 w-4 ml-auto transition-transform ${showMoreFilters ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters - Expandable */}
        {showMoreFilters && (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Card
                <select
                  className="mt-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-white min-h-[44px] focus:border-slate-500 dark:focus:border-slate-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                  value={filters.cardId ?? ""}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      cardId: event.target.value || undefined,
                    }))
                  }
                >
                  <option value="">All Cards</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Owner
                <select
                  className="mt-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-white min-h-[44px] focus:border-slate-500 dark:focus:border-slate-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                  value={filters.ownerId ?? ""}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      ownerId: event.target.value || undefined,
                    }))
                  }
                >
                  <option value="">All Owners</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Category
                <select
                  className="mt-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-white min-h-[44px] focus:border-slate-500 dark:focus:border-slate-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                  value={filters.categoryId ?? ""}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      categoryId: event.target.value || undefined,
                    }))
                  }
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-1">
              Active:
            </span>
            {activeFilters.map((filter) => (
              <FilterChip
                key={filter.key}
                label={filter.label}
                value={filter.value}
                onRemove={() => clearFilter(filter.key)}
              />
            ))}
            <button
              onClick={clearAllFilters}
              className="ml-auto text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors px-2 py-1 min-h-[32px]"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="space-y-6">
          <SkeletonTransactionCard rowCount={6} />
          <SkeletonTransactionCard rowCount={4} />
        </div>
      )}

      {!isLoading && groupedByCard.length === 0 ? (
        transactions.length === 0 ? (
          <EmptyState
            icon={<DocumentIcon />}
            title="No transactions yet"
            description="Import your first credit card statement to see your transactions here."
            action={{
              label: "Import Statement",
              href: "/imports",
            }}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-sm text-slate-500 dark:text-slate-400 text-center">
            No transactions match the current filters.
          </div>
        )
      ) : (
        <div className="space-y-4 md:space-y-6">
          {groupedByCard.map(({ cardId, card, transactions: rows }) => (
            <div key={cardId} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 md:p-4 shadow-sm">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {card?.name ?? cardId}
                  </h2>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {rows.length} transactions
                  </p>
                </div>
                <div className="text-left sm:text-right text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    Total spent:{" "}
                    <span className="font-medium text-slate-900 dark:text-white">
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
                    <span className="font-medium text-slate-900 dark:text-white">
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
                    className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{row.merchant}</p>
                        {row.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.description}</p>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatMoney(row.amount, row.currency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>{format(new Date(row.transaction_date), "dd MMM yyyy")}</span>
                      {row.original_currency && row.original_amount !== undefined && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {`${row.original_currency} ${Math.abs(row.original_amount).toFixed(2)}`}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
                        Owner
                        <select
                          value={row.owner_id}
                          className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-600 px-2 py-2 text-sm text-slate-700 dark:text-white min-h-[44px]"
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
                      <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
                        Category
                        <select
                          value={row.category_id}
                          className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-600 px-2 py-2 text-sm text-slate-700 dark:text-white min-h-[44px]"
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
                      <p className="text-xs text-slate-600 dark:text-slate-400">Notes: {row.notes}</p>
                    )}
                    <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-600">
                      <button
                        className="min-h-[44px] min-w-[44px] px-4 py-2 text-sm font-semibold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
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
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Merchant</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Notes</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="whitespace-nowrap px-3 py-2 font-medium">
                          {format(new Date(row.transaction_date), "dd MMM yyyy")}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900 dark:text-white">{row.merchant}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{row.description}</div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.owner_id}
                            className="w-36 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-xs text-slate-700 dark:text-white"
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
                            className="w-40 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-xs text-slate-700 dark:text-white"
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
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900 dark:text-white">
                          {formatMoney(row.amount, row.currency)}
                          {row.original_currency && row.original_amount !== undefined && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {`${row.original_currency} ${Math.abs(row.original_amount).toFixed(2)}`}
                              {row.fx_rate && row.original_currency !== row.currency ? (
                                <span className="ml-1">({row.fx_rate.toFixed(4)} FX)</span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                          {row.notes ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="text-xs font-semibold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
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
