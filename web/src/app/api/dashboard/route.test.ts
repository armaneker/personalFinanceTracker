import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { createMockRequest, getResponseJson } from '@/test/api-test-utils'

// Mock the analytics module
vi.mock('@/lib/analytics', () => ({
  buildDashboardSummary: vi.fn().mockResolvedValue({
    month: '2024-01',
    totalSpend: 15000.0,
    currency: 'TRY',
    transactionCount: 50,
    categoryBreakdown: [
      { category: 'Groceries', amount: 5000.0, percentage: 33.3 },
      { category: 'Dining', amount: 3000.0, percentage: 20.0 },
    ],
  }),
}))

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns dashboard summary successfully', async () => {
    const request = createMockRequest('http://localhost:3000/api/dashboard')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('summary')
    expect(data.summary).toHaveProperty('month')
    expect(data.summary).toHaveProperty('totalSpend')
    expect(data.summary).toHaveProperty('transactionCount')
  })

  it('returns dashboard for specific month', async () => {
    const request = createMockRequest('http://localhost:3000/api/dashboard?month=2024-01')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.summary.month).toBe('2024-01')
  })

  it('calls buildDashboardSummary with month parameter', async () => {
    const { buildDashboardSummary } = vi.mocked(await import('@/lib/analytics'))

    const request = createMockRequest('http://localhost:3000/api/dashboard?month=2024-02')
    await GET(request)

    expect(buildDashboardSummary).toHaveBeenCalledWith('2024-02')
  })

  it('calls buildDashboardSummary without month when not provided', async () => {
    const { buildDashboardSummary } = vi.mocked(await import('@/lib/analytics'))

    const request = createMockRequest('http://localhost:3000/api/dashboard')
    await GET(request)

    expect(buildDashboardSummary).toHaveBeenCalledWith(undefined)
  })

  it('returns null summary when no data exists', async () => {
    const { buildDashboardSummary } = vi.mocked(await import('@/lib/analytics'))
    buildDashboardSummary.mockResolvedValueOnce(null)

    const request = createMockRequest('http://localhost:3000/api/dashboard')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.summary).toBeNull()
  })

  it('has correct response structure', async () => {
    const request = createMockRequest('http://localhost:3000/api/dashboard')
    const response = await GET(request)

    const data = await getResponseJson(response)
    expect(data.summary).toHaveProperty('categoryBreakdown')
    expect(Array.isArray(data.summary.categoryBreakdown)).toBe(true)
  })
})
