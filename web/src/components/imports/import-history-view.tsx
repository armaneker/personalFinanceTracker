'use client';

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";

import type { ImportRun } from "@/lib/types";
import { SkeletonImportCard } from "@/components/ui/skeleton";
import { EmptyState, ClockIcon } from "@/components/ui/empty-state";

type Props = {
  initialHistory: ImportRun[];
};

type HistoryResponse = {
  history: ImportRun[];
};

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to load import history");
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

function formatStatementPeriod(yearMonth: string): string {
  // Parse YYYY-MM format and return "Month Year" (e.g., "December 2025")
  const [year, month] = yearMonth.split("-");
  if (!year || !month) return yearMonth;

  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function ImportHistoryView({ initialHistory }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR<HistoryResponse>(
    "/api/import/history",
    fetcher,
    { fallbackData: { history: initialHistory } },
  );

  const history = data?.history ?? [];

  async function handleDelete(runId: string) {
    setDeletingId(runId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/import/runs/${runId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete import run");
      }
      const body = await res.json();
      setSuccess(
        `Deleted import run ${runId} and ${body.deleted?.transactionsCount ?? 0} transactions.`,
      );
      setConfirmDeleteId(null);
      await mutate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  function confirmDelete(runId: string) {
    setConfirmDeleteId(runId);
    setError(null);
    setSuccess(null);
  }

  function cancelDelete() {
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Import history</h1>
        <p className="text-sm text-slate-500">
          View all completed statement imports. You can delete an import to remove all associated transactions.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {isLoading && history.length === 0 ? (
        <div className="space-y-4" aria-busy="true">
          <SkeletonImportCard />
          <SkeletonImportCard />
          <SkeletonImportCard />
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          icon={<ClockIcon />}
          title="No imports yet"
          description="Your import history will appear here once you upload and approve your first credit card statement."
          action={{
            label: "Upload Statement",
            href: "/imports",
          }}
        />
      ) : (
        <div className="space-y-4">
          {history.map((run) => (
            <div
              key={run.run_id}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-500">Run ID</p>
                  <p className="font-mono text-slate-900">{run.run_id}</p>
                </div>
                <div className="text-sm text-slate-500">
                  <p>
                    Imported on {format(new Date(run.imported_at), "PPpp")}
                  </p>
                  <p>
                    Statement: <span className="font-medium text-slate-900">{run.statement_file}</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Statement Period</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {run.statement_month
                      ? formatStatementPeriod(run.statement_month)
                      : formatStatementPeriod(run.month)}
                  </p>
                  <p className="text-xs text-slate-500">Billing cycle</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Transactions</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {run.summary?.transactions ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">{run.month}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total spend</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {run.summary
                      ? formatMoney(run.summary.total_spend, run.summary.currency)
                      : "-"}
                  </p>
                  <p className="text-xs text-slate-500">Net of refunds</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 capitalize">
                    {run.status}
                  </p>
                  <p className="text-xs text-slate-500">Card: {run.card_id}</p>
                </div>
              </div>

              {run.error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-medium">Error</p>
                  <p>{run.error}</p>
                </div>
              )}

              {/* Delete confirmation dialog */}
              {confirmDeleteId === run.run_id ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">
                    Are you sure you want to delete this import?
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    This will permanently delete the import run and all {run.summary?.transactions ?? 0} associated transactions.
                    This action cannot be undone.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <button
                      type="button"
                      onClick={() => handleDelete(run.run_id)}
                      disabled={deletingId === run.run_id}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 min-h-11"
                    >
                      {deletingId === run.run_id ? "Deleting..." : "Yes, delete import"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelDelete}
                      disabled={deletingId === run.run_id}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 min-h-11"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                  <button
                    type="button"
                    onClick={() => confirmDelete(run.run_id)}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 min-h-11 w-full md:w-auto"
                  >
                    Delete import
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
