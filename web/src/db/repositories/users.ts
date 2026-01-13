import { eq } from "drizzle-orm";

import { db } from "../index";
import { users } from "../schema";
import type { User, NewUser } from "../schema";

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get a user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Create a new user
 */
export async function createUser(user: NewUser): Promise<User> {
  const now = new Date().toISOString();
  const newUser: NewUser = {
    ...user,
    createdAt: now,
    updatedAt: now,
  };

  try {
    // Perform the insert and capture the result to ensure it executes
    const insertResult = await db.insert(users).values(newUser);

    // For libsql/turso, check if rows were affected (available in some drivers)
    // The insert should not silently fail
    if (insertResult && typeof insertResult === 'object' && 'rowsAffected' in insertResult) {
      if ((insertResult as { rowsAffected: number }).rowsAffected === 0) {
        throw new Error("Insert did not affect any rows");
      }
    }
  } catch (error) {
    // Re-throw with more context for debugging
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to insert user into database: ${message}`);
  }

  // Verify the user was actually created by fetching it back
  const created = await getUserById(user.id);
  if (!created) {
    throw new Error("User was not persisted to database after insert");
  }

  // Verify all required fields are present
  if (!created.passwordHash) {
    // Clean up the incomplete record
    await db.delete(users).where(eq(users.id, user.id));
    throw new Error("User record is missing password hash - database schema may be out of sync");
  }

  return created;
}

/**
 * Update a user
 */
export async function updateUser(
  userId: string,
  updates: Partial<Pick<User, "name" | "email">>
): Promise<User | null> {
  const now = new Date().toISOString();

  await db
    .update(users)
    .set({
      ...updates,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  return getUserById(userId);
}

/**
 * Update a user's password
 */
export async function updateUserPassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  const now = new Date().toISOString();

  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: now,
    })
    .where(eq(users.id, userId));
}
