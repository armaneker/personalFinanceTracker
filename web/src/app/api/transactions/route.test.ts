import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, getResponseJson, mockData } from '@/test/api-test-utils'

// Mock auth to return test user
vi.mock('@/lib/auth', () => ({
  requireUserId: vi.fn().mockResolvedValue('test-user-id'),
}))

// Mock the data-store module
vi.mock('@/lib/data-store', () => ({
  listTransactionMonths: vi.fn((_userId) => Promise.resolve(['2024-01', '2023-12'])),
  loadTransactionFile: vi.fn((_userId, _month) => Promise.resolve({
    meta: { month: '2024-01' },
    transactions: mockData.transactions,
  })),
  createOrUpdateTransaction: vi.fn((_userId, _month, transaction) => Promise.resolve(transaction)),
  deleteTransaction: vi.fn((_userId, _month, _id) => Promise.resolve(undefined)),
}))

// Import after mocking
const { GET, POST, DELETE } = await import('./route')

describe('GET /api/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns transactions for default month', async () => {
    const request = createMockRequest('http://localhost:3000/api/transactions')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('month')
    expect(data).toHaveProperty('transactions')
    expect(Array.isArray(data.transactions)).toBe(true)
  })

  it('returns transactions for specific month', async () => {
    const request = createMockRequest('http://localhost:3000/api/transactions?month=2024-01')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.month).toBe('2024-01')
    expect(data).toHaveProperty('transactions')
  })

  it('filters transactions by cardId', async () => {
    const request = createMockRequest('http://localhost:3000/api/transactions?cardId=card-123')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('transactions')
    // Verify filtering logic
    data.transactions.forEach((tx: { card_id: string }) => {
      const transaction = tx
      expect(transaction.card_id).toBe('card-123')
    })
  })

  it('filters transactions by ownerId', async () => {
    const request = createMockRequest('http://localhost:3000/api/transactions?ownerId=owner-1')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    data.transactions.forEach((tx: { owner_id: string }) => {
      const transaction = tx
      expect(transaction.owner_id).toBe('owner-1')
    })
  })

  it('filters transactions by categoryId', async () => {
    const request = createMockRequest('http://localhost:3000/api/transactions?categoryId=cat-groceries')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    data.transactions.forEach((tx: { category_id: string }) => {
      const transaction = tx
      expect(transaction.category_id).toBe('cat-groceries')
    })
  })

  it('handles multiple filter parameters', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/transactions?month=2024-01&cardId=card-123&ownerId=owner-1',
    )
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.month).toBe('2024-01')
  })

  it('returns empty array when no transactions exist', async () => {
    const { loadTransactionFile } = vi.mocked(await import('@/lib/data-store'))
    loadTransactionFile.mockResolvedValueOnce(null)

    const request = createMockRequest('http://localhost:3000/api/transactions?month=2025-12')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.transactions).toEqual([])
  })
})

describe('POST /api/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new transaction with valid input', async () => {
    const newTransaction = {
      month: '2024-01',
      card_id: 'card-123',
      owner_id: 'owner-1',
      category_id: 'cat-groceries',
      statement_ref: 'test-statement.pdf',
      amount: -250.5,
      currency: 'TRY',
      transaction_date: '2024-01-20',
      merchant: 'Carrefour',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: newTransaction,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('transaction')
    expect(data.transaction).toHaveProperty('id')
    expect(data.transaction.merchant).toBe(newTransaction.merchant)
    expect(data.transaction.amount).toBe(newTransaction.amount)
  })

  it('creates transaction with optional fields', async () => {
    const newTransaction = {
      month: '2024-01',
      card_id: 'card-123',
      owner_id: 'owner-1',
      category_id: 'cat-groceries',
      statement_ref: 'test-statement.pdf',
      amount: -100.0,
      currency: 'TRY',
      transaction_date: '2024-01-15',
      merchant: 'Test Merchant',
      description: 'Test description',
      notes: 'Test notes',
      post_date: '2024-01-16',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: newTransaction,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)

    const data = await getResponseJson(response)
    expect(data.transaction.description).toBe(newTransaction.description)
    expect(data.transaction.notes).toBe(newTransaction.notes)
  })

  it('returns 400 for missing required fields', async () => {
    const invalidTransaction = {
      month: '2024-01',
      // Missing amount and transaction_date
      merchant: 'Test',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: invalidTransaction,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('returns 400 for invalid date format', async () => {
    const invalidTransaction = {
      month: '2024-01',
      amount: -100.0,
      currency: 'TRY',
      transaction_date: '01-15-2024', // Wrong format
      merchant: 'Test',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: invalidTransaction,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('returns 400 for invalid month format', async () => {
    const invalidTransaction = {
      month: '2024-1', // Should be 2024-01
      amount: -100.0,
      currency: 'TRY',
      transaction_date: '2024-01-15',
      merchant: 'Test',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: invalidTransaction,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('returns 400 for invalid amount type', async () => {
    const invalidTransaction = {
      month: '2024-01',
      amount: 'not-a-number', // Should be number
      currency: 'TRY',
      transaction_date: '2024-01-15',
      merchant: 'Test',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: invalidTransaction,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('applies default values for optional fields', async () => {
    const minimalTransaction = {
      month: '2024-01',
      card_id: 'card-123',
      statement_ref: 'test-statement.pdf',
      owner_id: 'owner-1',
      category_id: 'cat-groceries',
      amount: -50.0,
      currency: 'TRY',
      transaction_date: '2024-01-15',
      merchant: 'Test',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: minimalTransaction,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)

    const data = await getResponseJson(response)
    // Verify defaults are applied for truly optional fields
    expect(data.transaction.id).toBeDefined()
    expect(data.transaction.created_at).toBeDefined()
    expect(data.transaction.updated_at).toBeDefined()
    expect(data.transaction.flags).toBeDefined()
    expect(data.transaction.flags.review).toBe(false)
    expect(data.transaction.flags.duplicate).toBe(false)
  })
})

describe('DELETE /api/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a transaction successfully', async () => {
    const deletePayload = {
      month: '2024-01',
      transactionId: 'txn-001',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'DELETE',
      body: deletePayload,
    })

    const response = await DELETE(request)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('ok')
    expect(data.ok).toBe(true)
  })

  it('returns 400 when month is missing', async () => {
    const invalidPayload = {
      transactionId: 'txn-001',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'DELETE',
      body: invalidPayload,
    })

    const response = await DELETE(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.error).toContain('month')
  })

  it('returns 400 when transactionId is missing', async () => {
    const invalidPayload = {
      month: '2024-01',
    }

    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'DELETE',
      body: invalidPayload,
    })

    const response = await DELETE(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.error).toContain('transactionId')
  })

  it('returns 400 when both parameters are missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/transactions', {
      method: 'DELETE',
      body: {},
    })

    const response = await DELETE(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })
})
