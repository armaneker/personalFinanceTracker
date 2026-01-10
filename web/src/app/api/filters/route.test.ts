import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getResponseJson } from '@/test/api-test-utils'

// Mock auth to return test user
vi.mock('@/lib/auth', () => ({
  requireUserId: vi.fn().mockResolvedValue('test-user-id'),
}))

// Mock the analytics module
vi.mock('@/lib/analytics', () => ({
  getDistinctFilters: vi.fn().mockResolvedValue({
    cards: ['card-123', 'card-456'],
    owners: ['owner-1', 'owner-2'],
    categories: ['cat-groceries', 'cat-dining', 'cat-transport'],
    years: ['2024', '2023'],
    merchants: ['Migros', 'Carrefour'],
  }),
}))

// Import after mocking
const { GET } = await import('./route')

describe('GET /api/filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns filter options successfully', async () => {
    const response = await GET()

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('cards')
    expect(data).toHaveProperty('owners')
    expect(data).toHaveProperty('categories')
    expect(data).toHaveProperty('years')
    expect(data).toHaveProperty('merchants')
  })

  it('returns arrays for all filter types', async () => {
    const response = await GET()
    const data = await getResponseJson(response)

    expect(Array.isArray(data.cards)).toBe(true)
    expect(Array.isArray(data.owners)).toBe(true)
    expect(Array.isArray(data.categories)).toBe(true)
    expect(Array.isArray(data.years)).toBe(true)
    expect(Array.isArray(data.merchants)).toBe(true)
  })

  it('calls getDistinctFilters function', async () => {
    const { getDistinctFilters } = vi.mocked(await import('@/lib/analytics'))

    await GET()

    expect(getDistinctFilters).toHaveBeenCalledTimes(1)
  })

  it('handles empty filter results', async () => {
    const { getDistinctFilters } = vi.mocked(await import('@/lib/analytics'))
    getDistinctFilters.mockResolvedValueOnce({
      cards: [],
      owners: [],
      categories: [],
      years: [],
      merchants: [],
    })

    const response = await GET()
    const data = await getResponseJson(response)

    expect(data.cards).toEqual([])
    expect(data.owners).toEqual([])
    expect(data.categories).toEqual([])
    expect(data.years).toEqual([])
  })

  it('returns correct data structure', async () => {
    const response = await GET()
    const data = await getResponseJson(response)

    expect(data.cards.length).toBeGreaterThan(0)
    expect(data.owners.length).toBeGreaterThan(0)
    expect(data.categories.length).toBeGreaterThan(0)
    expect(data.years.length).toBeGreaterThan(0)
    expect(data.merchants.length).toBeGreaterThan(0)
  })
})
