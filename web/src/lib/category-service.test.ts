import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ensureCategories } from './category-service'
import * as dataStore from './data-store'
import type { Category } from './types'
import type { StatementExtractionInput } from './schemas'

// Mock dependencies
vi.mock('./data-store')

// Test user ID for multi-user support
const TEST_USER_ID = 'test-user-id'
// User prefix for scoped category IDs (first 8 chars)
const USER_PREFIX = 'test-use'

describe('category-service.ts', () => {
  const mockCategories: Category[] = [
    { id: 'cat-groceries', name: 'Groceries', color: '#22c55e' },
    { id: 'cat-dining', name: 'Dining', color: '#ef4444' },
  ]

  beforeEach(() => {
    vi.mocked(dataStore.getCategories).mockResolvedValue(mockCategories)
    vi.mocked(dataStore.saveCategories).mockResolvedValue()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('ensureCategories', () => {
    it('should not save categories if all exist', async () => {
      const extraction: StatementExtractionInput = {
        run_id: 'run-001',
        model: 'gpt-4',
        summary: {
          transactions: 1,
          total_spend: 500.00,
          currency: 'TRY',
        },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Migros',
          },
        ],
      }

      const mapping = await ensureCategories(TEST_USER_ID, extraction)

      expect(dataStore.getCategories).toHaveBeenCalled()
      expect(dataStore.saveCategories).not.toHaveBeenCalled()
      expect(mapping).toBeInstanceOf(Map)
    })

    it('should create new categories from new_categories field', async () => {
      const extraction: StatementExtractionInput = {
        run_id: 'run-002',
        model: 'gpt-4',
        summary: {
          transactions: 1,
          total_spend: 500.00,
          currency: 'TRY',
        },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-new',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store',
          },
        ],
        new_categories: [
          {
            id: 'cat-new',
            name: 'New Category',
            color: '#ff0000',
          },
        ],
      }

      await ensureCategories(TEST_USER_ID, extraction)

      expect(dataStore.saveCategories).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.arrayContaining([
          expect.objectContaining({
            id: `${USER_PREFIX}-cat-new`,
            name: 'New Category',
            color: '#ff0000',
          }),
        ])
      )
    })

    it('should auto-create missing categories from transactions', async () => {
      const extraction: StatementExtractionInput = {
        run_id: 'run-003',
        model: 'gpt-4',
        summary: {
          transactions: 1,
          total_spend: 500.00,
          currency: 'TRY',
        },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-transport',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Uber',
          },
        ],
      }

      await ensureCategories(TEST_USER_ID, extraction)

      expect(dataStore.saveCategories).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.arrayContaining([
          expect.objectContaining({
            id: `${USER_PREFIX}-cat-transport`,
            name: 'transport',
          }),
        ])
      )
    })

    it('should use llm_category_id if category_id is missing', async () => {
      const extraction: StatementExtractionInput = {
        run_id: 'run-004',
        model: 'gpt-4',
        summary: {
          transactions: 1,
          total_spend: 500.00,
          currency: 'TRY',
        },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            llm_category_id: 'cat-entertainment',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Cinema',
          },
        ],
      }

      await ensureCategories(TEST_USER_ID, extraction)

      expect(dataStore.saveCategories).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.arrayContaining([
          expect.objectContaining({
            id: `${USER_PREFIX}-cat-entertainment`,
            name: 'entertainment',
          }),
        ])
      )
    })

    it('should handle transactions without category gracefully', async () => {
      const extraction: StatementExtractionInput = {
        run_id: 'run-005',
        model: 'gpt-4',
        summary: {
          transactions: 1,
          total_spend: 500.00,
          currency: 'TRY',
        },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            // No category_id or llm_category_id
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Unknown',
          },
        ],
      }

      await ensureCategories(TEST_USER_ID, extraction)

      // Should not crash and not save categories
      expect(dataStore.saveCategories).not.toHaveBeenCalled()
    })

    it('should assign colors from palette cyclically', async () => {
      const extraction: StatementExtractionInput = {
        run_id: 'run-006',
        model: 'gpt-4',
        summary: {
          transactions: 3,
          total_spend: 1500.00,
          currency: 'TRY',
        },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-new1',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store 1',
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-new2',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-11',
            merchant: 'Store 2',
          },
          {
            id: 'txn-003',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-new3',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Store 3',
          },
        ],
      }

      await ensureCategories(TEST_USER_ID, extraction)

      const savedCategories = vi.mocked(dataStore.saveCategories).mock.calls[0]?.[1]
      // Note: All categories are saved (existing + new), so length is > 2
      expect(savedCategories).toBeDefined()
      expect(savedCategories?.length).toBeGreaterThanOrEqual(5) // At least 2 existing + 3 new
      // New categories have user-scoped IDs
      expect(savedCategories?.find(c => c.id === `${USER_PREFIX}-cat-new1`)?.color).toBeDefined()
      expect(savedCategories?.find(c => c.id === `${USER_PREFIX}-cat-new2`)?.color).toBeDefined()
      expect(savedCategories?.find(c => c.id === `${USER_PREFIX}-cat-new3`)?.color).toBeDefined()
    })

    it('should not duplicate categories', async () => {
      const extraction: StatementExtractionInput = {
        run_id: 'run-007',
        model: 'gpt-4',
        summary: {
          transactions: 2,
          total_spend: 1000.00,
          currency: 'TRY',
        },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store 1',
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-11',
            merchant: 'Store 2',
          },
        ],
      }

      await ensureCategories(TEST_USER_ID, extraction)

      expect(dataStore.saveCategories).not.toHaveBeenCalled()
    })
  })
})
