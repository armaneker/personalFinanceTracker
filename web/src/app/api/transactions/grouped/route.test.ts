import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { getResponseJson } from '@/test/api-test-utils'

// Mock the analytics module
vi.mock('@/lib/analytics', () => ({
  getTransactionsGroupedByCard: vi.fn().mockResolvedValue([
    {
      card_id: 'card-123',
      card_name: 'Visa Gold',
      transactions: 25,
      total_spend: 5000.0,
      currency: 'TRY',
    },
    {
      card_id: 'card-456',
      card_name: 'MasterCard Platinum',
      transactions: 15,
      total_spend: 3000.0,
      currency: 'TRY',
    },
  ]),
}))

describe('GET /api/transactions/grouped', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns grouped transactions successfully', async () => {
    const response = await GET()

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('grouped')
    expect(Array.isArray(data.grouped)).toBe(true)
  })

  it('returns transactions grouped by card', async () => {
    const response = await GET()
    const data = await getResponseJson(response)

    expect(data.grouped.length).toBeGreaterThan(0)
    data.grouped.forEach((group: unknown) => {
      expect(group).toHaveProperty('card_id')
      expect(group).toHaveProperty('card_name')
      expect(group).toHaveProperty('transactions')
      expect(group).toHaveProperty('total_spend')
      expect(group).toHaveProperty('currency')
    })
  })

  it('calls getTransactionsGroupedByCard function', async () => {
    const { getTransactionsGroupedByCard } = vi.mocked(await import('@/lib/analytics'))

    await GET()

    expect(getTransactionsGroupedByCard).toHaveBeenCalledTimes(1)
  })

  it('handles empty grouped results', async () => {
    const { getTransactionsGroupedByCard } = vi.mocked(await import('@/lib/analytics'))
    getTransactionsGroupedByCard.mockResolvedValueOnce([])

    const response = await GET()
    const data = await getResponseJson(response)

    expect(data.grouped).toEqual([])
  })

  it('has correct data types in response', async () => {
    const response = await GET()
    const data = await getResponseJson(response)

    data.grouped.forEach((group: { card_id: string; card_name: string; transactions: number; total_spend: number; currency: string }) => {
      const g = group
      expect(typeof g.card_id).toBe('string')
      expect(typeof g.card_name).toBe('string')
      expect(typeof g.transactions).toBe('number')
      expect(typeof g.total_spend).toBe('number')
      expect(typeof g.currency).toBe('string')
    })
  })

  it('returns correct aggregation structure', async () => {
    const response = await GET()
    const data = await getResponseJson(response)

    // Verify aggregation makes sense
    expect(data.grouped[0].transactions).toBe(25)
    expect(data.grouped[0].total_spend).toBe(5000.0)
    expect(data.grouped[1].transactions).toBe(15)
    expect(data.grouped[1].total_spend).toBe(3000.0)
  })
})
