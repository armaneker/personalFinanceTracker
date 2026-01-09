import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, getResponseJson, mockData } from '@/test/api-test-utils'

// Mock the data-store module
vi.mock('@/lib/data-store', () => ({
  getCategories: vi.fn().mockResolvedValue(mockData.categories),
  upsertCategory: vi.fn((category) => Promise.resolve(category)),
}))

// Import after mocking
const { GET, POST } = await import('./route')

describe('GET /api/categories', () => {
  it('returns all categories successfully', async () => {
    const response = await GET()

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('categories')
    expect(Array.isArray(data.categories)).toBe(true)
    expect(data.categories.length).toBeGreaterThan(0)
    expect(data.categories[0]).toHaveProperty('id')
    expect(data.categories[0]).toHaveProperty('name')
  })

  it('returns categories with correct structure', async () => {
    const response = await GET()
    const data = await getResponseJson(response)

    data.categories.forEach((category: { id: string; name: string; color?: string }) => {
      const cat = category
      expect(cat).toHaveProperty('id')
      expect(cat).toHaveProperty('name')
      expect(typeof cat.id).toBe('string')
      expect(typeof cat.name).toBe('string')
    })
  })
})

describe('POST /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new category with valid input', async () => {
    const newCategory = {
      name: 'Entertainment',
      color: '#8b5cf6',
    }

    const request = createMockRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: newCategory,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('category')
    expect(data.category).toHaveProperty('id')
    expect(data.category).toHaveProperty('name')
    expect(data.category.name).toBe(newCategory.name)
  })

  it('creates a category without color (optional field)', async () => {
    const newCategory = {
      name: 'Shopping',
    }

    const request = createMockRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: newCategory,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)

    const data = await getResponseJson(response)
    expect(data.category.name).toBe(newCategory.name)
  })

  it('returns 400 for missing name', async () => {
    const invalidCategory = {
      color: '#8b5cf6',
    }

    const request = createMockRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: invalidCategory,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data).toHaveProperty('code')
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data).toHaveProperty('details')
    expect(data.details).toHaveProperty('fieldErrors')
    expect(data.details.fieldErrors).toHaveProperty('name')
  })

  it('returns 400 for empty name', async () => {
    const invalidCategory = {
      name: '',
      color: '#8b5cf6',
    }

    const request = createMockRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: invalidCategory,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('returns 500 for invalid JSON payload', async () => {
    const request = new Request('http://localhost:3000/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    })

    const response = await POST(request)

    expect(response.status).toBe(500)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data).toHaveProperty('code')
    expect(data.code).toBe('INTERNAL_ERROR')
  })

  it('returns 400 for wrong data types', async () => {
    const invalidCategory = {
      name: 123, // Should be string
      color: true, // Should be string
    }

    const request = createMockRequest('http://localhost:3000/api/categories', {
      method: 'POST',
      body: invalidCategory,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })
})
