import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  findExistingImportByFingerprint,
  commitExtraction,
} from './importer'
import * as dataStore from './data-store'
import * as fxService from './fx-service'
import * as categoryService from './category-service'
import type { Category } from './types'
import type { StatementExtractionInput } from './schemas'

// Mock dependencies
vi.mock('./data-store')
vi.mock('./fx-service')
vi.mock('./category-service')
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
    vi.mocked(dataStore.savePendingExtraction).mockResolvedValue()

    // Mock category service
    vi.mocked(categoryService.ensureCategories).mockResolvedValue()

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

  // validateExtraction tests moved to validation.test.ts

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

  // persistExtractionToPending tests moved to pending-extraction-service (integration tests remain)

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

    it('should call ensureCategories', async () => {
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

      expect(categoryService.ensureCategories).toHaveBeenCalledWith(extraction)
    })
  })

  // Edge case tests moved to appropriate module tests (validation.test.ts, etc.)
})
