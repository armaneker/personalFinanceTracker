import {
  getRate as getCachedRate,
  saveRate,
  getLatestRate,
  type FxRateSource,
} from "@/db/repositories/fx-rates";

// System-wide userId for FX rates (not user-specific)
const SYSTEM_USER_ID = "system";

// Rate limiting: max 1 request per second
let lastApiCallTime = 0;
const MIN_API_INTERVAL_MS = 1000;

// In-memory cache for the current session (to reduce database reads)
const memoryCache = new Map<string, { rate: number; timestamp: number }>();
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Hardcoded fallback rates for common currency pairs (as of Jan 2026)
// These are used only when all other sources fail
const HARDCODED_FALLBACK_RATES: Record<string, number> = {
  "USD-TRY": 35.5,
  "EUR-TRY": 38.5,
  "GBP-TRY": 44.5,
  "CHF-TRY": 39.5,
  "JPY-TRY": 0.23,
  "AUD-TRY": 22.5,
  "CAD-TRY": 25.0,
  "SEK-TRY": 3.2,
  "NOK-TRY": 3.1,
  "DKK-TRY": 5.2,
};

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
 * Parse TCMB XML response and extract rate for a currency
 */
function parseTcmbXml(xml: string, currencyCode: string): number | null {
  // Find the currency entry in XML
  const currencyRegex = new RegExp(
    `<Currency[^>]*CurrencyCode="${currencyCode}"[^>]*>([\\s\\S]*?)</Currency>`,
    "i"
  );
  const match = xml.match(currencyRegex);

  if (!match) {
    console.error(`[TCMB] Currency ${currencyCode} not found in response`);
    return null;
  }

  const currencyBlock = match[1];

  // Extract ForexSelling rate (the rate bank sells foreign currency for TRY)
  const forexSellingMatch = currencyBlock.match(/<ForexSelling>([0-9.]+)<\/ForexSelling>/);
  if (!forexSellingMatch) {
    console.error(`[TCMB] ForexSelling not found for ${currencyCode}`);
    return null;
  }

  const rate = parseFloat(forexSellingMatch[1]);
  if (isNaN(rate)) {
    console.error(`[TCMB] Invalid rate value for ${currencyCode}`);
    return null;
  }

  // Check for Unit (some currencies like JPY use 100 as unit)
  const unitMatch = currencyBlock.match(/<Unit>([0-9]+)<\/Unit>/);
  const unit = unitMatch ? parseInt(unitMatch[1], 10) : 1;

  // Return rate per single unit
  return rate / unit;
}

/**
 * Fetch rate from TCMB (Central Bank of Turkey)
 *
 * TCMB API:
 * - Today: https://www.tcmb.gov.tr/kurlar/today.xml
 * - Historical: https://www.tcmb.gov.tr/kurlar/YYMM/DDMMYY.xml
 *
 * Note: TCMB provides rates against TRY, so we only support X/TRY conversions
 */
async function fetchRateFromTcmb(
  baseCurrency: string,
  targetCurrency: string,
  date: string,
): Promise<number | null> {
  // TCMB only provides rates against TRY
  if (targetCurrency.toUpperCase() !== "TRY") {
    console.warn(`[TCMB] Only supports conversion to TRY, requested ${targetCurrency}`);
    return null;
  }

  // TRY to TRY is 1:1
  if (baseCurrency.toUpperCase() === "TRY") {
    return 1;
  }

  await waitForRateLimit();

  try {
    lastApiCallTime = Date.now();

    // Determine which endpoint to use
    const today = new Date().toISOString().slice(0, 10);
    let url: string;

    if (date === today) {
      url = "https://www.tcmb.gov.tr/kurlar/today.xml";
    } else {
      // Historical: format is YYMM/DDMMYY.xml
      const [year, month, day] = date.split("-");
      const yy = year.slice(2);
      url = `https://www.tcmb.gov.tr/kurlar/${yy}${month}/${day}${month}${yy}.xml`;
    }

    console.log(`[TCMB] Fetching rate from: ${url}`);

    const response = await fetch(url, {
      headers: {
        "Accept": "application/xml",
        "User-Agent": "PersonalFinanceTracker/1.0",
      },
    });

    if (!response.ok) {
      // TCMB returns 404 on weekends/holidays
      if (response.status === 404) {
        console.warn(`[TCMB] No data for ${date} (likely weekend/holiday)`);
        return null;
      }
      console.error(`[TCMB] API returned ${response.status}`);
      return null;
    }

    const xml = await response.text();
    return parseTcmbXml(xml, baseCurrency.toUpperCase());
  } catch (error) {
    console.error("[TCMB] Fetch error:", error);
    return null;
  }
}

/**
 * Try to fetch rate for nearby dates (for weekends/holidays)
 */
