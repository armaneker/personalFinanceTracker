import { NextResponse } from "next/server";

import { buildDashboardSummary } from "@/lib/analytics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? undefined;

  const summary = await buildDashboardSummary(month);
  if (!summary) {
    return NextResponse.json({ summary: null }, { status: 200 });
  }

  return NextResponse.json({ summary });
}
