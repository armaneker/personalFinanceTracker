'use client';

import { useState } from "react";

import { Card, Owner } from "@/lib/types";
import { DropZone } from "@/components/ui/drop-zone";

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

  async function handleFileSelect(file: File): Promise<void> {
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
    setResponse(null);
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

      {/* Step 1: Upload PDF with drag-drop zone */}
      {!showPreview && (
        <DropZone
          onFileSelect={handleFileSelect}
          accept="application/pdf"
          maxSizeMB={10}
        />
      )}

      {/* Step 2: Extract & Preview button */}
      {statementPdfBase64 && !showPreview && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Ready to extract</p>
              <p className="text-xs text-slate-500 mt-1">
                {fileName} - Uses Claude AI to extract transactions
              </p>
            </div>
            <button
              type="button"
              onClick={handleExtractPreview}
              disabled={isExtracting}
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isExtracting ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner />
                  Extracting...
                </span>
              ) : (
                "Extract & Preview"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Show extracted preview with edit capability */}
      {showPreview && extractedMetadata && (
        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div>
            <p className="text-base font-semibold text-emerald-800">Extraction complete</p>
            <p className="text-sm text-emerald-600">Review and confirm the extracted information</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
                  Detected: {extractedMetadata.statement_month}
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
                  Matched: ****{extractedMetadata.card_last4}
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
                  Matched: {extractedMetadata.cardholder_name}
                </span>
              )}
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirmImport}
              className="rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              Confirm Import
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPreview(false);
                setExtractedMetadata(null);
              }}
              className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <ErrorIcon className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Import failed</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {response && !showPreview && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <SuccessIcon className="h-6 w-6 flex-shrink-0 text-emerald-500 mt-0.5" />
            <div>
              <p className="text-base font-semibold text-emerald-800">Import queued</p>
              <p className="mt-1 text-sm text-emerald-700">
                <span className="font-mono text-xs bg-emerald-100 px-1.5 py-0.5 rounded">{response.runId}</span>
                {" "}&bull;{" "}
                {response.summary.transactions} transactions
                {" "}&bull;{" "}
                {response.summary.total_spend.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: response.summary.currency,
                })}
              </p>
              {response.warnings.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-emerald-800">
                  {response.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-emerald-600">
                {response.autoCommitted
                  ? "Transactions were written to the ledger automatically."
                  : "Review the pending import to approve and commit."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}
