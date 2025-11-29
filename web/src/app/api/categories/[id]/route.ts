import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { deleteCategory, getCategories, upsertCategory } from "@/lib/data-store";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const params = await context.params;
  const id = params.id;
  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const categories = await getCategories();
  const existing = categories.find((category) => category.id === id);
  if (!existing) {
    return NextResponse.json({ error: `Category ${id} not found` }, { status: 404 });
  }

  const updated = await upsertCategory({
    id,
    name: parsed.data.name ?? existing.name,
    color: parsed.data.color ?? existing.color,
  });

  return NextResponse.json({ category: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const params = await context.params;
  const id = params.id;
  try {
    await deleteCategory(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
