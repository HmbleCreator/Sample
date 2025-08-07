import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { createTRPCContext } from '../trpc'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// Mock Auth0 config
jest.mock('../../../auth0.config', () => ({
  getSession: jest.fn(),
  refreshSession: jest.fn(),
}))

// Mock Next.js request/response
const mockReq = {
  headers: {},
  cookies: {},
} as any

const mockRes = {
  setHeader: jest.fn(),
  getHeader: jest.fn(),
} as any

describe('TRPC Context', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn(),
        signInWithPassword: jest.fn(),
      },
    }

    mockCreateClient.mockReturnValue(mockSupabaseClient)
  })

  describe('Context Creation', () => {
    it('should create context with authenticated user', async () => {
      const mockSession = {
        user: {
          sub: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
        },
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }

      const { getSession } = require('@/auth0.config')
      getSession.mockResolvedValue(mockSession)

      const context = await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(context).toHaveProperty('session')
      expect(context).toHaveProperty('supabase')
      expect(context.session).toEqual(mockSession)
      expect(mockCreateClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          global: {
            headers: {
              Authorization: `Bearer ${mockSession.idToken}`,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        })
      )
    })

    it('should create context without authenticated user', async () => {
      const { getSession } = require('@/auth0.config')
      getSession.mockResolvedValue(null)

      const context = await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(context).toHaveProperty('session')
      expect(context).toHaveProperty('supabase')
      expect(context.session).toBeNull()
      expect(mockCreateClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })
      )
    })

    it('should handle JWT expiration and retry with refreshed token', async () => {
      const mockSession = {
        user: { sub: 'test-user-id' },
        idToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
      }

      const mockRefreshedSession = {
        user: { sub: 'test-user-id' },
        idToken: 'new-token',
        refreshToken: 'valid-refresh-token',
      }

      const { getSession, refreshSession } = require('@/auth0.config')
      getSession.mockResolvedValue(mockSession)
      refreshSession.mockResolvedValue(mockRefreshedSession)

      // Mock Supabase to fail first time (JWT expired), succeed second time
      mockSupabaseClient.select
        .mockRejectedValueOnce({
          code: 'PGRST301',
          message: 'JWT expired',
        })
        .mockResolvedValueOnce({
          data: [{ id: 'test' }],
          error: null,
        })

      const context = await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(context.session).toEqual(mockRefreshedSession)
      expect(refreshSession).toHaveBeenCalledWith(
        mockReq,
        mockRes,
        'valid-refresh-token'
      )
    })

    it('should handle refresh token failure', async () => {
      const mockSession = {
        user: { sub: 'test-user-id' },
        idToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
      }

      const { getSession, refreshSession } = require('@/auth0.config')
      getSession.mockResolvedValue(mockSession)
      refreshSession.mockResolvedValue(null) // Refresh failed

      mockSupabaseClient.select.mockRejectedValue({
        code: 'PGRST301',
        message: 'JWT expired',
      })

      const context = await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(context.session).toBeNull()
      expect(refreshSession).toHaveBeenCalled()
    })

    it('should handle Supabase connection test failure', async () => {
      const mockSession = {
        user: { sub: 'test-user-id' },
        idToken: 'valid-token',
      }

      const { getSession } = require('@/auth0.config')
      getSession.mockResolvedValue(mockSession)

      mockSupabaseClient.select.mockRejectedValue({
        code: 'PGRST000',
        message: 'Connection failed',
      })

      const context = await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(context.session).toEqual(mockSession)
      expect(context.supabase).toBeDefined()
    })
  })

  describe('Supabase Client Configuration', () => {
    it('should configure Supabase client with correct headers for authenticated user', async () => {
      const mockSession = {
        user: { sub: 'test-user-id' },
        idToken: 'test-token',
      }

      const { getSession } = require('@/auth0.config')
      getSession.mockResolvedValue(mockSession)

      mockSupabaseClient.select.mockResolvedValue({
        data: [{ id: 'test' }],
        error: null,
      })

      await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(mockCreateClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          global: {
            headers: {
              Authorization: `Bearer test-token`,
            },
          },
        })
      )
    })

    it('should configure Supabase client without auth headers for unauthenticated user', async () => {
      const { getSession } = require('@/auth0.config')
      getSession.mockResolvedValue(null)

      await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(mockCreateClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle Auth0 session errors', async () => {
      const { getSession } = require('@/auth0.config')
      getSession.mockRejectedValue(new Error('Auth0 error'))

      const context = await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(context.session).toBeNull()
      expect(context.supabase).toBeDefined()
    })

    it('should handle missing environment variables', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      const { getSession } = require('@/auth0.config')
      getSession.mockResolvedValue(null)

      await expect(createTRPCContext({
        req: mockReq,
        res: mockRes,
      })).rejects.toThrow()

      // Restore environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
    })
  })

  describe('Session Refresh Logic', () => {
    it('should not attempt refresh when no refresh token available', async () => {
      const mockSession = {
        user: { sub: 'test-user-id' },
        idToken: 'expired-token',
        // No refresh token
      }

      const { getSession, refreshSession } = require('@/auth0.config')
      getSession.mockResolvedValue(mockSession)

      mockSupabaseClient.select.mockRejectedValue({
        code: 'PGRST301',
        message: 'JWT expired',
      })

      const context = await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(refreshSession).not.toHaveBeenCalled()
      expect(context.session).toBeNull()
    })

    it('should handle multiple JWT expiration scenarios', async () => {
      const mockSession = {
        user: { sub: 'test-user-id' },
        idToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
      }

      const { getSession, refreshSession } = require('@/auth0.config')
      getSession.mockResolvedValue(mockSession)
      refreshSession.mockResolvedValue(null) // Refresh fails

      // Mock different JWT error codes
      mockSupabaseClient.select
        .mockRejectedValueOnce({ code: 'PGRST301' })
        .mockRejectedValueOnce({ message: 'JWT expired' })
        .mockRejectedValueOnce({ message: 'invalid JWT' })

      const context = await createTRPCContext({
        req: mockReq,
        res: mockRes,
      })

      expect(refreshSession).toHaveBeenCalled()
      expect(context.session).toBeNull()
    })
  })
})
