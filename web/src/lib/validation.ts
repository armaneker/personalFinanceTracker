import { statementExtractionSchema, StatementExtractionInput } from "./schemas";
import { StatementExtraction } from "./types";

/**
 * Sanitize extraction by filtering non-spending transactions and recalculating summary
 */
export function sanitizeExtraction(
  payload: StatementExtractionInput,
): StatementExtractionInput {
  const spendTransactions = payload.transactions.filter((tx) => tx.amount < 0);
  const filteredCount = payload.transactions.length - spendTransactions.length;

  const totalSpend = spendTransactions.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  const warnings = [...(payload.warnings?.filter(Boolean) ?? [])];
  if (filteredCount > 0) {
    warnings.push(`Filtered ${filteredCount} non-spending transactions (amount >= 0).`);
  }

  return {
    ...payload,
    transactions: spendTransactions,
    summary: {
      transactions: spendTransactions.length,
      total_spend: Number(totalSpend.toFixed(2)),
      currency: payload.summary.currency,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate and sanitize extraction payload
 * @throws {ZodError} If payload doesn't match schema
 */
export function validateExtraction(payload: StatementExtraction): StatementExtractionInput {
  const parsed = statementExtractionSchema.parse(payload);
  return sanitizeExtraction(parsed);
}
