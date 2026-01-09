import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateExtraction,
  findExistingImportByFingerprint,
  persistExtractionToPending,
  commitExtraction,
} from './importer'
import * as dataStore from './data-store'
import * as fxService from './fx-service'
import type { StatementExtraction, Category } from './types'
import type { StatementExtractionInput } from './schemas'

// Mock dependencies
vi.mock('./data-store')
vi.mock('./fx-service')
vi.mock('./ids', () => ({
  generateTransactionId: vi.fn((month) => `txn-${month}-${Date.now()}`),
}))

describe('importer.ts', () => {
  const mockCategories: Category[] = [
    { id: 'cat-groceries', name: 'Groceries', color: '#22c55e' },
    { id: 'cat-dining', name: 'Dining', color: '#ef4444' },
  ]

  beforeEach(() => {
    vi.mocked(dataStore.getCategories).mockResolvedValue(mockCategories)
    vi.mocked(dataStore.saveCategories).mockResolvedValue()
    vi.mocked(dataStore.createOrUpdateTransaction).mockImplementation(async (_month, tx) => tx)
    vi.mocked(dataStore.appendImportHistory).mockResolvedValue()

    // Mock FX service to return same amount for TRY
    vi.mocked(fxService.convertAmount).mockImplementation(async (amount, from, to) => ({
      amount,
      currency: to,
      originalAmount: amount,
      originalCurrency: from,
      fxRate: 1,
      source: 'api',
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('validateExtraction', () => {
    it('should validate and sanitize a valid extraction', () => {
      const extraction: StatementExtraction = {
        run_id: 'run-001',
        model: 'gpt-4',
        summary: {
          transactions: 2,
          total_spend: 800.00,
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
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-dining',
            amount: -300.00,
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Restaurant',
          },
        ],
      }

      const result = validateExtraction(extraction)

      expect(result.run_id).toBe('run-001')
      expect(result.transactions).toHaveLength(2)
      expect(result.summary.transactions).toBe(2)
      expect(result.summary.total_spend).toBe(800.00)
    })

    it('should filter out non-spending transactions (positive amounts)', () => {
      const extraction: StatementExtraction = {
        run_id: 'run-002',
        model: 'gpt-4',
        summary: {
          transactions: 3,
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
            merchant: 'Store',
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: 200.00, // refund - should be filtered
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Refund',
          },
          {
            id: 'txn-003',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-dining',
            amount: -300.00,
            currency: 'TRY',
            transaction_date: '2024-01-15',
            merchant: 'Restaurant',
          },
        ],
      }

      const result = validateExtraction(extraction)

      expect(result.transactions).toHaveLength(2)
      expect(result.transactions.every(tx => tx.amount < 0)).toBe(true)
      expect(result.summary.transactions).toBe(2)
      expect(result.summary.total_spend).toBe(800.00)
      expect(result.warnings).toContain('Filtered 1 non-spending transactions (amount >= 0).')
    })

    it('should preserve existing warnings and add new ones', () => {
      const extraction: StatementExtraction = {
        run_id: 'run-003',
        model: 'gpt-4',
        summary: {
          transactions: 2,
          total_spend: 500.00,
          currency: 'TRY',
        },
        warnings: ['Existing warning'],
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
            merchant: 'Store',
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: 100.00, // Should be filtered
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Refund',
          },
        ],
      }

      const result = validateExtraction(extraction)

      expect(result.warnings).toHaveLength(2)
      expect(result.warnings).toContain('Existing warning')
      expect(result.warnings).toContain('Filtered 1 non-spending transactions (amount >= 0).')
    })

    it('should handle extraction with all spending transactions', () => {
      const extraction: StatementExtraction = {
        run_id: 'run-004',
        model: 'gpt-4',
        summary: {
          transactions: 2,
          total_spend: 800.00,
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
            merchant: 'Store',
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-dining',
            amount: -300.00,
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Restaurant',
          },
        ],
      }

      const result = validateExtraction(extraction)

      expect(result.transactions).toHaveLength(2)
      expect(result.warnings).toBeUndefined()
    })

    it('should handle empty transaction list', () => {
      const extraction: StatementExtraction = {
        run_id: 'run-005',
        model: 'gpt-4',
        summary: {
          transactions: 0,
          total_spend: 0,
          currency: 'TRY',
        },
        transactions: [],
      }

      const result = validateExtraction(extraction)

      expect(result.transactions).toHaveLength(0)
      expect(result.summary.transactions).toBe(0)
      expect(result.summary.total_spend).toBe(0)
    })

    it('should throw error for invalid extraction schema', () => {
      const invalidExtraction = {
        run_id: 'run-006',
        // missing model
        summary: {
          transactions: 1,
          total_spend: 500.00,
          currency: 'TRY',
        },
        transactions: [],
      }

      expect(() => validateExtraction(invalidExtraction as unknown as StatementExtraction)).toThrow()
    })

    it('should handle zero-amount transactions correctly', () => {
      const extraction: StatementExtraction = {
        run_id: 'run-007',
        model: 'gpt-4',
        summary: {
          transactions: 2,
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
            merchant: 'Store',
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: 0, // Should be filtered (>= 0)
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Zero Amount',
          },
        ],
      }

      const result = validateExtraction(extraction)

      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0]?.amount).toBe(-500.00)
    })
  })

  describe('findExistingImportByFingerprint', () => {
    it('should return null for empty fingerprint', async () => {
      const result = await findExistingImportByFingerprint('')

      expect(result).toBeNull()
    })

    it('should find matching import in history', async () => {
      vi.mocked(dataStore.getImportHistory).mockResolvedValue([
        {
          run_id: 'run-001',
          statement_file: 'statement.pdf',
          card_id: 'card-visa',
          month: '2024-01',
          imported_at: '2024-01-31T00:00:00Z',
          status: 'completed',
          fingerprint: 'fp-12345',
        },
      ])

      const result = await findExistingImportByFingerprint('fp-12345')

      expect(result).toEqual({
        type: 'history',
        run_id: 'run-001',
        month: '2024-01',
      })
    })

    it('should match by fingerprint and card_id', async () => {
      vi.mocked(dataStore.getImportHistory).mockResolvedValue([
        {
          run_id: 'run-001',
          statement_file: 'statement.pdf',
          card_id: 'card-visa',
          month: '2024-01',
          imported_at: '2024-01-31T00:00:00Z',
          status: 'completed',
          fingerprint: 'fp-12345',
        },
        {
          run_id: 'run-002',
          statement_file: 'statement.pdf',
          card_id: 'card-mastercard',
          month: '2024-01',
          imported_at: '2024-01-31T00:00:00Z',
          status: 'completed',
          fingerprint: 'fp-12345',
        },
      ])

      const result = await findExistingImportByFingerprint('fp-12345', 'card-mastercard')

      expect(result?.run_id).toBe('run-002')
    })

    it('should return null if no match found', async () => {
      vi.mocked(dataStore.getImportHistory).mockResolvedValue([])
      vi.mocked(dataStore.listPendingRunIds).mockResolvedValue([])

      const result = await findExistingImportByFingerprint('fp-nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('persistExtractionToPending', () => {
    it('should persist extraction with FX conversion', async () => {
      vi.mocked(fxService.convertAmount).mockResolvedValue({
        amount: 975.00,
        currency: 'TRY',
        originalAmount: 30.00,
        originalCurrency: 'USD',
        fxRate: 32.50,
        source: 'api',
      })

      const extraction: StatementExtractionInput = {
        run_id: 'run-001',
        model: 'gpt-4',
        summary: {
          transactions: 1,
          total_spend: 30.00,
          currency: 'USD',
        },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -30.00,
            currency: 'USD',
            transaction_date: '2024-01-10',
            merchant: 'Amazon',
          },
        ],
      }

      vi.mocked(dataStore.savePendingExtraction).mockResolvedValue()

      const result = await persistExtractionToPending('run-001', extraction, {
        statementFile: 'statement.pdf',
        cardId: 'card-visa',
        ownerId: 'owner-arman',
      })

      expect(result.records).toHaveLength(1)
      expect(result.records[0]?.record.amount).toBe(975.00)
      expect(result.records[0]?.record.currency).toBe('TRY')
      expect(result.records[0]?.record.original_amount).toBe(-30.00)
      expect(result.records[0]?.record.original_currency).toBe('USD')
      expect(result.records[0]?.record.fx_rate).toBe(32.50)
      expect(dataStore.savePendingExtraction).toHaveBeenCalled()
    })

    it('should handle TRY currency without conversion', async () => {
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
            category_id: 'cat-groceries',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Migros',
          },
        ],
      }

      vi.mocked(dataStore.savePendingExtraction).mockResolvedValue()

      const result = await persistExtractionToPending('run-002', extraction, {
        statementFile: 'statement.pdf',
      })

      expect(result.records).toHaveLength(1)
      expect(result.records[0]?.record.amount).toBe(-500.00)
      expect(result.records[0]?.record.currency).toBe('TRY')
      expect(result.records[0]?.record.fx_rate).toBe(1)
    })

    it('should infer month from transaction date', async () => {
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
            category_id: 'cat-groceries',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-03-15',
            merchant: 'Store',
          },
        ],
      }

      vi.mocked(dataStore.savePendingExtraction).mockResolvedValue()

      const result = await persistExtractionToPending('run-003', extraction, {
        statementFile: 'statement.pdf',
      })

      expect(result.primaryMonth).toBe('2024-03')
      expect(result.months).toContain('2024-03')
    })

    it('should use explicit month when provided', async () => {
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
            category_id: 'cat-groceries',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store',
          },
        ],
      }

      vi.mocked(dataStore.savePendingExtraction).mockResolvedValue()

      const result = await persistExtractionToPending('run-004', extraction, {
        statementFile: 'statement.pdf',
        month: '2024-02',
      })

      expect(result.primaryMonth).toBe('2024-01') // Uses transaction date, not override
    })

    it('should set default category when missing', async () => {
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
            // No category_id
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store',
          },
        ],
      }

      vi.mocked(dataStore.savePendingExtraction).mockResolvedValue()

      const result = await persistExtractionToPending('run-005', extraction, {
        statementFile: 'statement.pdf',
      })

      expect(result.records[0]?.record.category_id).toBe('cat-other')
    })

    it('should handle multiple transactions across different months', async () => {
      const extraction: StatementExtractionInput = {
        run_id: 'run-006',
        model: 'gpt-4',
        summary: {
          transactions: 2,
          total_spend: 800.00,
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
            merchant: 'Store A',
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-dining',
            amount: -300.00,
            currency: 'TRY',
            transaction_date: '2024-02-05',
            merchant: 'Store B',
          },
        ],
      }

      vi.mocked(dataStore.savePendingExtraction).mockResolvedValue()

      const result = await persistExtractionToPending('run-006', extraction, {
        statementFile: 'statement.pdf',
      })

      expect(result.months).toHaveLength(2)
      expect(result.months).toContain('2024-01')
      expect(result.months).toContain('2024-02')
    })
  })

  describe('commitExtraction', () => {
    it('should commit extraction and save to database', async () => {
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

      await commitExtraction(extraction, {
        statementFile: 'statement.pdf',
        cardId: 'card-visa',
        fingerprint: 'fp-12345',
      })

      expect(dataStore.createOrUpdateTransaction).toHaveBeenCalledTimes(1)
      expect(dataStore.appendImportHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          run_id: 'run-001',
          statement_file: 'statement.pdf',
          card_id: 'card-visa',
          status: 'completed',
          fingerprint: 'fp-12345',
        })
      )
    })

    it('should auto-create missing categories', async () => {
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

      await commitExtraction(extraction, {
        statementFile: 'statement.pdf',
      })

      expect(dataStore.saveCategories).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed transaction dates', async () => {
      const extraction: StatementExtraction = {
        run_id: 'run-edge-001',
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
            merchant: 'Store',
          },
        ],
      }

      expect(() => validateExtraction(extraction)).not.toThrow()
    })

    it('should handle missing optional fields', async () => {
      const extraction: StatementExtraction = {
        run_id: 'run-edge-002',
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
            merchant: 'Store',
            // Missing: description, notes, post_date, etc.
          },
        ],
      }

      const result = validateExtraction(extraction)
      expect(result.transactions[0]).toBeDefined()
    })

    it('should handle very large amounts', async () => {
      const extraction: StatementExtraction = {
        run_id: 'run-edge-003',
        model: 'gpt-4',
        summary: {
          transactions: 1,
          total_spend: 999999.99,
          currency: 'TRY',
        },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -999999.99,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Expensive Store',
          },
        ],
      }

      const result = validateExtraction(extraction)
      expect(result.transactions[0]?.amount).toBe(-999999.99)
      expect(result.summary.total_spend).toBe(999999.99)
    })

    it('should handle special characters in merchant names', async () => {
      const extraction: StatementExtraction = {
        run_id: 'run-edge-004',
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
            merchant: "McDonald's & Co. (İstanbul)",
          },
        ],
      }

      const result = validateExtraction(extraction)
      expect(result.transactions[0]?.merchant).toBe("McDonald's & Co. (İstanbul)")
    })
  })
})
