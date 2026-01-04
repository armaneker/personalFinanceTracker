import { eq, and, desc } from "drizzle-orm";

import { db } from "../index";
import { fxRates } from "../schema";
import type { FxRate, NewFxRate } from "../schema";

// Default user ID for single-user mode (will be replaced with actual auth)
const DEFAULT_USER_ID = "default-user";

/**
 * FX rate source types
 */
export type FxRateSource = "api" | "manual" | "fallback";

/**
 * Parameters for saving an FX rate
 */
export interface SaveFxRateParams {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  date: string; // YYYY-MM-DD
  source: FxRateSource;
}

/**
 * Generate a unique ID for an FX rate entry
 */
function generateFxRateId(base: string, target: string, date: string): string {
  return `fx-${base}-${target}-${date}`;
}

/**
 * Get a cached FX rate for a specific date
 */
export async function getRate(
  userId: string = DEFAULT_USER_ID,
  baseCurrency: string,
  targetCurrency: string,
  date: string,
): Promise<FxRate | null> {
  const result = await db
    .select()
    .from(fxRates)
    .where(
      and(
        eq(fxRates.userId, userId),
        eq(fxRates.baseCurrency, baseCurrency.toUpperCase()),
        eq(fxRates.targetCurrency, targetCurrency.toUpperCase()),
        eq(fxRates.date, date),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Save an FX rate to the cache
 */
export async function saveRate(
  userId: string = DEFAULT_USER_ID,
  params: SaveFxRateParams,
): Promise<FxRate> {
  const base = params.baseCurrency.toUpperCase();
  const target = params.targetCurrency.toUpperCase();
  const id = generateFxRateId(base, target, params.date);
  const now = new Date().toISOString();

  const newRate: NewFxRate = {
    id,
    baseCurrency: base,
    targetCurrency: target,
    rate: params.rate,
    date: params.date,
    source: params.source,
    fetchedAt: now,
    userId,
  };

  // Use upsert - on conflict, update the rate
  const existing = await getRate(userId, base, target, params.date);
  if (existing) {
    await db
      .update(fxRates)
      .set({
        rate: params.rate,
        source: params.source,
        fetchedAt: now,
      })
      .where(eq(fxRates.id, id));

    return { ...existing, rate: params.rate, source: params.source, fetchedAt: now };
  }

  await db.insert(fxRates).values(newRate);
  return newRate as FxRate;
}

/**
 * Get the most recent FX rate for a currency pair (for fallback)
 */
export async function getLatestRate(
  userId: string = DEFAULT_USER_ID,
  baseCurrency: string,
  targetCurrency: string,
): Promise<FxRate | null> {
  const result = await db
    .select()
    .from(fxRates)
    .where(
      and(
        eq(fxRates.userId, userId),
        eq(fxRates.baseCurrency, baseCurrency.toUpperCase()),
        eq(fxRates.targetCurrency, targetCurrency.toUpperCase()),
      ),
    )
    .orderBy(desc(fxRates.date))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get all cached rates for a user
 */
export async function getAllRates(userId: string = DEFAULT_USER_ID): Promise<FxRate[]> {
  return db
    .select()
    .from(fxRates)
    .where(eq(fxRates.userId, userId))
    .orderBy(desc(fxRates.date));
}

/**
 * Delete old FX rates (older than specified days)
 */
export async function deleteOldRates(
  userId: string = DEFAULT_USER_ID,
  daysToKeep: number = 90,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  // Get count before delete
  const toDelete = await db
    .select()
    .from(fxRates)
    .where(and(eq(fxRates.userId, userId)));

  const oldRates = toDelete.filter((r) => r.date < cutoffStr);

  for (const rate of oldRates) {
    await db.delete(fxRates).where(eq(fxRates.id, rate.id));
  }

  return oldRates.length;
}
