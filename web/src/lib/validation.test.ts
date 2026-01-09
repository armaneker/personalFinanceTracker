import { describe, it, expect } from 'vitest'
import { validateExtraction, sanitizeExtraction } from './validation'
import type { StatementExtraction } from './types'
import type { StatementExtractionInput } from './schemas'

describe('validation.ts', () => {
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

  describe('sanitizeExtraction', () => {
    it('should filter non-spending transactions and recalculate summary', () => {
      const input: StatementExtractionInput = {
        run_id: 'run-001',
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
            amount: 200.00,
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Refund',
          },
        ],
      }

      const result = sanitizeExtraction(input)

      expect(result.transactions).toHaveLength(1)
      expect(result.summary.transactions).toBe(1)
      expect(result.summary.total_spend).toBe(500.00)
      expect(result.warnings).toContain('Filtered 1 non-spending transactions (amount >= 0).')
    })
  })
})
