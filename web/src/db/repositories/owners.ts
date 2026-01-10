import { eq, and } from "drizzle-orm";

import { db } from "../index";
import { owners } from "../schema";
import type { Owner as OwnerEntity } from "../schema";
import type { Owner } from "@/lib/types";

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
 * Get all owners for a user
 */
export async function getOwners(userId: string): Promise<Owner[]> {
  const result = await db.select().from(owners).where(eq(owners.userId, userId));
  return result.map(toApiType);
}

/**
 * Get a single owner by ID
 */
export async function getOwnerById(
  userId: string,
  ownerId: string,
): Promise<Owner | null> {
  const result = await db
    .select()
    .from(owners)
    .where(and(eq(owners.id, ownerId), eq(owners.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return toApiType(result[0]);
}

/**
 * Create or update an owner
 */
export async function upsertOwner(
  userId: string,
  owner: Owner,
): Promise<Owner> {
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(owners)
    .where(and(eq(owners.id, owner.id), eq(owners.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Update
    await db
      .update(owners)
      .set({
        label: owner.label,
        updatedAt: now,
      })
      .where(and(eq(owners.id, owner.id), eq(owners.userId, userId)));
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
  userId: string,
  ownerId: string,
): Promise<void> {
  const result = await db
    .delete(owners)
    .where(and(eq(owners.id, ownerId), eq(owners.userId, userId)))
    .returning({ id: owners.id });

  if (result.length === 0) {
    throw new Error(`Owner ${ownerId} not found`);
  }
}
