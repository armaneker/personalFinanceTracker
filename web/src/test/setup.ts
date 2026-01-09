import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './mocks/server'

// Set up environment variables for testing
// Note: NODE_ENV is set by vitest automatically
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing'
process.env.OPENAI_IMPORT_MODEL = 'gpt-4o-mini'
process.env.NEXTAUTH_SECRET = 'test-secret-minimum-32-characters-long'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.AUTH_USER_EMAIL = 'test@example.com'
process.env.AUTH_USER_PASSWORD_HASH = '$2a$10$testpasswordhashfortesting'
process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
process.env.TURSO_AUTH_TOKEN = 'test-token'

// Mock the database client to avoid actual DB connections in tests
vi.mock('@/db/index', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock the logger to avoid logging during tests
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
}

vi.mock('@/lib/logger', () => ({
  default: mockLogger,
  logger: mockLogger,
  apiLogger: mockLogger,
  llmLogger: mockLogger,
  dataLogger: mockLogger,
  importLogger: mockLogger,
  logRequest: vi.fn(),
  logResponse: vi.fn(),
  logLLMStart: vi.fn(),
  logLLMComplete: vi.fn(),
  logLLMError: vi.fn(),
  logError: vi.fn(),
}))

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers after each test for isolation
afterEach(() => server.resetHandlers())

// Clean up after all tests
afterAll(() => server.close())
