import { NextResponse } from "next/server";
import { z } from "zod";

import { getCategories, upsertCategory } from "@/lib/data-store";
import { slugifyId } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, color } = parsed.data;
  const id = slugifyId(name, "cat");
  const category = await upsertCategory({ id, name, color });

  return NextResponse.json({ category }, { status: 201 });
}
