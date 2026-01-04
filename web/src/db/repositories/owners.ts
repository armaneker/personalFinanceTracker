import { eq } from "drizzle-orm";

import { db } from "../index";
import { owners } from "../schema";
import type { Owner as OwnerEntity } from "../schema";
import type { Owner } from "@/lib/types";

// Default user ID for single-user mode (will be replaced with actual auth)
const DEFAULT_USER_ID = "default-user";

/**
 * Convert database entity to API type
 */
function toApiType(entity: OwnerEntity): Owner {
  return {
    id: entity.id,
    label: entity.label,
  };
}

/**
 * Get all owners for the current user
 */
export async function getOwners(userId: string = DEFAULT_USER_ID): Promise<Owner[]> {
  const result = await db.select().from(owners).where(eq(owners.userId, userId));
  return result.map(toApiType);
}

/**
 * Get a single owner by ID
 */
export async function getOwnerById(
  ownerId: string,
  userId: string = DEFAULT_USER_ID,
): Promise<Owner | null> {
  const result = await db
    .select()
    .from(owners)
    .where(eq(owners.id, ownerId))
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
 * Create or update an owner
 */
export async function upsertOwner(
  owner: Owner,
  userId: string = DEFAULT_USER_ID,
): Promise<Owner> {
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(owners)
    .where(eq(owners.id, owner.id))
    .limit(1);

  if (existing.length > 0) {
    // Update
    await db
      .update(owners)
      .set({
        label: owner.label,
        updatedAt: now,
      })
      .where(eq(owners.id, owner.id));
  } else {
    // Insert
    await db.insert(owners).values({
      id: owner.id,
      userId,
      label: owner.label,
      createdAt: now,
      updatedAt: now,
    });
  }

  return owner;
}

/**
 * Delete an owner
 */
export async function deleteOwner(
  ownerId: string,
  _userId: string = DEFAULT_USER_ID,
): Promise<void> {
  // TODO: Add user ownership check when multi-tenancy is enabled
  const result = await db
    .delete(owners)
    .where(eq(owners.id, ownerId))
    .returning({ id: owners.id });

  if (result.length === 0) {
    throw new Error(`Owner ${ownerId} not found`);
  }
}
