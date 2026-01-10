'use client';

import { ChangeEvent, useState } from "react";

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
  metadata?: {
    statement_date?: string;
    statement_month?: string;
    card_last4?: string;
    cardholder_name?: string;
  };
};

export default function ImportsView({ cards, owners, defaultMonth }: Props) {
  const [fileName, setFileName] = useState("");
  const [statementPdfBase64, setStatementPdfBase64] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string>(cards[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState<string>(owners[0]?.id ?? "");
  const [month, setMonth] = useState(defaultMonth);
  const [isExtracting, setIsExtracting] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedMetadata, setExtractedMetadata] = useState<{
    statement_month?: string;
    card_last4?: string;
    cardholder_name?: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setStatementPdfBase64(null);
      setFileName("");
      setShowPreview(false);
      setExtractedMetadata(null);
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
      setFileName(file.name);
      setError(null);
      setShowPreview(false);
      setExtractedMetadata(null);
    } catch (err) {
      setError(`Failed to read file: ${(err as Error).message}`);
    }
  }

  async function handleExtractPreview() {
    if (!statementPdfBase64) {
      setError("Please upload a PDF file first.");
      return;
    }
    setIsExtracting(true);
    setError(null);

    try {
      const payload = {
        statementName: fileName,
        statementPdfBase64,
        cardId: cardId || undefined,
        ownerId: ownerId || undefined,
        month,
        autoCommit: false,
      };
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? "Extraction failed");
      }
      const body = (await res.json()) as ImportResponse;

      // Extract metadata and auto-match
      if (body.metadata) {
        setExtractedMetadata(body.metadata);

        // Auto-match month
        if (body.metadata.statement_month) {
          setMonth(body.metadata.statement_month);
        }

        // Auto-match card by last 4 digits
        if (body.metadata.card_last4) {
          const matchedCard = cards.find(c => c.last4 === body.metadata?.card_last4);
          if (matchedCard) {
            setCardId(matchedCard.id);
          }
        }

        // Auto-match owner by name
        if (body.metadata.cardholder_name) {
          const normalizedName = body.metadata.cardholder_name.toLowerCase().replace(/\s+/g, ' ').trim();
          const matchedOwner = owners.find(o => {
            const ownerNameNormalized = o.label.toLowerCase().replace(/\s+/g, ' ').trim();
            return normalizedName.includes(ownerNameNormalized) || ownerNameNormalized.includes(normalizedName);
          });
          if (matchedOwner) {
            setOwnerId(matchedOwner.id);
          }
        }
      }

      setResponse(body);
      setShowPreview(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsExtracting(false);
    }
  }

  function handleConfirmImport() {
    // The extraction is already done, just show success
    setShowPreview(false);
    setStatementPdfBase64(null);
    setFileName("");
    setExtractedMetadata(null);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Statement import</h1>
        <p className="text-sm text-slate-500">
          Upload a PDF statement and we will automatically extract transactions, match your card and owner.
        </p>
      </header>

      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Step 1: Upload PDF */}
        <div className="rounded-md border border-dashed border-slate-300 p-4">
          <p className="text-sm font-medium text-slate-700">Upload PDF Statement</p>
          <p className="text-xs text-slate-500">
            Upload your credit card statement PDF. We will automatically extract metadata and transactions.
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="mt-3 text-sm text-slate-600"
          />
          {statementPdfBase64 && (
            <p className="mt-2 text-xs text-emerald-600">
              {fileName} ready ({Math.round(statementPdfBase64.length / 1024)} KB)
            </p>
          )}
        </div>

        {/* Step 2: Extract & Preview button */}
        {statementPdfBase64 && !showPreview && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExtractPreview}
              disabled={isExtracting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isExtracting ? "Extracting..." : "Extract & Preview"}
            </button>
            <span className="text-xs text-slate-500">
              Uses OpenAI (default gpt-4o-mini). Set OPENAI_API_KEY in .env.local.
            </span>
          </div>
        )}

        {/* Step 3: Show extracted preview with edit capability */}
        {showPreview && extractedMetadata && (
          <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Extracted Information</p>
              <p className="text-xs text-emerald-600">Review and edit if needed</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-600">
                Month
                <input
                  type="month"
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 bg-white"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                />
                {extractedMetadata.statement_month && (
                  <span className="mt-1 text-xs text-emerald-600">
                    Auto-detected: {extractedMetadata.statement_month}
                  </span>
                )}
              </label>

              <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-600">
                Card
                <select
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 bg-white"
                  value={cardId}
                  onChange={(event) => setCardId(event.target.value)}
                >
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name} (****{card.last4})
                    </option>
                  ))}
                </select>
                {extractedMetadata.card_last4 && (
                  <span className="mt-1 text-xs text-emerald-600">
                    Auto-matched by last 4 digits: {extractedMetadata.card_last4}
                  </span>
                )}
              </label>

              <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-600">
                Owner
                <select
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 bg-white"
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                >
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.label}
                    </option>
                  ))}
                </select>
                {extractedMetadata.cardholder_name && (
                  <span className="mt-1 text-xs text-emerald-600">
                    Auto-matched by name: {extractedMetadata.cardholder_name}
                  </span>
                )}
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmImport}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
              >
                Confirm Import
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreview(false);
                  setExtractedMetadata(null);
                }}
                className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

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
