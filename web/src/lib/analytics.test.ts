import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildDashboardSummary, getTransactionsGroupedByCard, getDistinctFilters } from './analytics'
import * as dataStore from './data-store'
import type { Category, Owner, Card, TransactionFile, TransactionRecord } from './types'

// Mock the data-store module
vi.mock('./data-store')

// Test user ID for multi-user support
const TEST_USER_ID = 'test-user-id'

describe('analytics.ts', () => {
  const mockCategories: Category[] = [
    { id: 'cat-groceries', name: 'Groceries', color: '#22c55e' },
    { id: 'cat-dining', name: 'Dining', color: '#ef4444' },
    { id: 'cat-transport', name: 'Transport', color: '#3b82f6' },
  ]

  const mockOwners: Owner[] = [
    { id: 'owner-arman', label: 'Arman' },
    { id: 'owner-jane', label: 'Jane' },
  ]

  const mockCards: Card[] = [
    { id: 'card-visa', name: 'Visa Gold', issuer: 'Akbank', last4: '1234', currency: 'TRY' },
    { id: 'card-mastercard', name: 'Mastercard Platinum', issuer: 'Garanti', last4: '5678', currency: 'USD' },
  ]

  beforeEach(() => {
    vi.mocked(dataStore.getCategories).mockResolvedValue(mockCategories)
    vi.mocked(dataStore.getOwners).mockResolvedValue(mockOwners)
    vi.mocked(dataStore.getCards).mockResolvedValue(mockCards)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('buildDashboardSummary', () => {
    it('should return null when there are no transaction months', async () => {
      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue([])

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result).toBeNull()
    })

    it('should return null when transaction file is not found', async () => {
      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(null)

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result).toBeNull()
    })

    it('should calculate correct spending totals for a single transaction', async () => {
      const mockTransactionFile: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-15T00:00:00Z' },
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
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(mockTransactionFile)

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result).not.toBeNull()
      expect(result?.total_spent).toBe(500.00)
      expect(result?.net).toBe(-500.00)
      expect(result?.transactions).toBe(1)
      expect(result?.currency).toBe('TRY')
    })

    it('should handle multiple transactions with negative amounts (spending)', async () => {
      const mockTransactionFile: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-15T00:00:00Z' },
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
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-jane',
            category_id: 'cat-dining',
            amount: -300.50,
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Restaurant',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(mockTransactionFile)

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result?.total_spent).toBe(800.50)
      expect(result?.net).toBe(-800.50)
      expect(result?.transactions).toBe(2)
    })

    it('should handle mixed positive and negative amounts (refunds)', async () => {
      const mockTransactionFile: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-15T00:00:00Z' },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -1000.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: 200.00, // refund
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Store Refund',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(mockTransactionFile)

      const result = await buildDashboardSummary(TEST_USER_ID)

      // Only negative amounts count as spending
      expect(result?.total_spent).toBe(1000.00)
      // Net includes both
      expect(result?.net).toBe(-800.00)
      expect(result?.transactions).toBe(2)
    })

    it('should calculate correct breakdowns by category', async () => {
      const mockTransactionFile: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-15T00:00:00Z' },
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
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
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
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
          {
            id: 'txn-003',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -200.00,
            currency: 'TRY',
            transaction_date: '2024-01-14',
            merchant: 'Carrefour',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(mockTransactionFile)

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result?.by_category).toHaveLength(2)

      // Should be sorted by total descending
      const groceries = result?.by_category[0]
      expect(groceries?.key).toBe('cat-groceries')
      expect(groceries?.label).toBe('Groceries')
      expect(groceries?.total).toBe(700.00)
      expect(groceries?.net).toBe(-700.00)
      expect(groceries?.count).toBe(2)
      expect(groceries?.percentage).toBe(70.00)

      const dining = result?.by_category[1]
      expect(dining?.key).toBe('cat-dining')
      expect(dining?.label).toBe('Dining')
      expect(dining?.total).toBe(300.00)
      expect(dining?.percentage).toBe(30.00)
    })

    it('should calculate correct breakdowns by owner', async () => {
      const mockTransactionFile: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-15T00:00:00Z' },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -600.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Migros',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-jane',
            category_id: 'cat-dining',
            amount: -400.00,
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Restaurant',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(mockTransactionFile)

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result?.by_owner).toHaveLength(2)

      const arman = result?.by_owner[0]
      expect(arman?.key).toBe('owner-arman')
      expect(arman?.label).toBe('Arman')
      expect(arman?.total).toBe(600.00)
      expect(arman?.percentage).toBe(60.00)

      const jane = result?.by_owner[1]
      expect(jane?.key).toBe('owner-jane')
      expect(jane?.label).toBe('Jane')
      expect(jane?.total).toBe(400.00)
      expect(jane?.percentage).toBe(40.00)
    })

    it('should calculate correct breakdowns by card', async () => {
      const mockTransactionFile: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-15T00:00:00Z' },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -700.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Migros',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
          {
            id: 'txn-002',
            card_id: 'card-mastercard',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-jane',
            category_id: 'cat-dining',
            amount: -300.00,
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Restaurant',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(mockTransactionFile)

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result?.by_card).toHaveLength(2)

      const visa = result?.by_card[0]
      expect(visa?.key).toBe('card-visa')
      expect(visa?.label).toBe('Visa Gold')
      expect(visa?.total).toBe(700.00)
      expect(visa?.percentage).toBe(70.00)
    })

    it('should handle unknown categories, owners, and cards gracefully', async () => {
      const mockTransactionFile: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-15T00:00:00Z' },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-unknown',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-unknown',
            category_id: 'cat-unknown',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Unknown Store',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(mockTransactionFile)

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result).not.toBeNull()

      const category = result?.by_category[0]
      expect(category?.label).toBe('cat-unknown')
      expect(category?.entity).toBeUndefined()

      const owner = result?.by_owner[0]
      expect(owner?.label).toBe('owner-unknown')
      expect(owner?.entity).toBeUndefined()

      const card = result?.by_card[0]
      expect(card?.label).toBe('card-unknown')
    })

    it('should calculate trend data correctly across multiple months', async () => {
      const month1: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-31T00:00:00Z' },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -1000.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store',
            created_at: '2024-01-31T00:00:00Z',
            updated_at: '2024-01-31T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      const month2: TransactionFile = {
        meta: { month: '2024-02', currency: 'TRY', generated_at: '2024-02-29T00:00:00Z' },
        transactions: [
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -1500.00,
            currency: 'TRY',
            transaction_date: '2024-02-10',
            merchant: 'Store',
            created_at: '2024-02-29T00:00:00Z',
            updated_at: '2024-02-29T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-02', '2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockImplementation(async (month) => {
        if (month === '2024-01') return month1
        if (month === '2024-02') return month2
        return null
      })

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result?.month).toBe('2024-02')
      expect(result?.trend).toHaveLength(2)
      expect(result?.trend[0]?.month).toBe('2024-01')
      expect(result?.trend[0]?.total_spent).toBe(1000.00)
      expect(result?.trend[1]?.month).toBe('2024-02')
      expect(result?.trend[1]?.total_spent).toBe(1500.00)
    })

    it('should calculate vs_previous correctly', async () => {
      const month1: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-31T00:00:00Z' },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -1000.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store',
            created_at: '2024-01-31T00:00:00Z',
            updated_at: '2024-01-31T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      const month2: TransactionFile = {
        meta: { month: '2024-02', currency: 'TRY', generated_at: '2024-02-29T00:00:00Z' },
        transactions: [
          {
            id: 'txn-002',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -1200.00,
            currency: 'TRY',
            transaction_date: '2024-02-10',
            merchant: 'Store',
            created_at: '2024-02-29T00:00:00Z',
            updated_at: '2024-02-29T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-02', '2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockImplementation(async (month) => {
        if (month === '2024-01') return month1
        if (month === '2024-02') return month2
        return null
      })

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result?.vs_previous).toBeDefined()
      expect(result?.vs_previous?.month).toBe('2024-01')
      expect(result?.vs_previous?.total_spent).toBe(1000.00)
      expect(result?.vs_previous?.change).toBe(200.00)
      expect(result?.vs_previous?.pct_change).toBe(20.00)
    })

    it('should handle empty transaction list', async () => {
      const mockTransactionFile: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-15T00:00:00Z' },
        transactions: [],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(mockTransactionFile)

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result).not.toBeNull()
      expect(result?.total_spent).toBe(0)
      expect(result?.net).toBe(0)
      expect(result?.transactions).toBe(0)
      expect(result?.by_category).toHaveLength(0)
      expect(result?.by_owner).toHaveLength(0)
      expect(result?.by_card).toHaveLength(0)
    })

    it('should use explicit target month when provided', async () => {
      const month1: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-31T00:00:00Z' },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -1000.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store',
            created_at: '2024-01-31T00:00:00Z',
            updated_at: '2024-01-31T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-02', '2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(month1)

      const result = await buildDashboardSummary(TEST_USER_ID, '2024-01')

      expect(result?.month).toBe('2024-01')
      expect(result?.total_spent).toBe(1000.00)
    })

    it('should handle percentage calculation when total is zero', async () => {
      const mockTransactionFile: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-15T00:00:00Z' },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-visa',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: 100.00, // positive amount (refund only)
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Refund',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(mockTransactionFile)

      const result = await buildDashboardSummary(TEST_USER_ID)

      expect(result?.total_spent).toBe(0)
      expect(result?.by_category[0]?.percentage).toBe(0)
    })
  })

  describe('getTransactionsGroupedByCard', () => {
    it('should group transactions by card correctly', async () => {
      const month1: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-31T00:00:00Z' },
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
            created_at: '2024-01-31T00:00:00Z',
            updated_at: '2024-01-31T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
          {
            id: 'txn-002',
            card_id: 'card-mastercard',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-jane',
            category_id: 'cat-dining',
            amount: -300.00,
            currency: 'TRY',
            transaction_date: '2024-01-12',
            merchant: 'Store B',
            created_at: '2024-01-31T00:00:00Z',
            updated_at: '2024-01-31T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.getCards).mockResolvedValue(mockCards)
      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(month1)

      const result = await getTransactionsGroupedByCard(TEST_USER_ID)

      expect(result).toHaveLength(2)
      expect(result[0]?.card_id).toBe('card-visa')
      expect(result[0]?.card_name).toBe('Visa Gold')
      expect(result[0]?.month).toBe('2024-01')
      expect(result[0]?.transactions).toHaveLength(1)

      expect(result[1]?.card_id).toBe('card-mastercard')
      expect(result[1]?.card_name).toBe('Mastercard Platinum')
    })

    it('should handle unknown card IDs', async () => {
      const month1: TransactionFile = {
        meta: { month: '2024-01', currency: 'TRY', generated_at: '2024-01-31T00:00:00Z' },
        transactions: [
          {
            id: 'txn-001',
            card_id: 'card-unknown',
            statement_ref: 'statement.pdf',
            owner_id: 'owner-arman',
            category_id: 'cat-groceries',
            amount: -500.00,
            currency: 'TRY',
            transaction_date: '2024-01-10',
            merchant: 'Store',
            created_at: '2024-01-31T00:00:00Z',
            updated_at: '2024-01-31T00:00:00Z',
            flags: { review: false, duplicate: false },
          },
        ],
      }

      vi.mocked(dataStore.getCards).mockResolvedValue(mockCards)
      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue(['2024-01'])
      vi.mocked(dataStore.loadTransactionFile).mockResolvedValue(month1)

      const result = await getTransactionsGroupedByCard(TEST_USER_ID)

      expect(result).toHaveLength(1)
      expect(result[0]?.card_name).toBe('card-unknown')
    })

    it('should handle empty months', async () => {
      vi.mocked(dataStore.getCards).mockResolvedValue(mockCards)
      vi.mocked(dataStore.listTransactionMonths).mockResolvedValue([])

      const result = await getTransactionsGroupedByCard(TEST_USER_ID)

      expect(result).toHaveLength(0)
    })
  })

  describe('getDistinctFilters', () => {
    it('should return distinct filter options', async () => {
      const mockTransactions: TransactionRecord[] = [
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
          created_at: '2024-01-31T00:00:00Z',
          updated_at: '2024-01-31T00:00:00Z',
          flags: { review: false, duplicate: false },
        },
        {
          id: 'txn-002',
          card_id: 'card-mastercard',
          statement_ref: 'statement.pdf',
          owner_id: 'owner-jane',
          category_id: 'cat-dining',
          amount: -300.00,
          currency: 'TRY',
          transaction_date: '2023-12-15',
          merchant: 'Restaurant',
          created_at: '2024-01-31T00:00:00Z',
          updated_at: '2024-01-31T00:00:00Z',
          flags: { review: false, duplicate: false },
        },
      ]

      vi.mocked(dataStore.getCards).mockResolvedValue(mockCards)
      vi.mocked(dataStore.getCategories).mockResolvedValue(mockCategories)
      vi.mocked(dataStore.getOwners).mockResolvedValue(mockOwners)
      vi.mocked(dataStore.loadAllTransactions).mockResolvedValue(mockTransactions)

      const result = await getDistinctFilters(TEST_USER_ID)

      expect(result.cards).toEqual(mockCards)
      expect(result.categories).toEqual(mockCategories)
      expect(result.owners).toEqual(mockOwners)
      expect(result.years).toEqual(['2023', '2024'])
      expect(result.merchants).toEqual(['Migros', 'Restaurant'])
    })

    it('should handle empty transactions', async () => {
      vi.mocked(dataStore.getCards).mockResolvedValue(mockCards)
      vi.mocked(dataStore.getCategories).mockResolvedValue(mockCategories)
      vi.mocked(dataStore.getOwners).mockResolvedValue(mockOwners)
      vi.mocked(dataStore.loadAllTransactions).mockResolvedValue([])

      const result = await getDistinctFilters(TEST_USER_ID)

      expect(result.years).toEqual([])
      expect(result.merchants).toEqual([])
    })
  })
})
