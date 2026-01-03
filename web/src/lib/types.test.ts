import { describe, it, expect } from 'vitest'
import type {
  Card,
  Category,
  TransactionRecord,
  TransactionFlags,
  ImportRun,
  ImportRunSummary,
} from './types'

describe('Type definitions', () => {
  describe('Card type', () => {
    it('should accept valid card data', () => {
      const card: Card = {
        id: 'card-123',
        name: 'Visa Gold',
        issuer: 'Akbank',
        last4: '4567',
        currency: 'TRY',
      }

      expect(card.id).toBe('card-123')
      expect(card.name).toBe('Visa Gold')
      expect(card.issuer).toBe('Akbank')
      expect(card.last4).toBe('4567')
      expect(card.currency).toBe('TRY')
    })
  })

  describe('Category type', () => {
    it('should accept valid category data', () => {
      const category: Category = {
        id: 'cat-groceries',
        name: 'Groceries',
        color: '#22c55e',
      }

      expect(category.id).toBe('cat-groceries')
      expect(category.name).toBe('Groceries')
      expect(category.color).toBe('#22c55e')
    })

    it('should allow optional color', () => {
      const category: Category = {
        id: 'cat-dining',
        name: 'Dining',
      }

      expect(category.id).toBe('cat-dining')
      expect(category.color).toBeUndefined()
    })
  })

  describe('TransactionFlags type', () => {
    it('should have required boolean flags', () => {
      const flags: TransactionFlags = {
        review: true,
        duplicate: false,
      }

      expect(flags.review).toBe(true)
      expect(flags.duplicate).toBe(false)
    })
  })

  describe('TransactionRecord type', () => {
    it('should accept valid transaction data', () => {
      const transaction: TransactionRecord = {
        id: 'txn-001',
        card_id: 'card-123',
        statement_ref: 'statement-jan-2024.pdf',
        owner_id: 'owner-1',
        category_id: 'cat-groceries',
        amount: -500.00,
        currency: 'TRY',
        transaction_date: '2024-01-15',
        merchant: 'Migros',
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:00:00Z',
        flags: {
          review: false,
          duplicate: false,
        },
      }

      expect(transaction.id).toBe('txn-001')
      expect(transaction.amount).toBe(-500.00)
      expect(transaction.merchant).toBe('Migros')
      expect(transaction.flags.review).toBe(false)
    })

    it('should allow optional fields', () => {
      const transaction: TransactionRecord = {
        id: 'txn-002',
        card_id: 'card-456',
        statement_ref: 'statement.pdf',
        owner_id: 'owner-2',
        category_id: 'cat-other',
        amount: -1000.00,
        currency: 'TRY',
        transaction_date: '2024-01-20',
        merchant: 'Amazon',
        created_at: '2024-01-21T10:00:00Z',
        updated_at: '2024-01-21T10:00:00Z',
        flags: { review: false, duplicate: false },
        // Optional fields
        original_amount: -30.00,
        original_currency: 'USD',
        fx_rate: 32.50,
        description: 'Online purchase',
        notes: 'Gift for birthday',
      }

      expect(transaction.original_amount).toBe(-30.00)
      expect(transaction.original_currency).toBe('USD')
      expect(transaction.fx_rate).toBe(32.50)
    })
  })

  describe('ImportRunSummary type', () => {
    it('should accept valid summary data', () => {
      const summary: ImportRunSummary = {
        transactions: 25,
        total_spend: 15000.00,
        currency: 'TRY',
      }

      expect(summary.transactions).toBe(25)
      expect(summary.total_spend).toBe(15000.00)
      expect(summary.currency).toBe('TRY')
    })
  })

  describe('ImportRun type', () => {
    it('should accept valid import run data', () => {
      const importRun: ImportRun = {
        run_id: 'run-abc123',
        statement_file: 'january-2024.pdf',
        card_id: 'card-123',
        month: '2024-01',
        imported_at: '2024-01-31T15:00:00Z',
        status: 'completed',
        summary: {
          transactions: 50,
          total_spend: 25000.00,
          currency: 'TRY',
        },
      }

      expect(importRun.run_id).toBe('run-abc123')
      expect(importRun.status).toBe('completed')
      expect(importRun.summary?.transactions).toBe(50)
    })

    it('should handle pending status', () => {
      const importRun: ImportRun = {
        run_id: 'run-pending',
        statement_file: 'february-2024.pdf',
        card_id: 'card-456',
        month: '2024-02',
        imported_at: '2024-02-15T10:00:00Z',
        status: 'pending',
      }

      expect(importRun.status).toBe('pending')
      expect(importRun.summary).toBeUndefined()
    })

    it('should handle failed status with error', () => {
      const importRun: ImportRun = {
        run_id: 'run-failed',
        statement_file: 'corrupted.pdf',
        card_id: 'card-789',
        month: '2024-03',
        imported_at: '2024-03-01T08:00:00Z',
        status: 'failed',
        error: 'Failed to parse PDF: Invalid format',
      }

      expect(importRun.status).toBe('failed')
      expect(importRun.error).toBe('Failed to parse PDF: Invalid format')
    })
  })
})
