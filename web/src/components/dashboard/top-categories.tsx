'use client';

import Link from "next/link";
import { Category } from "@/lib/types";

interface CategoryData {
  key: string;
  label: string;
  entity?: Category;
  total: number;
  percentage: number;
}

interface TopCategoriesProps {
  categories: CategoryData[];
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

const DEFAULT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function TopCategories({ categories, currency }: TopCategoriesProps) {
  // Show only top 5 categories
  const topCategories = categories.slice(0, 5);

  if (topCategories.length === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top Categories</h2>
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No category data available yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top Categories</h2>
        <Link
          href="/categories"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          See all
        </Link>
      </div>
      <div className="mt-6 space-y-5">
        {topCategories.map((category, index) => {
          const color = category.entity?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          return (
            <div key={category.key}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{category.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{category.percentage.toFixed(0)}%</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatMoney(category.total, currency)}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(category.percentage, 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
