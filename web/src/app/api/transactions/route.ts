import {
  createOrUpdateTransaction,
  deleteTransaction,
  listTransactionMonths,
  loadTransactionFile,
} from "@/lib/data-store";
import { transactionUpsertSchema } from "@/lib/schemas";
import { generateTransactionId } from "@/lib/ids";
import { TransactionRecord } from "@/lib/types";
import { errorResponse, validateRequestBody, successResponse, createdResponse } from "@/lib/api-utils";
import { ErrorFactory } from "@/lib/errors";
import { requireUserId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const cardId = searchParams.get("cardId");
    const ownerId = searchParams.get("ownerId");
    const categoryId = searchParams.get("categoryId");

    const months = await listTransactionMonths(userId);
    if (months.length === 0) {
      return successResponse({ month: null, transactions: [] });
    }
    const month = monthParam ?? months[0];
    const file = await loadTransactionFile(userId, month);
    if (!file) {
      return successResponse({ month, transactions: [] });
    }

    let transactions = file.transactions;
    if (cardId) {
      transactions = transactions.filter((tx) => tx.card_id === cardId);
    }
    if (ownerId) {
      transactions = transactions.filter((tx) => tx.owner_id === ownerId);
    }
    if (categoryId) {
      transactions = transactions.filter((tx) => tx.category_id === categoryId);
    }

    return successResponse({
      month,
      meta: file.meta,
      transactions,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const input = await validateRequestBody(request, transactionUpsertSchema);
    const now = new Date().toISOString();

    const record: TransactionRecord = {
      id: input.id ?? generateTransactionId(input.month),
      card_id: input.card_id ?? "unknown-card",
      statement_ref: input.statement_ref ?? "manual-entry",
      owner_id: input.owner_id ?? "owner-arman",
      category_id: input.category_id ?? "cat-other",
      llm_category_id: input.llm_category_id ?? input.category_id ?? "cat-other",
      amount: input.amount!,
      currency: input.currency ?? "TRY",
      transaction_date: input.transaction_date!,
      post_date: input.post_date,
      merchant: input.merchant ?? "Unknown",
      description: input.description,
      notes: input.notes,
      source_llm: input.source_llm,
      created_at: input.created_at ?? now,
      updated_at: now,
      flags: input.flags ?? { review: false, duplicate: false },
    };

    const saved = await createOrUpdateTransaction(userId, input.month, record);
    return createdResponse({ transaction: saved });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json();
    const { month, transactionId } = payload ?? {};
    if (!month || !transactionId) {
      throw ErrorFactory.validationError("month and transactionId are required");
    }

    await deleteTransaction(userId, month, transactionId);
    return successResponse({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
