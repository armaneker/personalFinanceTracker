import { NextResponse } from "next/server";

import { getCards, getCategories, getOwners, listTransactionMonths } from "@/lib/data-store";

export async function GET() {
  const [cards, owners, categories, months] = await Promise.all([
    getCards(),
    getOwners(),
    getCategories(),
    listTransactionMonths(),
  ]);

  return NextResponse.json({
    cards,
    owners,
    categories,
    months,
  });
}