async function fetchRateWithDateFallback(
  baseCurrency: string,
  targetCurrency: string,
  date: string,
): Promise<{ rate: number; actualDate: string } | null> {
  // Try the requested date first
  const rate = await fetchRateFromTcmb(baseCurrency, targetCurrency, date);
  if (rate !== null) {
    return { rate, actualDate: date };
  }

  // Try previous days (up to 5 days back for weekends/holidays)
  const dateObj = new Date(date);
  for (let i = 1; i <= 5; i++) {
    dateObj.setDate(dateObj.getDate() - 1);
    const prevDate = dateObj.toISOString().slice(0, 10);
    console.log(`[TCMB] Trying fallback date: ${prevDate}`);

    const prevRate = await fetchRateFromTcmb(baseCurrency, targetCurrency, prevDate);
    if (prevRate !== null) {
      console.log(`[TCMB] Found rate for ${prevDate}: ${prevRate}`);
      return { rate: prevRate, actualDate: prevDate };
    }
  }

  return null;
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
 * Get hardcoded fallback rate
 */
function getHardcodedFallback(base: string, target: string): number | null {
  const key = `${base.toUpperCase()}-${target.toUpperCase()}`;
  return HARDCODED_FALLBACK_RATES[key] ?? null;
}

/**
 * Get exchange rate with caching and fallback (SYSTEM-WIDE)
 *
 * Priority:
 * 1. Memory cache (fast, for repeated lookups in same session)
 * 2. Database cache (persisted across restarts)
 * 3. TCMB API (with date fallback for weekends/holidays)
 * 4. Last known rate from database
 * 5. Hardcoded fallback rates
 */
export async function getRate(
  baseCurrency: string,
  targetCurrency: string,
  date: string,
  _userId?: string, // Kept for API compatibility but ignored
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
    return { rate: memoryCached, source: "api" };
  }

  // 2. Check database cache (system-wide)
  const dbCached = await getCachedRate(SYSTEM_USER_ID, base, target, date);
  if (dbCached) {
    setMemoryCache(base, target, date, dbCached.rate);
    return { rate: dbCached.rate, source: dbCached.source as FxRateSource };
  }

  // 3. Fetch from TCMB API (with date fallback)
  const tcmbResult = await fetchRateWithDateFallback(base, target, date);
  if (tcmbResult !== null) {
    // Save to both caches
    await saveRate(SYSTEM_USER_ID, {
      baseCurrency: base,
      targetCurrency: target,
      rate: tcmbResult.rate,
      date,
      source: "api",
    });
    setMemoryCache(base, target, date, tcmbResult.rate);
    return { rate: tcmbResult.rate, source: "api" };
  }

  // 4. Fallback to last known rate from database
  const fallbackRate = await getLatestRate(SYSTEM_USER_ID, base, target);
  if (fallbackRate) {
    console.warn(
      `[FX] Using fallback rate from ${fallbackRate.date} for ${base}/${target} on ${date}`,
    );

    await saveRate(SYSTEM_USER_ID, {
      baseCurrency: base,
      targetCurrency: target,
      rate: fallbackRate.rate,
      date,
      source: "fallback",
    });
    setMemoryCache(base, target, date, fallbackRate.rate);

    return { rate: fallbackRate.rate, source: "fallback" };
  }

  // 5. Last resort: hardcoded fallback
  const hardcodedRate = getHardcodedFallback(base, target);
  if (hardcodedRate !== null) {
    console.warn(
      `[FX] Using hardcoded fallback rate for ${base}/${target}: ${hardcodedRate}`,
    );

    await saveRate(SYSTEM_USER_ID, {
      baseCurrency: base,
      targetCurrency: target,
      rate: hardcodedRate,
      date,
      source: "fallback",
    });
    setMemoryCache(base, target, date, hardcodedRate);

    return { rate: hardcodedRate, source: "fallback" };
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
  _userId?: string, // Kept for API compatibility but ignored
): Promise<{ rate: number; source: FxRateSource }> {
  const result = await getRate(baseCurrency, targetCurrency, date);

  if (!result) {
    throw new Error(
      `Unable to get exchange rate for ${baseCurrency}/${targetCurrency} on ${date}. No cached rate available.`,
    );
  }

  return result;
}

/**
 * Set a manual exchange rate (overrides API rate) - SYSTEM-WIDE
 */
export async function setManualRate(
  baseCurrency: string,
  targetCurrency: string,
  rate: number,
  date: string,
  _userId?: string, // Kept for API compatibility but ignored
): Promise<void> {
  const base = baseCurrency.toUpperCase();
  const target = targetCurrency.toUpperCase();

  await saveRate(SYSTEM_USER_ID, {
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
  _userId?: string, // Kept for API compatibility but ignored
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

  const rateResult = await getRateWithFallback(from, to, date);

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
