import { NextResponse } from "next/server";

import {
  createOrUpdateTransaction,
  deleteTransaction,
  listTransactionMonths,
  loadTransactionFile,
} from "@/lib/data-store";
import { transactionUpsertSchema } from "@/lib/schemas";
import { generateTransactionId } from "@/lib/ids";
import { TransactionRecord } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const cardId = searchParams.get("cardId");
  const ownerId = searchParams.get("ownerId");
  const categoryId = searchParams.get("categoryId");

  const months = await listTransactionMonths();
  if (months.length === 0) {
    return NextResponse.json({ month: null, transactions: [] });
  }
  const month = monthParam ?? months[0];
  const file = await loadTransactionFile(month);
  if (!file) {
    return NextResponse.json({ month, transactions: [] });
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

  return NextResponse.json({
    month,
    meta: file.meta,
    transactions,
  });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = transactionUpsertSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
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

  const saved = await createOrUpdateTransaction(input.month, record);
  return NextResponse.json({ transaction: saved }, { status: 201 });
}

export async function DELETE(request: Request) {
  const payload = await request.json();
  const { month, transactionId } = payload ?? {};
  if (!month || !transactionId) {
    return NextResponse.json({ error: "month and transactionId required" }, { status: 400 });
  }

  await deleteTransaction(month, transactionId);
  return NextResponse.json({ ok: true });
}
