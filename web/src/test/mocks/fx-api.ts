import { http, HttpResponse } from 'msw'

/**
 * Default exchange rates for testing.
 * Maps currency codes to their TRY conversion rates.
 */
export const defaultExchangeRates: Record<string, number> = {
  TRY: 1,
  USD: 32.50,
  EUR: 35.20,
  GBP: 41.00,
}

/**
 * Creates a mock FX API response for exchangerate.host.
 */
export function createMockFXResponse(
  base: string,
  date: string,
  rates: Record<string, number> = {}
) {
  return {
    motd: { msg: 'Mock response', url: 'https://exchangerate.host' },
    success: true,
    historical: true,
    base,
    date,
    rates: {
      TRY: rates.TRY ?? defaultExchangeRates[base] ?? 1,
      ...rates,
    },
  }
}

/**
 * MSW handler for exchangerate.host API.
 * Supports historical rate queries with base currency and date.
 */
export const fxApiHandlers = [
  http.get('https://api.exchangerate.host/:date', ({ params, request }) => {
    const url = new URL(request.url)
    const base = url.searchParams.get('base') || 'USD'
    const date = params.date as string

    // Get the rate for converting base currency to TRY
    const rate = defaultExchangeRates[base.toUpperCase()] ?? 30.0

    return HttpResponse.json(createMockFXResponse(base, date, { TRY: rate }))
  }),
]

/**
 * Creates an error handler for testing FX API error scenarios.
 */
export function createFXApiErrorHandler(status: number, message: string) {
  return http.get('https://api.exchangerate.host/:date', () => {
    return HttpResponse.json(
      {
        success: false,
        error: { code: status, type: 'error', info: message },
      },
      { status }
    )
  })
}

/**
 * Creates a handler that returns no rates (simulates unavailable rate).
 */
export function createFXApiNoRatesHandler() {
  return http.get('https://api.exchangerate.host/:date', ({ params, request }) => {
    const url = new URL(request.url)
    const base = url.searchParams.get('base') || 'USD'
    const date = params.date as string

    return HttpResponse.json({
      success: true,
      base,
      date,
      rates: {}, // Empty rates - TRY not available
    })
  })
}

/**
 * Common error handlers for FX API.
 */
export const fxApiErrorHandlers = {
  serverError: createFXApiErrorHandler(500, 'Internal server error'),
  serviceUnavailable: createFXApiErrorHandler(503, 'Service temporarily unavailable'),
  noRates: createFXApiNoRatesHandler(),
}
