import { eq } from "drizzle-orm";

import { db } from "../index";
import { cards } from "../schema";
import type { Card as CardEntity } from "../schema";
import type { Card } from "@/lib/types";

// Default user ID for single-user mode (will be replaced with actual auth)
const DEFAULT_USER_ID = "default-user";

/**
 * Convert database entity to API type
 */
function toApiType(entity: CardEntity): Card {
  return {
    id: entity.id,
    name: entity.name,
    issuer: entity.issuer,
    last4: entity.last4,
    currency: entity.currency,
  };
}

/**
 * Get all cards for the current user
 */
export async function getCards(userId: string = DEFAULT_USER_ID): Promise<Card[]> {
  const result = await db.select().from(cards).where(eq(cards.userId, userId));
  return result.map(toApiType);
}

/**
 * Get a single card by ID
 */
export async function getCardById(
  cardId: string,
  userId: string = DEFAULT_USER_ID,
): Promise<Card | null> {
  const result = await db
    .select()
    .from(cards)
    .where(eq(cards.id, cardId))
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
 * Create or update a card
 */
export async function upsertCard(card: Card, userId: string = DEFAULT_USER_ID): Promise<Card> {
  const now = new Date().toISOString();

  const existing = await db.select().from(cards).where(eq(cards.id, card.id)).limit(1);

  if (existing.length > 0) {
    // Update
    await db
      .update(cards)
      .set({
        name: card.name,
        issuer: card.issuer,
        last4: card.last4,
        currency: card.currency,
        updatedAt: now,
      })
      .where(eq(cards.id, card.id));
  } else {
    // Insert
    await db.insert(cards).values({
      id: card.id,
      userId,
      name: card.name,
      issuer: card.issuer,
      last4: card.last4,
      currency: card.currency,
      createdAt: now,
      updatedAt: now,
    });
  }

  return card;
}

/**
 * Delete a card
 */
export async function deleteCard(cardId: string, _userId: string = DEFAULT_USER_ID): Promise<void> {
  // TODO: Add user ownership check when multi-tenancy is enabled
  const result = await db
    .delete(cards)
    .where(eq(cards.id, cardId))
    .returning({ id: cards.id });

  if (result.length === 0) {
    throw new Error(`Card ${cardId} not found`);
  }
}
