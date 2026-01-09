import { z } from "zod";

import { getCategories, upsertCategory } from "@/lib/data-store";
import { slugifyId } from "@/lib/utils";
import { errorResponse, validateRequestBody, successResponse, createdResponse } from "@/lib/api-utils";

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

export async function GET() {
  try {
    const categories = await getCategories();
    return successResponse({ categories });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { name, color } = await validateRequestBody(request, createSchema);
    const id = slugifyId(name, "cat");
    const category = await upsertCategory({ id, name, color });

    return createdResponse({ category });
  } catch (error) {
    return errorResponse(error);
  }
}
