import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, getResponseJson } from '@/test/api-test-utils'

const mockGetUserByEmail = vi.fn()
const mockCreateUser = vi.fn()
const mockHash = vi.fn()

// Mock the repositories and bcrypt
vi.mock('@/db/repositories/users', () => ({
  getUserByEmail: (...args: unknown[]) => mockGetUserByEmail(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
}))

vi.mock('bcryptjs', () => ({
  hash: (...args: unknown[]) => mockHash(...args),
}))

// Import after mocking
const { POST } = await import('./route')

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHash.mockResolvedValue('hashed-password')
    mockGetUserByEmail.mockResolvedValue(null)
    mockCreateUser.mockImplementation((user) => Promise.resolve(user))
  })

  it('creates a new user with valid input', async () => {
    const newUser = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('user')
    expect(data.user).toHaveProperty('id')
    expect(data.user).toHaveProperty('email')
    expect(data.user.email).toBe(newUser.email)
    expect(data.user.name).toBe(newUser.name)
    expect(data.user).not.toHaveProperty('passwordHash')
  })

  it('creates a new user without optional name', async () => {
    const newUser = {
      email: 'test@example.com',
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)

    const data = await getResponseJson(response)
    expect(data.user.email).toBe(newUser.email)
    expect(data.user.name).toBeNull()
  })

  it('returns 409 for duplicate email', async () => {
    mockGetUserByEmail.mockResolvedValue({
      id: 'existing-user',
      email: 'test@example.com',
    })

    const newUser = {
      email: 'test@example.com',
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(409)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.error).toContain('already exists')
    expect(data.code).toBe('DUPLICATE')
  })

  it('returns 400 for invalid email', async () => {
    const newUser = {
      email: 'invalid-email',
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data.details?.fieldErrors?.email).toBeDefined()
  })

  it('returns 400 for short password', async () => {
    const newUser = {
      email: 'test@example.com',
      password: 'short',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data.details?.fieldErrors?.password).toBeDefined()
  })

  it('returns 400 for missing email', async () => {
    const newUser = {
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for missing password', async () => {
    const newUser = {
      email: 'test@example.com',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('hashes password with 10 rounds', async () => {
    const newUser = {
      email: 'test@example.com',
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    await POST(request)

    expect(mockHash).toHaveBeenCalledWith('password123', 10)
  })

  it('generates a unique user ID', async () => {
    const newUser = {
      email: 'test@example.com',
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    await POST(request)

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^usr-[a-z0-9]+$/),
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      })
    )
  })

  it('returns 500 when database insert fails', async () => {
    mockCreateUser.mockRejectedValue(new Error('Database connection failed'))

    const newUser = {
      email: 'test@example.com',
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(500)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.code).toBe('DATABASE_ERROR')
  })

  it('returns 500 when user is not persisted', async () => {
    mockCreateUser.mockResolvedValue(null)

    const newUser = {
      email: 'test@example.com',
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(500)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.code).toBe('DATABASE_ERROR')
  })

  it('returns 409 for UNIQUE constraint violation during insert', async () => {
    mockCreateUser.mockRejectedValue(new Error('UNIQUE constraint failed'))

    const newUser = {
      email: 'test@example.com',
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(409)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.code).toBe('DUPLICATE')
  })

  it('returns 500 for database schema errors', async () => {
    mockCreateUser.mockRejectedValue(new Error('no such column: password_hash'))

    const newUser = {
      email: 'test@example.com',
      password: 'password123',
    }

    const request = createMockRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: newUser,
    })

    const response = await POST(request)

    expect(response.status).toBe(500)

    const data = await getResponseJson(response)
    expect(data).toHaveProperty('error')
    expect(data.code).toBe('DATABASE_ERROR')
    expect(data.error).toContain('database configuration')
  })
})
