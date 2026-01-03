import { http, HttpResponse } from 'msw'
import type { StatementExtraction } from '@/lib/types'

/**
 * Default mock response for OpenAI chat completions.
 * Returns a valid StatementExtraction JSON structure.
 */
export function createMockStatementExtraction(
  overrides: Partial<StatementExtraction> = {}
): StatementExtraction {
  return {
    run_id: 'test-run-123',
    model: 'gpt-4o-mini',
    summary: {
      transactions: 2,
      total_spend: 1500.00,
      currency: 'TRY',
    },
    transactions: [
      {
        id: 'txn-001',
        card_id: 'card-123',
        statement_ref: 'test-statement.pdf',
        owner_id: 'owner-1',
        category_id: 'groceries',
        amount: -500.00,
        currency: 'TRY',
        transaction_date: '2024-01-15',
        merchant: 'Migros',
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:00:00Z',
        flags: { review: false, duplicate: false },
      },
      {
        id: 'txn-002',
        card_id: 'card-123',
        statement_ref: 'test-statement.pdf',
        owner_id: 'owner-1',
        category_id: 'dining',
        amount: -1000.00,
        currency: 'TRY',
        transaction_date: '2024-01-18',
        merchant: 'Restaurant XYZ',
        created_at: '2024-01-19T10:00:00Z',
        updated_at: '2024-01-19T10:00:00Z',
        flags: { review: false, duplicate: false },
      },
    ],
    warnings: [],
    ...overrides,
  }
}

/**
 * Creates a mock OpenAI chat completion response.
 */
export function createMockChatCompletion(content: string) {
  return {
    id: 'chatcmpl-mock-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4o-mini',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  }
}

/**
 * MSW handler for OpenAI chat completions endpoint.
 * Returns a successful extraction response by default.
 */
export const openaiHandlers = [
  http.post('https://api.openai.com/v1/chat/completions', () => {
    const extraction = createMockStatementExtraction()
    const completion = createMockChatCompletion(JSON.stringify(extraction))
    return HttpResponse.json(completion)
  }),
]

/**
 * Creates an error response handler for testing error scenarios.
 */
export function createOpenAIErrorHandler(
  status: number,
  errorType: string,
  message: string
) {
  return http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json(
      {
        error: {
          message,
          type: errorType,
          code: errorType,
        },
      },
      { status }
    )
  })
}

/**
 * Creates handlers for specific error scenarios.
 */
export const openaiErrorHandlers = {
  unauthorized: createOpenAIErrorHandler(401, 'invalid_api_key', 'Incorrect API key provided'),
  rateLimited: createOpenAIErrorHandler(429, 'rate_limit_exceeded', 'Rate limit exceeded'),
  serverError: createOpenAIErrorHandler(500, 'server_error', 'Internal server error'),
  modelNotFound: createOpenAIErrorHandler(404, 'model_not_found', 'Model not found'),
}
