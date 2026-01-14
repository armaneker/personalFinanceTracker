import { eq, and } from "drizzle-orm";

import { db } from "../index";
import { categories } from "../schema";
import type { Category as CategoryEntity } from "../schema";
import type { Category } from "@/lib/types";

/**
 * Convert database entity to API type
 */
function toApiType(entity: CategoryEntity): Category {
  return {
    id: entity.id,
    name: entity.name,
    color: entity.color ?? undefined,
  };
}

/**
 * Get all categories for a user
 */
export async function getCategories(userId: string): Promise<Category[]> {
  const result = await db.select().from(categories).where(eq(categories.userId, userId));
  return result.map(toApiType);
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(
  userId: string,
  categoryId: string,
): Promise<Category | null> {
  const result = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return toApiType(result[0]);
}

/**
 * Save all categories (replace all)
 */
export async function saveCategories(
  userId: string,
  newCategories: Category[],
): Promise<void> {
  const now = new Date().toISOString();

  // Delete all existing categories for user
  // Note: This will fail if transactions reference these categories
  try {
    await db.delete(categories).where(eq(categories.userId, userId));
  } catch (deleteError) {
    console.error("[saveCategories] Failed to delete existing categories:", deleteError);
    // If delete fails (e.g., FK constraint from transactions), skip delete and use upsert instead
    console.log("[saveCategories] Falling back to upsert mode");
    for (const cat of newCategories) {
      await upsertCategoryInternal(userId, cat, now);
    }
    return;
  }

  // Insert all new categories
  if (newCategories.length > 0) {
    try {
      await db.insert(categories).values(
        newCategories.map((cat) => ({
          id: cat.id,
          userId,
          name: cat.name,
          color: cat.color ?? null,
          createdAt: now,
          updatedAt: now,
        })),
      );
    } catch (insertError) {
      const errorMessage = insertError instanceof Error ? insertError.message : String(insertError);
      console.error("[saveCategories] Failed to insert categories:", errorMessage);
      console.error("[saveCategories] Full error:", insertError);
      throw insertError;
    }
  }
}

/**
 * Internal upsert helper for fallback mode
 */
async function upsertCategoryInternal(userId: string, category: Category, now: string): Promise<void> {
  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, category.id), eq(categories.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(categories)
      .set({
        name: category.name,
        color: category.color ?? null,
        updatedAt: now,
      })
      .where(and(eq(categories.id, category.id), eq(categories.userId, userId)));
  } else {
    await db.insert(categories).values({
      id: category.id,
      userId,
      name: category.name,
      color: category.color ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Create or update a category
 */
export async function upsertCategory(
  userId: string,
  category: Category,
): Promise<Category> {
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, category.id), eq(categories.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Update
    await db
      .update(categories)
      .set({
        name: category.name,
        color: category.color ?? null,
        updatedAt: now,
      })
      .where(and(eq(categories.id, category.id), eq(categories.userId, userId)));
  } else {
    // Insert
    await db.insert(categories).values({
      id: category.id,
      userId,
      name: category.name,
      color: category.color ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  return category;
}

/**
 * Delete a category
 */
export async function deleteCategory(
  userId: string,
  categoryId: string,
): Promise<void> {
  const result = await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .returning({ id: categories.id });

  if (result.length === 0) {
    throw new Error(`Category ${categoryId} not found`);
  }
}
