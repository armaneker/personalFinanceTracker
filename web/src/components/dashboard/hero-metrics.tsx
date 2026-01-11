'use client';

interface HeroMetricsProps {
  totalSpent: number;
  currency: string;
  vsLastMonth?: {
    change: number;
    pctChange: number;
  };
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

export default function HeroMetrics({ totalSpent, currency, vsLastMonth }: HeroMetricsProps) {
  const isIncrease = vsLastMonth && vsLastMonth.change >= 0;
  const changeColor = isIncrease ? "text-red-500" : "text-emerald-500";
  const changeIcon = isIncrease ? "+" : "";

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Total Spent</p>
        <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
          {formatMoney(totalSpent, currency)}
        </p>
      </div>

      <div className="rounded-xl bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">vs Last Month</p>
        {vsLastMonth ? (
          <div className="mt-3">
            <p className={`text-4xl font-bold tracking-tight ${changeColor}`}>
              {changeIcon}{vsLastMonth.pctChange.toFixed(1)}%
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {isIncrease ? "Spent more" : "Saved"}{" "}
              {formatMoney(Math.abs(vsLastMonth.change), currency)}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-lg text-slate-400">No previous data</p>
        )}
      </div>
    </div>
  );
}
