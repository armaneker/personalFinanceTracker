import { eq } from "drizzle-orm";

import { db } from "../index";
import { categories } from "../schema";
import type { Category as CategoryEntity } from "../schema";
import type { Category } from "@/lib/types";

// Default user ID for single-user mode (will be replaced with actual auth)
const DEFAULT_USER_ID = "default-user";

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
 * Get all categories for the current user
 */
export async function getCategories(userId: string = DEFAULT_USER_ID): Promise<Category[]> {
  const result = await db.select().from(categories).where(eq(categories.userId, userId));
  return result.map(toApiType);
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(
  categoryId: string,
  userId: string = DEFAULT_USER_ID,
): Promise<Category | null> {
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  // Verify user ownership
  if (result[0].userId !== userId) {
    return null;
  }

  return toApiType(result[0]);
}

/**
 * Save all categories (replace all)
 */
export async function saveCategories(
  newCategories: Category[],
  userId: string = DEFAULT_USER_ID,
): Promise<void> {
  const now = new Date().toISOString();

  // Delete all existing categories for user
  await db.delete(categories).where(eq(categories.userId, userId));

  // Insert all new categories
  if (newCategories.length > 0) {
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
  }
}

/**
 * Create or update a category
 */
export async function upsertCategory(
  category: Category,
  userId: string = DEFAULT_USER_ID,
): Promise<Category> {
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.id, category.id))
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
      .where(eq(categories.id, category.id));
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
  categoryId: string,
  _userId: string = DEFAULT_USER_ID,
): Promise<void> {
  // TODO: Add user ownership check when multi-tenancy is enabled
  const result = await db
    .delete(categories)
    .where(eq(categories.id, categoryId))
    .returning({ id: categories.id });

  if (result.length === 0) {
    throw new Error(`Category ${categoryId} not found`);
  }
}
