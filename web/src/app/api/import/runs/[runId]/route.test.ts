import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { createMockRequest, getResponseJson } from '@/test/api-test-utils'

// Mock auth to return test user
vi.mock('@/lib/auth', () => ({
  requireUserId: vi.fn().mockResolvedValue('test-user-id'),
}))

// Mock data-store
vi.mock('@/lib/data-store', () => ({
  getImportRunById: vi.fn(),
  deleteImportRun: vi.fn(),
  deleteTransactionsByStatementRef: vi.fn(),
}))

// Import after mocking
const { DELETE, GET } = await import('./route')

describe('DELETE /api/import/runs/[runId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes import run and associated transactions successfully', async () => {
    const { getImportRunById, deleteImportRun, deleteTransactionsByStatementRef } = vi.mocked(
      await import('@/lib/data-store'),
    )

    getImportRunById.mockResolvedValueOnce({
      run_id: 'run-123',
      statement_file: 'january-2024.pdf',
      card_id: 'card-123',
      month: '2024-01',
      imported_at: '2024-01-15T10:00:00Z',
      status: 'completed' as const,
      summary: {
        transactions: 10,
        total_spend: 1500,
        currency: 'TRY',
      },
    })

    deleteTransactionsByStatementRef.mockResolvedValueOnce(10)
    deleteImportRun.mockResolvedValueOnce(undefined)

    const request = createMockRequest('http://localhost:3000/api/import/runs/run-123', {
      method: 'DELETE',
    })

    const context = { params: Promise.resolve({ runId: 'run-123' }) }
    const response = await DELETE(request as unknown as NextRequest, context)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.ok).toBe(true)
    expect(data.deleted.runId).toBe('run-123')
    expect(data.deleted.transactionsCount).toBe(10)

    expect(getImportRunById).toHaveBeenCalledWith('test-user-id', 'run-123')
    expect(deleteTransactionsByStatementRef).toHaveBeenCalledWith('test-user-id', 'january-2024.pdf')
    expect(deleteImportRun).toHaveBeenCalledWith('test-user-id', 'run-123')
  })

  it('returns 404 when import run is not found', async () => {
    const { getImportRunById } = vi.mocked(await import('@/lib/data-store'))

    getImportRunById.mockResolvedValueOnce(null)

    const request = createMockRequest('http://localhost:3000/api/import/runs/non-existent', {
      method: 'DELETE',
    })

    const context = { params: Promise.resolve({ runId: 'non-existent' }) }
    const response = await DELETE(request as unknown as NextRequest, context)

    expect(response.status).toBe(404)

    const data = await getResponseJson(response)
    expect(data.error).toContain('not found')
    expect(data.code).toBe('NOT_FOUND')
  })

  it('handles database errors gracefully', async () => {
    const { getImportRunById, deleteTransactionsByStatementRef } = vi.mocked(
      await import('@/lib/data-store'),
    )

    getImportRunById.mockResolvedValueOnce({
      run_id: 'run-123',
      statement_file: 'january-2024.pdf',
      card_id: 'card-123',
      month: '2024-01',
      imported_at: '2024-01-15T10:00:00Z',
      status: 'completed' as const,
    })

    deleteTransactionsByStatementRef.mockRejectedValueOnce(new Error('Database error'))

    const request = createMockRequest('http://localhost:3000/api/import/runs/run-123', {
      method: 'DELETE',
    })

    const context = { params: Promise.resolve({ runId: 'run-123' }) }
    const response = await DELETE(request as unknown as NextRequest, context)

    expect(response.status).toBe(500)

    const data = await getResponseJson(response)
    expect(data.error).toBe('Database error')
  })
})

describe('GET /api/import/runs/[runId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns import run details successfully', async () => {
    const { getImportRunById } = vi.mocked(await import('@/lib/data-store'))

    const mockRun = {
      run_id: 'run-123',
      statement_file: 'january-2024.pdf',
      card_id: 'card-123',
      month: '2024-01',
      imported_at: '2024-01-15T10:00:00Z',
      status: 'completed' as const,
      summary: {
        transactions: 10,
        total_spend: 1500,
        currency: 'TRY',
      },
    }

    getImportRunById.mockResolvedValueOnce(mockRun)

    const request = createMockRequest('http://localhost:3000/api/import/runs/run-123', {
      method: 'GET',
    })

    const context = { params: Promise.resolve({ runId: 'run-123' }) }
    const response = await GET(request as unknown as NextRequest, context)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.run_id).toBe('run-123')
    expect(data.statement_file).toBe('january-2024.pdf')
    expect(data.summary.transactions).toBe(10)
  })

  it('returns 404 when import run is not found', async () => {
    const { getImportRunById } = vi.mocked(await import('@/lib/data-store'))

    getImportRunById.mockResolvedValueOnce(null)

    const request = createMockRequest('http://localhost:3000/api/import/runs/non-existent', {
      method: 'GET',
    })

    const context = { params: Promise.resolve({ runId: 'non-existent' }) }
    const response = await GET(request as unknown as NextRequest, context)

    expect(response.status).toBe(404)

    const data = await getResponseJson(response)
    expect(data.error).toContain('not found')
    expect(data.code).toBe('NOT_FOUND')
  })
})
