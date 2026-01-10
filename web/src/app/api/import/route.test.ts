import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, getResponseJson } from '@/test/api-test-utils'

// Mock dependencies
vi.mock('@/lib/llm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/llm')>()
  return {
    ...actual,
    extractTransactionsWithLLM: vi.fn().mockResolvedValue({
      run_id: 'run-test-123',
      model: 'gpt-4o-mini',
      summary: {
        transactions: 1,
        total_spend: 500.0,
        currency: 'TRY',
      },
      transactions: [
        {
          id: 'txn-001',
          card_id: 'card-123',
          owner_id: 'owner-1',
          statement_ref: 'test-statement.pdf',
          transaction_date: '2024-01-15',
          merchant: 'Test Merchant',
          amount: -500.0,
          currency: 'TRY',
          category_id: 'cat-groceries',
          llm_category_id: 'cat-groceries',
        },
      ],
    }),
  }
})

vi.mock('@/lib/importer', () => ({
  validateExtraction: vi.fn((data) => data),
  persistExtractionToPending: vi.fn().mockResolvedValue({
    pendingFile: '/path/to/pending.json',
  }),
  commitExtraction: vi.fn().mockResolvedValue(undefined),
  findExistingImportByFingerprint: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/data-store', () => ({
  getCategories: vi.fn().mockResolvedValue([
    { id: 'cat-groceries', name: 'Groceries', color: '#22c55e' },
  ]),
}))

vi.mock('@/lib/ids', () => ({
  generateRunId: vi.fn(() => 'run-test-123'),
}))

// Import after mocking
const { POST } = await import('./route')

describe('POST /api/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('imports statement with text successfully', async () => {
    const importPayload = {
      statementName: 'january-2024.txt',
      statementText: 'Sample statement text with transactions',
      cardId: 'card-123',
      ownerId: 'owner-1',
      month: '2024-01',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: importPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('runId')
    expect(data).toHaveProperty('summary')
    expect(data).toHaveProperty('warnings')
    expect(data.autoCommitted).toBe(false)
  })

  it('auto-commits when autoCommit is true', async () => {
    const importPayload = {
      statementName: 'january-2024.txt',
      statementText: 'Sample statement text',
      cardId: 'card-123',
      autoCommit: true,
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: importPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.autoCommitted).toBe(true)

    const { commitExtraction } = vi.mocked(await import('@/lib/importer'))
    expect(commitExtraction).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when both statementText and statementPdfBase64 are missing', async () => {
    const invalidPayload = {
      statementName: 'january-2024.txt',
      cardId: 'card-123',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: invalidPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('returns 400 when statementName is missing', async () => {
    const invalidPayload = {
      statementText: 'Some text',
      cardId: 'card-123',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: invalidPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data).toHaveProperty('code')
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data).toHaveProperty('details')
    expect(data.details).toHaveProperty('fieldErrors')
    expect(data.details.fieldErrors).toHaveProperty('statementName')
  })

  it('returns 400 for invalid month format', async () => {
    const invalidPayload = {
      statementName: 'january-2024.txt',
      statementText: 'Sample text',
      month: '2024-1', // Should be 2024-01
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: invalidPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('validates Zod schema for all fields', async () => {
    const invalidPayload = {
      statementName: '', // Empty string not allowed
      statementText: 'Some text',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: invalidPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('returns 409 when duplicate statement is detected (history)', async () => {
    const { findExistingImportByFingerprint } = vi.mocked(await import('@/lib/importer'))
    findExistingImportByFingerprint.mockResolvedValueOnce({
      type: 'history',
      run_id: 'run-existing-123',
    })

    const importPayload = {
      statementName: 'duplicate-statement.txt',
      statementText: 'Duplicate statement content',
      cardId: 'card-123',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: importPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(409)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.error).toContain('already imported')
    expect(data).toHaveProperty('code')
    expect(data.code).toBe('DUPLICATE')
    expect(data).toHaveProperty('details')
    expect(data.details).toHaveProperty('duplicate')
    expect(data.details.duplicate.run_id).toBe('run-existing-123')
  })

  it('returns 409 when duplicate statement is pending', async () => {
    const { findExistingImportByFingerprint } = vi.mocked(await import('@/lib/importer'))
    findExistingImportByFingerprint.mockResolvedValueOnce({
      type: 'pending',
      run_id: 'run-pending-456',
    })

    const importPayload = {
      statementName: 'pending-statement.txt',
      statementText: 'Pending statement content',
      cardId: 'card-123',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: importPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(409)

    const data = await getResponseJson(response)
    expect(data.error).toContain('already pending approval')
    expect(data).toHaveProperty('code')
    expect(data.code).toBe('DUPLICATE')
    expect(data).toHaveProperty('details')
    expect(data.details).toHaveProperty('duplicate')
    expect(data.details.duplicate.run_id).toBe('run-pending-456')
  })

  it('returns 500 when LLM extraction fails', async () => {
    const { extractTransactionsWithLLM } = vi.mocked(await import('@/lib/llm'))
    extractTransactionsWithLLM.mockRejectedValueOnce(new Error('LLM API error'))

    const importPayload = {
      statementName: 'fail-test.txt',
      statementText: 'Some text that will fail',
      cardId: 'card-123',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: importPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(500)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.error).toBe('LLM API error')
  })

  it('calls extractTransactionsWithLLM with correct parameters', async () => {
    const { extractTransactionsWithLLM } = vi.mocked(await import('@/lib/llm'))

    const importPayload = {
      statementName: 'test-statement.txt',
      statementText: 'Test statement content',
      cardId: 'card-456',
      ownerId: 'owner-2',
      month: '2024-02',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: importPayload,
    })

    await POST(request)

    expect(extractTransactionsWithLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        statementName: importPayload.statementName,
        statementText: importPayload.statementText,
        cardId: importPayload.cardId,
        ownerId: importPayload.ownerId,
        month: importPayload.month,
        categories: expect.any(Array),
      }),
    )
  })

  it('calls persistExtractionToPending with correct options', async () => {
    const { persistExtractionToPending } = vi.mocked(await import('@/lib/importer'))

    const importPayload = {
      statementName: 'persist-test.txt',
      statementText: 'Test content',
      cardId: 'card-789',
      ownerId: 'owner-3',
      month: '2024-03',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: importPayload,
    })

    await POST(request)

    expect(persistExtractionToPending).toHaveBeenCalledWith(
      expect.any(String), // run_id
      expect.any(Object), // validated extraction
      expect.objectContaining({
        statementFile: importPayload.statementName,
        month: importPayload.month,
        cardId: importPayload.cardId,
        ownerId: importPayload.ownerId,
        autoCommit: false,
        fingerprint: expect.any(String),
      }),
    )
  })

  it('handles optional fields correctly', async () => {
    const minimalPayload = {
      statementName: 'minimal.txt',
      statementText: 'Minimal statement',
    }

    const request = createMockRequest('http://localhost:3000/api/import', {
      method: 'POST',
      body: minimalPayload,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('runId')
    expect(data).toHaveProperty('summary')
  })
})
