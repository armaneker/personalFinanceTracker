'use client';

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  PieLabelRenderProps,
} from "recharts";

import { DashboardSummary } from "@/lib/analytics";

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

  const categoryColors = useMemo(() => {
    if (!activeSummary) return new Map<string, string>();
    return new Map(
      activeSummary.by_category.map((row, index) => [
        row.key,
        row.entity?.color ??
          ["#3b82f6", "#22c55e", "#ef4444", "#eab308", "#a855f7", "#14b8a6"][index % 6],
      ]),
    );
  }, [activeSummary]);

  const categoryData = useMemo(() => {
    if (!activeSummary) return [];
    return activeSummary.by_category.map((row) => ({
      key: row.key,
      name: row.label,
      value: row.total,
      percentage: row.percentage,
    }));
  }, [activeSummary]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load dashboard: {error.message}
      </div>
    );
  }

  if (!activeSummary) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No data available yet. Import a statement to get started.
      </div>
    );
  }

  const changeLabel =
    activeSummary.vs_previous && activeSummary.vs_previous.change >= 0 ? "↑" : "↓";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {new Date(`${activeSummary.month}-01`).toLocaleDateString("tr-TR", {
              year: "numeric",
              month: "long",
            })}
          </h1>
          <p className="text-sm text-slate-500">
            Monthly spend overview and breakdown by category and owner.
          </p>
        </div>
        <select
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-56"
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total spent</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatMoney(activeSummary.total_spent, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {activeSummary.transactions} transactions
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">Net balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatMoney(activeSummary.net, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Includes refunds and adjustments
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">vs previous</p>
          {activeSummary.vs_previous ? (
            <div className="mt-2 space-y-1">
              <p className="text-2xl font-semibold text-slate-900">
                {changeLabel} {formatMoney(Math.abs(activeSummary.vs_previous.change), currency)}
              </p>
              <p className="text-xs text-slate-500">
                {activeSummary.vs_previous.pct_change.toFixed(1)}% compared to{" "}
                {new Date(`${activeSummary.vs_previous.month}-01`).toLocaleDateString("tr-TR", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No previous month data.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Spending trend</h2>
            {isLoading && <span className="text-xs text-slate-400">Refreshing...</span>}
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeSummary.trend}>
                <defs>
                  <linearGradient id="trendColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatMoney(value, currency)} />
                <Area
                  type="monotone"
                  dataKey="total_spent"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#trendColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Category split</h2>
          <div className="mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }: PieLabelRenderProps) => {
                    const pct = typeof percent === "number" ? percent : 0;
                    return pct ? `${name} ${(pct * 100).toFixed(0)}%` : name;
                  }}
                  outerRadius={80}
                  innerRadius={40}
                >
                  {categoryData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={categoryColors.get(entry.key) ?? "#3b82f6"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(
                    value: number,
                    _name: string,
                    item: { payload?: { percentage?: number } | undefined },
                  ) => {
                    const pctSource = item?.payload?.percentage;
                    const pct = typeof pctSource === "number" ? pctSource : Number(pctSource ?? 0);
                    return `${formatMoney(value, currency)} • ${pct.toFixed(1)}%`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 space-y-2">
            {categoryData.map((row) => (
              <li key={row.key} className="flex justify-between text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: categoryColors.get(row.key) ?? "#3b82f6" }}
                  />
                  {row.name}
                </span>
                <span>{formatMoney(row.value, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">By owner</h2>
          <ul className="mt-4 space-y-3">
            {activeSummary.by_owner.map((row) => (
              <li key={row.key} className="flex items-center justify-between text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-900">{row.label}</p>
                  <p className="text-xs text-slate-500">
                    {row.count} transactions • {row.percentage.toFixed(1)}%
                  </p>
                </div>
                <p className="font-medium">{formatMoney(row.total, currency)}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">By card</h2>
          <ul className="mt-4 space-y-3">
            {activeSummary.by_card.map((row) => (
              <li key={row.key} className="flex items-center justify-between text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-900">{row.label}</p>
                  <p className="text-xs text-slate-500">
                    {row.count} transactions • {row.percentage.toFixed(1)}%
                  </p>
                </div>
                <p className="font-medium">{formatMoney(row.total, currency)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
