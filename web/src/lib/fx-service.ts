import {
  getRate as getCachedRate,
  saveRate,
  getLatestRate,
  type FxRateSource,
} from "@/db/repositories/fx-rates";

// Rate limiting: max 1 request per second
let lastApiCallTime = 0;
const MIN_API_INTERVAL_MS = 1000;

// In-memory cache for the current session (to reduce database reads)
const memoryCache = new Map<string, { rate: number; timestamp: number }>();
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * FX conversion result
 */
export interface FxConversionResult {
  amount: number;
  currency: string;
  originalAmount: number;
  originalCurrency: string;
  fxRate: number;
  source: FxRateSource;
}

/**
 * FX API response from exchangerate.host
 */
interface ExchangeRateApiResponse {
  success?: boolean;
  base: string;
  date: string;
  rates?: Record<string, number>;
  error?: {
    code: number;
    type: string;
    info: string;
  };
}

/**
 * Generate cache key for a currency pair and date
 */
function getCacheKey(base: string, target: string, date: string): string {
  return `${base.toUpperCase()}-${target.toUpperCase()}-${date}`;
}

/**
 * Wait for rate limiting
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;

  if (timeSinceLastCall < MIN_API_INTERVAL_MS) {
    const waitTime = MIN_API_INTERVAL_MS - timeSinceLastCall;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
}

/**
 * Fetch rate from external API with rate limiting
 */
async function fetchRateFromApi(
  baseCurrency: string,
  targetCurrency: string,
  date: string,
): Promise<number | null> {
  await waitForRateLimit();

  try {
    lastApiCallTime = Date.now();

    const response = await fetch(
      `https://api.exchangerate.host/${date}?base=${baseCurrency.toUpperCase()}&symbols=${targetCurrency.toUpperCase()}`,
    );

    if (!response.ok) {
      console.error(`FX API returned ${response.status} for ${baseCurrency}/${targetCurrency}`);
      return null;
    }

    const data: ExchangeRateApiResponse = await response.json();

    if (data.error || !data.rates) {
      console.error("FX API error:", data.error ?? "No rates returned");
      return null;
    }

    const rate = data.rates[targetCurrency.toUpperCase()];
    if (rate === undefined) {
      console.error(`Rate not available for ${targetCurrency}`);
      return null;
    }

    return rate;
  } catch (error) {
    console.error("FX API fetch error:", error);
    return null;
  }
}

/**
 * Check memory cache for a rate
 */
function checkMemoryCache(base: string, target: string, date: string): number | null {
  const key = getCacheKey(base, target, date);
  const cached = memoryCache.get(key);

  if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL_MS) {
    return cached.rate;
  }

  return null;
}

/**
 * Set rate in memory cache
 */
function setMemoryCache(base: string, target: string, date: string, rate: number): void {
  const key = getCacheKey(base, target, date);
  memoryCache.set(key, { rate, timestamp: Date.now() });
}

/**
 * Get exchange rate with caching and fallback
 *
 * Priority:
 * 1. Memory cache (fast, for repeated lookups in same session)
 * 2. Database cache (persisted across restarts)
 * 3. External API (rate-limited to 1 req/sec)
 * 4. Fallback to last known rate if API fails
 */
export async function getRate(
  baseCurrency: string,
  targetCurrency: string,
  date: string,
  userId: string,
): Promise<{ rate: number; source: FxRateSource } | null> {
  const base = baseCurrency.toUpperCase();
  const target = targetCurrency.toUpperCase();

  // Same currency, no conversion needed
  if (base === target) {
    return { rate: 1, source: "api" };
  }

  // 1. Check memory cache
  const memoryCached = checkMemoryCache(base, target, date);
  if (memoryCached !== null) {
    return { rate: memoryCached, source: "api" }; // Source from original fetch
  }

  // 2. Check database cache
  const dbCached = await getCachedRate(userId, base, target, date);
  if (dbCached) {
    setMemoryCache(base, target, date, dbCached.rate);
    return { rate: dbCached.rate, source: dbCached.source as FxRateSource };
  }

  // 3. Fetch from API
  const apiRate = await fetchRateFromApi(base, target, date);
  if (apiRate !== null) {
    // Save to both caches
    await saveRate(userId, {
      baseCurrency: base,
      targetCurrency: target,
      rate: apiRate,
      date,
      source: "api",
    });
    setMemoryCache(base, target, date, apiRate);
    return { rate: apiRate, source: "api" };
  }

  // 4. Fallback to last known rate
  const fallbackRate = await getLatestRate(userId, base, target);
  if (fallbackRate) {
    console.warn(
      `Using fallback rate from ${fallbackRate.date} for ${base}/${target} on ${date}`,
    );

    // Save the fallback rate for this date (marked as fallback)
    await saveRate(userId, {
      baseCurrency: base,
      targetCurrency: target,
      rate: fallbackRate.rate,
      date,
      source: "fallback",
    });
    setMemoryCache(base, target, date, fallbackRate.rate);

    return { rate: fallbackRate.rate, source: "fallback" };
  }

  // No rate available
  return null;
}

/**
 * Get rate with fallback - throws if no rate available
 */
export async function getRateWithFallback(
  baseCurrency: string,
  targetCurrency: string,
  date: string,
  userId: string,
): Promise<{ rate: number; source: FxRateSource }> {
  const result = await getRate(baseCurrency, targetCurrency, date, userId);

  if (!result) {
    throw new Error(
      `Unable to get exchange rate for ${baseCurrency}/${targetCurrency} on ${date}. No cached rate available.`,
    );
  }

  return result;
}

/**
 * Set a manual exchange rate (overrides API rate)
 */
export async function setManualRate(
  baseCurrency: string,
  targetCurrency: string,
  rate: number,
  date: string,
  userId: string,
): Promise<void> {
  const base = baseCurrency.toUpperCase();
  const target = targetCurrency.toUpperCase();

  await saveRate(userId, {
    baseCurrency: base,
    targetCurrency: target,
    rate,
    date,
    source: "manual",
  });

  setMemoryCache(base, target, date, rate);
}

/**
 * Convert amount from one currency to another
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: string,
  userId: string,
): Promise<FxConversionResult> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // Same currency, no conversion needed
  if (from === to) {
    return {
      amount,
      currency: to,
      originalAmount: amount,
      originalCurrency: from,
      fxRate: 1,
      source: "api",
    };
  }

  const rateResult = await getRateWithFallback(from, to, date, userId);

  return {
    amount: Number((amount * rateResult.rate).toFixed(2)),
    currency: to,
    originalAmount: amount,
    originalCurrency: from,
    fxRate: rateResult.rate,
    source: rateResult.source,
  };
}

/**
 * Clear memory cache (useful for testing)
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Reset rate limiter (useful for testing)
 */
export function resetRateLimiter(): void {
  lastApiCallTime = 0;
}
