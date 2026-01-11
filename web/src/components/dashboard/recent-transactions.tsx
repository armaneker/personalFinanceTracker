'use client';

import Link from "next/link";
import { TransactionRecord, Category } from "@/lib/types";

interface RecentTransactionsProps {
  transactions: TransactionRecord[];
  categories: Map<string, Category>;
  currency: string;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

const DEFAULT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function RecentTransactions({
  transactions,
  categories,
  currency,
}: RecentTransactionsProps) {
  // Show only last 5 transactions (sorted by date, most recent first)
  const recentTransactions = [...transactions]
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .slice(0, 5);

  if (recentTransactions.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
        </div>
        <p className="mt-4 text-sm text-slate-500">No transactions available yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
        <Link
          href="/transactions"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all
        </Link>
      </div>
      <div className="mt-6 space-y-4">
        {recentTransactions.map((tx, index) => {
          const category = categories.get(tx.category_id);
          const categoryColor = category?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          const isExpense = tx.amount < 0;

          return (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{tx.merchant}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{formatDate(tx.transaction_date)}</span>
                    <span className="text-slate-300">|</span>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-xs"
                      style={{
                        backgroundColor: `${categoryColor}15`,
                        color: categoryColor,
                      }}
                    >
                      {category?.name ?? "Uncategorized"}
                    </span>
                  </div>
                </div>
              </div>
              <p
                className={`flex-shrink-0 font-medium ${
                  isExpense ? "text-slate-900" : "text-emerald-600"
                }`}
              >
                {isExpense ? "-" : "+"}
                {formatMoney(Math.abs(tx.amount), currency)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
