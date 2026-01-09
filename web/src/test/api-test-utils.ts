import { vi } from 'vitest'
import type { Session } from 'next-auth'

/**
 * Mock NextAuth session for authenticated requests
 */
export const mockSession: Session = {
  user: {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
}

/**
 * Mock database responses for testing
 */
export const mockData = {
  categories: [
    { id: 'cat-groceries', name: 'Groceries', color: '#22c55e' },
    { id: 'cat-dining', name: 'Dining', color: '#f59e0b' },
    { id: 'cat-transport', name: 'Transport', color: '#3b82f6' },
  ],
  transactions: [
    {
      id: 'txn-001',
      card_id: 'card-123',
      statement_ref: 'statement-jan-2024.pdf',
      owner_id: 'owner-1',
      category_id: 'cat-groceries',
      llm_category_id: 'cat-groceries',
      amount: -500.0,
      currency: 'TRY',
      transaction_date: '2024-01-15',
      merchant: 'Migros',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z',
      flags: {
        review: false,
        duplicate: false,
      },
    },
  ],
}

/**
 * Helper to create a mock Request object
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {},
): Request {
  const { method = 'GET', body, headers = {} } = options

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body) {
    init.body = JSON.stringify(body)
  }

  return new Request(url, init)
}

/**
 * Helper to parse NextResponse to JSON
 */
export async function getResponseJson(response: Response) {
  return await response.json()
}

/**
 * Mock data-store functions
 */
export function mockDataStore() {
  return {
    getCategories: vi.fn().mockResolvedValue(mockData.categories),
    upsertCategory: vi.fn((category) => Promise.resolve(category)),
    listTransactionMonths: vi.fn().mockResolvedValue(['2024-01', '2023-12']),
    loadTransactionFile: vi.fn().mockResolvedValue({
      meta: { month: '2024-01' },
      transactions: mockData.transactions,
    }),
    createOrUpdateTransaction: vi.fn((month, transaction) => Promise.resolve(transaction)),
    deleteTransaction: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Mock importer functions
 */
export function mockImporter() {
  return {
    validateExtraction: vi.fn((data) => data),
    persistExtractionToPending: vi.fn().mockResolvedValue({
      pendingFile: '/path/to/pending.json',
    }),
    commitExtraction: vi.fn().mockResolvedValue(undefined),
    findExistingImportByFingerprint: vi.fn().mockResolvedValue(null),
  }
}

/**
 * Mock LLM extraction
 */
export function mockLLM() {
  return {
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
}
