import type { NextRequest } from "next/server";
import { z } from "zod";

import { deleteCategory, getCategories, upsertCategory } from "@/lib/data-store";
import { errorResponse, validateRequestBody, successResponse } from "@/lib/api-utils";
import { ErrorFactory } from "@/lib/errors";
import { requireUserId } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const params = await context.params;
    const id = params.id;
    const data = await validateRequestBody(request, updateSchema);

    const categories = await getCategories(userId);
    const existing = categories.find((category) => category.id === id);
    if (!existing) {
      throw ErrorFactory.notFound(`Category ${id}`);
    }

    const updated = await upsertCategory(userId, {
      id,
      name: data.name ?? existing.name,
      color: data.color ?? existing.color,
    });

    return successResponse({ category: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const params = await context.params;
    const id = params.id;
    await deleteCategory(userId, id);
    return successResponse({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
