import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { approvePendingRun, discardPendingRun, getPendingRunDetail } from "@/lib/importer";

const overridesSchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    ownerId: z.string().optional(),
    cardId: z.string().optional(),
    statementFile: z.string().optional(),
  })
  .optional();

export async function POST(
  request: NextRequest,
  context: { params: { runId: string } | Promise<{ runId: string }> },
) {
  const params = await context.params;
  const runId = params.runId;
  const payload = await request.json().catch(() => ({}));
  const parsed = overridesSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await approvePendingRun(runId, parsed.data ?? undefined);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: { runId: string } | Promise<{ runId: string }> },
) {
  const params = await context.params;
  const runId = params.runId;
  try {
    const detail = await getPendingRunDetail(runId);
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { runId: string } | Promise<{ runId: string }> },
) {
  const params = await context.params;
  const runId = params.runId;
  try {
    const result = await discardPendingRun(runId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
