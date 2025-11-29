'use client';

import { ChangeEvent, FormEvent, useState } from "react";

import { Card, Owner } from "@/lib/types";

type Props = {
  cards: Card[];
  owners: Owner[];
  defaultMonth: string;
};

type ImportResponse = {
  runId: string;
  summary: {
    transactions: number;
    total_spend: number;
    currency: string;
  };
  warnings: string[];
  autoCommitted: boolean;
};

export default function ImportsView({ cards, owners, defaultMonth }: Props) {
  const [statementName, setStatementName] = useState("");
  const [statementText, setStatementText] = useState("");
  const [statementPdfBase64, setStatementPdfBase64] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string>(cards[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState<string>(owners[0]?.id ?? "");
  const [month, setMonth] = useState(defaultMonth);
  const [autoCommit, setAutoCommit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setStatementPdfBase64(null);
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      setStatementPdfBase64(btoa(binary));
      setStatementName(file.name);
      setError(null);
    } catch (err) {
      setError(`Failed to read file: ${(err as Error).message}`);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!statementName) {
      setError("Statement name is required.");
      return;
    }
    if (!statementText && !statementPdfBase64) {
      setError("Provide statement text or upload a PDF.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setResponse(null);

    try {
      const payload = {
        statementName,
        statementText: statementText.trim() ? statementText : undefined,
        statementPdfBase64: statementPdfBase64 ?? undefined,
        cardId: cardId || undefined,
        ownerId: ownerId || undefined,
        month,
        autoCommit,
      };
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? "Import failed");
      }
      const body = (await res.json()) as ImportResponse;
      setResponse(body);
      setStatementText("");
      setStatementPdfBase64(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Statement import</h1>
        <p className="text-sm text-slate-500">
          Send a bank statement to the LLM parser, review the structured results, and
          optionally auto-commit to your ledger.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
            Statement name
            <input
              required
              type="text"
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              value={statementName}
              onChange={(event) => setStatementName(event.target.value)}
              placeholder="October Statement.pdf"
            />
          </label>

          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
            Month
            <input
              type="month"
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>

          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
            Card
            <select
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              value={cardId}
              onChange={(event) => setCardId(event.target.value)}
            >
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
            Owner
            <select
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-md border border-dashed border-slate-300 p-4">
          <p className="text-sm font-medium text-slate-700">Upload PDF (optional)</p>
          <p className="text-xs text-slate-500">
            We attempt to extract text with pdf-parse. Large statements may take a few
            seconds.
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="mt-3 text-sm text-slate-600"
          />
          {statementPdfBase64 && (
            <p className="mt-2 text-xs text-emerald-600">
              PDF ready for upload ({Math.round(statementPdfBase64.length / 1024)} KB)
            </p>
          )}
        </div>

        <div>
          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
            Statement text
            <textarea
              className="mt-1 h-48 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              placeholder="Paste plain text statement here if PDF upload fails."
              value={statementText}
              onChange={(event) => setStatementText(event.target.value)}
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={autoCommit}
            onChange={(event) => setAutoCommit(event.target.checked)}
            className="h-4 w-4 rounded border-slate-400"
          />
          Auto-commit transactions after the LLM extraction (skip manual review)
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Importing..." : "Run import"}
          </button>
          <span className="text-xs text-slate-500">
            Uses OpenAI (default gpt-4.1-mini). Set OPENAI_API_KEY in .env.local.
          </span>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {response && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">
          <p className="text-base font-semibold text-emerald-800">Import queued</p>
          <p className="mt-2">
            Run ID <span className="font-mono">{response.runId}</span> •{" "}
            {response.summary.transactions} transactions • Estimated spend{" "}
            {response.summary.total_spend.toLocaleString("tr-TR", {
              style: "currency",
              currency: response.summary.currency,
            })}
          </p>
          {response.warnings.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-emerald-800">
              {response.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-emerald-700">
            {response.autoCommitted
              ? "Transactions were written to the ledger automatically."
              : "Review the pending file in data/imports/pending to approve and commit."}
          </p>
        </div>
      )}
    </div>
  );
}
