'use client';

import { useMemo, useState } from "react";
import useSWR from "swr";

import { DashboardSummary } from "@/lib/analytics";
import { Category } from "@/lib/types";
import HeroMetrics from "./hero-metrics";
import SpendingTrendChart from "./spending-trend-chart";
import TopCategories from "./top-categories";
import RecentTransactions from "./recent-transactions";
import DashboardEmpty from "./dashboard-empty";
import Spinner from "@/components/ui/spinner";
import {
  SkeletonHeroMetrics,
  SkeletonChart,
  SkeletonCategoryList,
} from "@/components/ui/skeleton";

type Props = {
  summary: DashboardSummary | null;
  months: string[];
};

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to load dashboard data");
      }
      return res.json();
    })
    .catch((error) => {
      console.error(error);
      throw error;
    });

export default function DashboardView({ summary, months }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(summary?.month ?? months[0] ?? "");
  const fallback = summary && selectedMonth === summary.month ? { summary } : undefined;

  const { data, isLoading, error } = useSWR(
    selectedMonth ? `/api/dashboard?month=${selectedMonth}` : null,
    fetcher,
    {
      fallbackData: fallback,
    },
  );

  const activeSummary = (data?.summary ?? null) as DashboardSummary | null;
  const currency = activeSummary?.currency ?? "TRY";

  const categoryMap = useMemo(() => {
    if (!activeSummary) return new Map<string, Category>();
    const map = new Map<string, Category>();
    for (const row of activeSummary.by_category) {
      if (row.entity) {
        map.set(row.key, row.entity);
      }
    }
    return map;
  }, [activeSummary]);

  // Fetch transactions for recent transactions component
  const { data: txData } = useSWR(
    selectedMonth ? `/api/transactions?month=${selectedMonth}` : null,
    fetcher,
  );

  const recentTransactions = txData?.transactions ?? [];

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700 shadow-sm">
        Failed to load dashboard: {error.message}
      </div>
    );
  }

  // Show skeleton loading state when switching months
  if (isLoading && !activeSummary) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
            <div className="mt-2 h-4 w-32 animate-pulse rounded-md bg-slate-200" />
          </div>
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200" />
          </div>
        </div>
        <SkeletonHeroMetrics />
        <SkeletonChart />
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCategoryList count={5} />
          <SkeletonCategoryList count={5} />
        </div>
      </div>
    );
  }

  if (!activeSummary) {
    return <DashboardEmpty />;
  }

  return (
    <div className="space-y-8">
      {/* Header with month selector */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {new Date(`${activeSummary.month}-01`).toLocaleDateString("tr-TR", {
              year: "numeric",
              month: "long",
            })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your monthly spending overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Spinner size="sm" label="Refreshing..." />
          )}
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-xl border-0 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] w-full sm:w-48"
          >
            {months.map((monthOption) => (
              <option key={monthOption} value={monthOption}>
                {new Date(`${monthOption}-01`).toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Metrics */}
      <HeroMetrics
        totalSpent={activeSummary.total_spent}
        currency={currency}
        vsLastMonth={
          activeSummary.vs_previous
            ? {
                change: activeSummary.vs_previous.change,
                pctChange: activeSummary.vs_previous.pct_change,
              }
            : undefined
        }
      />

      {/* Spending Trend Chart */}
      <SpendingTrendChart data={activeSummary.trend} currency={currency} />

      {/* Bottom Grid: Top Categories and Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopCategories categories={activeSummary.by_category} currency={currency} />
        <RecentTransactions
          transactions={recentTransactions}
          categories={categoryMap}
          currency={currency}
        />
      </div>
    </div>
  );
}
