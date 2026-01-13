'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TrendData {
  month: string;
  total_spent: number;
}

interface SpendingTrendChartProps {
  data: TrendData[];
  currency: string;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toFixed(0)} ${currency}`;
  }
}

function formatMonthLabel(month: string) {
  try {
    return new Date(`${month}-01`).toLocaleDateString("tr-TR", {
      month: "short",
    });
  } catch {
    return month;
  }
}

export default function SpendingTrendChart({ data, currency }: SpendingTrendChartProps) {
  // Show last 6 months only
  const chartData = data.slice(-6).map((item) => ({
    ...item,
    label: formatMonthLabel(item.month),
  }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Spending Trend</h2>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No trend data available yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Spending Trend</h2>
      <div className="mt-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              width={80}
              tickFormatter={(value) => formatMoney(value, currency)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "none",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: number) => [formatMoney(value, currency), "Spent"]}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="total_spent"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#spendingGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
