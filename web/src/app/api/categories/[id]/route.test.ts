import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { createMockRequest, getResponseJson, mockData } from '@/test/api-test-utils'

// Mock the data-store module
vi.mock('@/lib/data-store', () => ({
  getCategories: vi.fn().mockResolvedValue(mockData.categories),
  upsertCategory: vi.fn((category) => Promise.resolve(category)),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
}))

// Import after mocking
const { PUT, DELETE } = await import('./route')

describe('PUT /api/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates category name successfully', async () => {
    const updateData = {
      name: 'Updated Groceries',
    }

    const request = createMockRequest('http://localhost:3000/api/categories/cat-groceries', {
      method: 'PUT',
      body: updateData,
    })

    const context = { params: { id: 'cat-groceries' } }
    const response = await PUT(request as unknown as NextRequest, context)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('category')
    expect(data.category.name).toBe(updateData.name)
  })

  it('updates category color successfully', async () => {
    const updateData = {
      color: '#ff0000',
    }

    const request = createMockRequest('http://localhost:3000/api/categories/cat-groceries', {
      method: 'PUT',
      body: updateData,
    })

    const context = { params: { id: 'cat-groceries' } }
    const response = await PUT(request as unknown as NextRequest, context)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.category.color).toBe(updateData.color)
  })

  it('updates both name and color', async () => {
    const updateData = {
      name: 'Food & Beverages',
      color: '#00ff00',
    }

    const request = createMockRequest('http://localhost:3000/api/categories/cat-groceries', {
      method: 'PUT',
      body: updateData,
    })

    const context = { params: { id: 'cat-groceries' } }
    const response = await PUT(request as unknown as NextRequest, context)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data.category.name).toBe(updateData.name)
    expect(data.category.color).toBe(updateData.color)
  })

  it('returns 404 for non-existent category', async () => {
    const updateData = {
      name: 'Updated Name',
    }

    const request = createMockRequest('http://localhost:3000/api/categories/cat-nonexistent', {
      method: 'PUT',
      body: updateData,
    })

    const context = { params: { id: 'cat-nonexistent' } }
    const response = await PUT(request as unknown as NextRequest, context)

    expect(response.status).toBe(404)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.error).toContain('not found')
  })

  it('returns 400 for invalid update data', async () => {
    const invalidData = {
      name: '', // Empty string not allowed
    }

    const request = createMockRequest('http://localhost:3000/api/categories/cat-groceries', {
      method: 'PUT',
      body: invalidData,
    })

    const context = { params: { id: 'cat-groceries' } }
    const response = await PUT(request as unknown as NextRequest, context)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('preserves existing fields when not updated', async () => {
    const { upsertCategory } = vi.mocked(await import('@/lib/data-store'))

    const updateData = {
      name: 'New Name',
      // color not provided, should preserve existing
    }

    const request = createMockRequest('http://localhost:3000/api/categories/cat-groceries', {
      method: 'PUT',
      body: updateData,
    })

    const context = { params: { id: 'cat-groceries' } }
    await PUT(request as unknown as NextRequest, context)

    expect(upsertCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cat-groceries',
        name: 'New Name',
        color: '#22c55e', // Original color preserved
      }),
    )
  })

  it('handles async params object', async () => {
    const updateData = {
      name: 'Async Test',
    }

    const request = createMockRequest('http://localhost:3000/api/categories/cat-dining', {
      method: 'PUT',
      body: updateData,
    })

    // Test with Promise<params>
    const context = { params: Promise.resolve({ id: 'cat-dining' }) }
    const response = await PUT(request as unknown as NextRequest, context)

    expect(response.status).toBe(200)
  })
})

describe('DELETE /api/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes category successfully', async () => {
    const request = createMockRequest('http://localhost:3000/api/categories/cat-groceries', {
      method: 'DELETE',
    })

    const context = { params: { id: 'cat-groceries' } }
    const response = await DELETE(request as unknown as NextRequest, context)

    expect(response.status).toBe(200)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('ok')
    expect(data.ok).toBe(true)
  })

  it('calls deleteCategory with correct id', async () => {
    const { deleteCategory } = vi.mocked(await import('@/lib/data-store'))

    const request = createMockRequest('http://localhost:3000/api/categories/cat-dining', {
      method: 'DELETE',
    })

    const context = { params: { id: 'cat-dining' } }
    await DELETE(request as unknown as NextRequest, context)

    expect(deleteCategory).toHaveBeenCalledWith('cat-dining')
  })

  it('returns 404 when delete fails', async () => {
    const { deleteCategory } = vi.mocked(await import('@/lib/data-store'))
    deleteCategory.mockRejectedValueOnce(new Error('Category not found'))

    const request = createMockRequest('http://localhost:3000/api/categories/cat-nonexistent', {
      method: 'DELETE',
    })

    const context = { params: { id: 'cat-nonexistent' } }
    const response = await DELETE(request as unknown as NextRequest, context)

    expect(response.status).toBe(404)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
  })

  it('handles async params object', async () => {
    const request = createMockRequest('http://localhost:3000/api/categories/cat-transport', {
      method: 'DELETE',
    })

    // Test with Promise<params>
    const context = { params: Promise.resolve({ id: 'cat-transport' }) }
    const response = await DELETE(request as unknown as NextRequest, context)

    expect(response.status).toBe(200)
  })
})
