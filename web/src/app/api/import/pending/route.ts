import { NextResponse } from "next/server";

import { listPendingRunSummaries } from "@/lib/importer";

export async function GET() {
  const pending = await listPendingRunSummaries();
  return NextResponse.json({ pending });
}
