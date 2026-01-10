import type { NextRequest } from "next/server";
import { z } from "zod";

import { approvePendingRun, discardPendingRun, getPendingRunDetail } from "@/lib/importer";
import { errorResponse, validateRequestBody, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";

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
  try {
    const userId = await requireUserId();
    const params = await context.params;
    const runId = params.runId;
    const payload = await request.json().catch(() => ({}));
    const data = await validateRequestBody(
      new Request(request.url, { method: 'POST', body: JSON.stringify(payload) }),
      overridesSchema
    ).catch(() => undefined);

    const result = await approvePendingRun(userId, runId, data ?? undefined);
    return successResponse({ ok: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: { runId: string } | Promise<{ runId: string }> },
) {
  try {
    const userId = await requireUserId();
    const params = await context.params;
    const runId = params.runId;
    const detail = await getPendingRunDetail(userId, runId);
    return successResponse(detail);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { runId: string } | Promise<{ runId: string }> },
) {
  try {
    const userId = await requireUserId();
    const params = await context.params;
    const runId = params.runId;
    const result = await discardPendingRun(userId, runId);
    return successResponse({ ok: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}
