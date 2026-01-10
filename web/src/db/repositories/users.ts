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

  await db.insert(users).values(newUser);

  const created = await getUserById(user.id);
  if (!created) {
    throw new Error("Failed to create user");
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
