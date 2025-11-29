import { NextResponse } from "next/server";

import { getImportHistory } from "@/lib/data-store";

export async function GET() {
  const history = await getImportHistory();
  return NextResponse.json({ history });
}
