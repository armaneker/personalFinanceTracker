import { eq, and } from "drizzle-orm";

import { db } from "../index";
import { cards } from "../schema";
import type { Card as CardEntity } from "../schema";
import type { Card } from "@/lib/types";

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
 * Get all cards for a user
 */
export async function getCards(userId: string): Promise<Card[]> {
  const result = await db.select().from(cards).where(eq(cards.userId, userId));
  return result.map(toApiType);
}

/**
 * Get a single card by ID
 */
export async function getCardById(
  userId: string,
  cardId: string,
): Promise<Card | null> {
  const result = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return toApiType(result[0]);
}

/**
 * Create or update a card
 */
export async function upsertCard(userId: string, card: Card): Promise<Card> {
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, card.id), eq(cards.userId, userId)))
    .limit(1);

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
      .where(and(eq(cards.id, card.id), eq(cards.userId, userId)));
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
export async function deleteCard(userId: string, cardId: string): Promise<void> {
  const result = await db
    .delete(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .returning({ id: cards.id });

  if (result.length === 0) {
    throw new Error(`Card ${cardId} not found`);
  }
}
