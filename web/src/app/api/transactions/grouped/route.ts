import { NextResponse } from "next/server";

import { getTransactionsGroupedByCard } from "@/lib/analytics";

export async function GET() {
  const grouped = await getTransactionsGroupedByCard();
  return NextResponse.json({ grouped });
}
