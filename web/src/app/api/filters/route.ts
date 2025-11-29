import { NextResponse } from "next/server";

import { getDistinctFilters } from "@/lib/analytics";

export async function GET() {
  const filters = await getDistinctFilters();
  return NextResponse.json(filters);
}
