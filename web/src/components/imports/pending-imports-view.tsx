'use client';

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";

import type { PendingRunSummary, PendingRunDetail } from "@/lib/importer";

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
        <h1 className="text-2xl font-semibold text-slate-900">Pending imports</h1>
        <p className="text-sm text-slate-500">
          Review staged LLM extractions and approve them to merge into your ledger.
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

      {runs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {isLoading ? "Loading pending runs..." : "No pending imports waiting for approval."}
        </div>
      ) : (
          <div className="space-y-4">
            {runs.map((run) => (
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
                    Saved on {format(new Date(run.saved_at), "PPpp")}
                  </p>
                  <p>
                    Statement: <span className="font-medium text-slate-900">{run.statement_file}</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Transactions</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {run.summary.transactions}
                  </p>
                  {run.month && (
                    <p className="text-xs text-slate-500">{run.month}</p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Estimated spend</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {formatMoney(run.summary.total_spend, run.summary.currency)}
                  </p>
                  <p className="text-xs text-slate-500">Net of refunds</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Card / Owner</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {run.card_id ?? "Unknown card"}
                  </p>
                  <p className="text-xs text-slate-500">{run.owner_id ?? "Unassigned"}</p>
                </div>
              </div>

              {run.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  <p className="font-medium">Warnings</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {run.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Sample transactions
                </p>
              {run.sample_transactions.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No transactions extracted in this run.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Merchant</th>
                        <th className="px-3 py-2">Card</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {run.sample_transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="whitespace-nowrap px-3 py-2">
                            {format(new Date(tx.transaction_date), "dd MMM yyyy")}
                          </td>
                          <td className="px-3 py-2">{tx.merchant}</td>
                          <td className="px-3 py-2">{tx.card_id}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                            {formatMoney(tx.amount, run.summary.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {run.sample_count < run.total_transactions && (
                <p className="mt-2 text-xs text-slate-500">
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
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    All transactions ({details[run.run_id].transactions.length})
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Merchant</th>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Card</th>
                          <th className="px-3 py-2">Owner</th>
                          <th className="px-3 py-2 text-right">Original</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {details[run.run_id].transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="whitespace-nowrap px-3 py-2">
                              {format(new Date(tx.transaction_date), "dd MMM yyyy")}
                            </td>
                            <td className="px-3 py-2">{tx.merchant}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">
                              {tx.description ?? "-"}
                            </td>
                            <td className="px-3 py-2">{tx.card_id}</td>
                            <td className="px-3 py-2">{tx.owner_id ?? "-"}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-slate-500">
                              {tx.original_currency
                                ? `${tx.original_currency} ${Math.abs(tx.original_amount ?? 0).toFixed(2)}`
                                : "-"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                              {formatMoney(tx.amount, run.summary.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {details[run.run_id].statement_notes && (
                    <p className="mt-3 text-xs text-slate-500">
                      Notes: {details[run.run_id].statement_notes}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                <div className="flex items-center gap-3">
                  {run.total_transactions > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleDetails(run.run_id)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                    >
                      {expandedRun === run.run_id
                        ? "Hide transactions"
                        : detailLoading === run.run_id
                          ? "Loading..."
                          : "View transactions"}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => approve(run.run_id)}
                  disabled={approvingId === run.run_id}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {approvingId === run.run_id ? "Approving..." : "Approve & commit"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(run.run_id)}
                  disabled={deletingId === run.run_id}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
