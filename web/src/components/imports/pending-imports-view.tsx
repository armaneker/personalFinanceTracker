'use client';

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";

import type { PendingRunSummary, PendingRunDetail } from "@/lib/importer";
import { SkeletonImportCard } from "@/components/ui/skeleton";
import { EmptyState, InboxIcon } from "@/components/ui/empty-state";

type Props = {
  initialRuns: PendingRunSummary[];
};

type PendingResponse = {
  pending: PendingRunSummary[];
};

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to load pending imports");
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

export default function PendingImportsView({ initialRuns }: Props) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PendingRunDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR<PendingResponse>(
    "/api/import/pending",
    fetcher,
    { fallbackData: { pending: initialRuns } },
  );

  const runs = data?.pending ?? [];

  async function approve(runId: string) {
    setApprovingId(runId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/import/pending/${runId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to approve run");
      }
      const body = await res.json();
      setSuccess(
        `Committed ${body.result?.summary?.transactions ?? 0} transactions for ${runId}.`,
      );
      await mutate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setApprovingId(null);
    }
  }

  async function remove(runId: string) {
    setDeletingId(runId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/import/pending/${runId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to discard run");
      }
      setSuccess(`Discarded pending run ${runId}.`);
      setDetails((prev) => {
        const next = { ...prev };
        delete next[runId];
        return next;
      });
      await mutate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleDetails(runId: string) {
    if (expandedRun === runId) {
      setExpandedRun(null);
      return;
    }
    setDetailLoading(runId);
    setError(null);
    try {
      const res = await fetch(`/api/import/pending/${runId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load run details");
      }
      const body = (await res.json()) as PendingRunDetail;
      setDetails((prev) => ({ ...prev, [runId]: body }));
      setExpandedRun(runId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDetailLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Pending imports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review staged LLM extractions and approve them to merge into your ledger.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          {success}
        </div>
      )}

      {isLoading && runs.length === 0 ? (
        <div className="space-y-4" aria-busy="true">
          <SkeletonImportCard />
          <SkeletonImportCard />
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title="No pending imports"
          description="When you upload a statement, it will appear here for review before being committed to your ledger."
          action={{
            label: "Upload Statement",
            href: "/imports",
          }}
        />
      ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <div
                key={run.run_id}
                className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm"
              >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Run ID</p>
                  <p className="font-mono text-slate-900 dark:text-white">{run.run_id}</p>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  <p>
                    Saved on {format(new Date(run.saved_at), "PPpp")}
                  </p>
                  <p>
                    Statement: <span className="font-medium text-slate-900 dark:text-white">{run.statement_file}</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Transactions</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {run.summary.transactions}
                  </p>
                  {run.month && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{run.month}</p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Estimated spend</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {formatMoney(run.summary.total_spend, run.summary.currency)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Net of refunds</p>
                </div>
                <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Card / Owner</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                    {run.card_id ?? "Unknown card"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{run.owner_id ?? "Unassigned"}</p>
                </div>
              </div>

              {run.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium">Warnings</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {run.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Sample transactions
                </p>
              {run.sample_transactions.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No transactions extracted in this run.
                </p>
              ) : (
                <>
                  {/* Mobile card view for sample transactions */}
                  <div className="mt-3 md:hidden space-y-2">
                    {run.sample_transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{tx.merchant}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{tx.card_id}</p>
                          </div>
                          <p className="font-semibold text-slate-900 dark:text-white flex-shrink-0">
                            {formatMoney(tx.amount, run.summary.currency)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {format(new Date(tx.transaction_date), "dd MMM yyyy")}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table view for sample transactions */}
                  <div className="mt-3 hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Merchant</th>
                          <th className="px-3 py-2">Card</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                        {run.sample_transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="whitespace-nowrap px-3 py-2">
                              {format(new Date(tx.transaction_date), "dd MMM yyyy")}
                            </td>
                            <td className="px-3 py-2">{tx.merchant}</td>
                            <td className="px-3 py-2">{tx.card_id}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-900 dark:text-white">
                              {formatMoney(tx.amount, run.summary.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {run.sample_count < run.total_transactions && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Showing first {run.sample_count} of {run.total_transactions} transactions.
                  {run.months.length > 1 && (
                    <span className="ml-1">
                      Covers months: {run.months.join(", ")}
                    </span>
                  )}
                </p>
              )}
              </div>

              {expandedRun === run.run_id && details[run.run_id] && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    All transactions ({details[run.run_id].transactions.length})
                  </p>

                  {/* Mobile card view for all transactions */}
                  <div className="mt-3 md:hidden space-y-2 max-h-96 overflow-y-auto">
                    {details[run.run_id].transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{tx.merchant}</p>
                            {tx.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{tx.description}</p>
                            )}
                          </div>
                          <p className="font-semibold text-slate-900 dark:text-white flex-shrink-0">
                            {formatMoney(tx.amount, run.summary.currency)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{format(new Date(tx.transaction_date), "dd MMM yyyy")}</span>
                          <span>Card: {tx.card_id}</span>
                          {tx.owner_id && <span>Owner: {tx.owner_id}</span>}
                        </div>
                        {tx.original_currency && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Original: {tx.original_currency} {Math.abs(tx.original_amount ?? 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop table view for all transactions */}
                  <div className="mt-3 hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600 text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Merchant</th>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Card</th>
                          <th className="px-3 py-2">Owner</th>
                          <th className="px-3 py-2 text-right">Original</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-600 text-slate-700 dark:text-slate-300">
                        {details[run.run_id].transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="whitespace-nowrap px-3 py-2">
                              {format(new Date(tx.transaction_date), "dd MMM yyyy")}
                            </td>
                            <td className="px-3 py-2">{tx.merchant}</td>
                            <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                              {tx.description ?? "-"}
                            </td>
                            <td className="px-3 py-2">{tx.card_id}</td>
                            <td className="px-3 py-2">{tx.owner_id ?? "-"}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-slate-500 dark:text-slate-400">
                              {tx.original_currency
                                ? `${tx.original_currency} ${Math.abs(tx.original_amount ?? 0).toFixed(2)}`
                                : "-"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-900 dark:text-white">
                              {formatMoney(tx.amount, run.summary.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {details[run.run_id].statement_notes && (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Notes: {details[run.run_id].statement_notes}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                {run.total_transactions > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleDetails(run.run_id)}
                    className="rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-700 min-h-11 w-full md:w-auto"
                  >
                    {expandedRun === run.run_id
                      ? "Hide transactions"
                      : detailLoading === run.run_id
                        ? "Loading..."
                        : "View transactions"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => approve(run.run_id)}
                  disabled={approvingId === run.run_id}
                  className="rounded-md bg-slate-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 shadow-sm transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600 min-h-11 w-full md:w-auto"
                >
                  {approvingId === run.run_id ? "Approving..." : "Approve & commit"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(run.run_id)}
                  disabled={deletingId === run.run_id}
                  className="rounded-md border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 shadow-sm transition hover:bg-red-50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50 min-h-11 w-full md:w-auto"
                >
                  {deletingId === run.run_id ? "Removing..." : "Discard"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
