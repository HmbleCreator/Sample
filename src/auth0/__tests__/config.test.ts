/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll, afterEach } from '@jest/globals';
import type { NextApiRequest, NextApiResponse } from 'next';
import { refreshSession } from '@/auth0.config';

// Extend the global type to include our mocks
declare global {
  namespace NodeJS {
    interface Global {
      fetch: jest.Mock;
    }
  }
}

// Mock Auth0 SDK
jest.mock('@auth0/nextjs-auth0', () => {
  const originalModule = jest.requireActual('@auth0/nextjs-auth0');
  return {
    ...originalModule,
    getSession: jest.fn(),
    updateSession: jest.fn(),
  };
});

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

// Create a simple mock response
const createMockResponse = (data: any = {}, status = 200) => ({
  ok: status >= 200 && status < 300,
  json: () => Promise.resolve(data),
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: new Headers(),
  // Add minimal required Response properties
  body: null,
  bodyUsed: false,
  redirected: false,
  type: 'basic' as const,
  url: '',
  clone: function() { return this; },
  arrayBuffer: function() { return Promise.resolve(new ArrayBuffer(0)); },
  blob: function() { return Promise.resolve(new Blob()); },
  formData: function() { return Promise.resolve(new FormData()); },
  text: function() { return Promise.resolve(''); }
});

// Setup and teardown
beforeEach(() => {
  // Clear all mocks between tests
  jest.clearAllMocks();
  
  // Reset fetch mock implementation
  mockFetch.mockReset();
  
  // Reset Auth0 mocks
  const { getSession, updateSession } = require('@auth0/nextjs-auth0');
  getSession.mockReset();
  updateSession.mockReset();
  
  // Set up default environment variables
  process.env.AUTH0_CLIENT_ID = 'test-client-id';
  process.env.AUTH0_CLIENT_SECRET = 'test-client-secret';
  process.env.AUTH0_ISSUER_BASE_URL = 'https://test.auth0.com';
});

afterAll(() => {
  // Clean up global mocks
  // @ts-ignore
  delete global.fetch;
});

// Create a mock fetch implementation
const mockFetch = jest.fn();

beforeAll(() => {
  // Set default mock implementation
  mockFetch.mockImplementation(() => Promise.resolve(createMockResponse()));
  // Override global.fetch with our mock
  global.fetch = mockFetch as unknown as typeof global.fetch;
});

afterAll(() => {
  // Restore original fetch
  global.fetch = originalFetch;
});

afterEach(() => {
  // Clear all mocks between tests
  jest.clearAllMocks();
  // Reset to default implementation
  mockFetch.mockImplementation(() => Promise.resolve(createMockResponse()));
});

describe('Auth0 Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.AUTH0_CLIENT_ID = 'test-client-id'
    process.env.AUTH0_CLIENT_SECRET = 'test-client-secret'
    process.env.AUTH0_ISSUER_BASE_URL = 'https://test.auth0.com'
  })

  describe('getSession', () => {
    it('should return session when user is authenticated', async () => {
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

      const { getSession: mockGetSession } = require('@auth0/nextjs-auth0')
      mockGetSession.mockResolvedValue(mockSession)

      const mockReq = {} as any
      const mockRes = {} as any

      const result = await getSession(mockReq, mockRes)

      expect(result).toEqual(mockSession)
      expect(mockGetSession).toHaveBeenCalledWith(mockReq, mockRes)
    })

    it('should return null when user is not authenticated', async () => {
      const { getSession: mockGetSession } = require('@auth0/nextjs-auth0')
      mockGetSession.mockResolvedValue(null)

      const mockReq = {} as any
      const mockRes = {} as any

      const result = await getSession(mockReq, mockRes)

      expect(result).toBeNull()
    })

    it('should handle Auth0 errors gracefully', async () => {
      const { getSession: mockGetSession } = require('@auth0/nextjs-auth0')
      mockGetSession.mockRejectedValue(new Error('Auth0 error'))

      const mockReq = {} as any
      const mockRes = {} as any

      const result = await getSession(mockReq, mockRes)

      expect(result).toBeNull()
    })
  })

  describe('refreshSession', () => {
    it('should refresh session with valid refresh token', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        id_token: 'new-id-token',
        expires_in: 3600,
      }

      // Create a mock response with proper typing
      const mockResponse: Response = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        json: () => Promise.resolve(mockTokenResponse),
        // Add other required Response properties
        body: null,
        bodyUsed: false,
        redirected: false,
        type: 'basic',
        url: '',
        clone: function() { return this; },
        arrayBuffer: function() { return Promise.resolve(new ArrayBuffer(0)); },
        blob: function() { return Promise.resolve(new Blob()); },
        formData: function() { return Promise.resolve(new FormData()); },
        text: function() { return Promise.resolve(''); }
      } as unknown as Response;

      // Mock the global fetch to return our response
      mockFetch.mockImplementationOnce(() => Promise.resolve(mockResponse));

      const { updateSession } = require('@auth0/nextjs-auth0')
      updateSession.mockResolvedValue({
        user: { sub: 'test-user-id' },
        idToken: 'new-id-token',
        accessToken: 'new-access-token',
        refreshToken: 'mock-refresh-token',
      })

      // Mock the request with a session that contains a refresh token
      const mockReq = { session: { refreshToken: 'mock-refresh-token' } } as any
      const mockRes = {} as any

      // Mock getSession to return a session with refresh token
      const { getSession: mockGetSession } = require('@auth0/nextjs-auth0')
      mockGetSession.mockResolvedValue({
        user: { sub: 'test-user-id' },
        refreshToken: 'mock-refresh-token'
      })

      const result = await refreshSession(mockReq, mockRes)

      expect(result).toBeTruthy()
      expect(result?.idToken).toBe('new-id-token')
      expect(result?.accessToken).toBe('new-access-token')
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.auth0.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret',
            refresh_token: 'mock-refresh-token',
          }),
        })
      )
    })

    it('should return null when refresh token is invalid', async () => {
      // Create a mock response for invalid token
      const mockErrorResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'Invalid refresh token',
        }),
        headers: new Headers(),
        body: null,
        bodyUsed: false,
        redirected: false,
        type: 'basic' as const,
        url: '',
        clone: function() { return this; },
        arrayBuffer: function() { return Promise.resolve(new ArrayBuffer(0)); },
        blob: function() { return Promise.resolve(new Blob()); },
        formData: function() { return Promise.resolve(new FormData()); },
        text: function() { return Promise.resolve(''); }
      };

      // Mock fetch to return the error response
      mockFetch.mockImplementationOnce(() => Promise.resolve(mockErrorResponse as unknown as Response));

      // Mock the request with a session that contains a refresh token
      const mockReq = { session: { refreshToken: 'invalid-refresh-token' } } as any;
      const mockRes = {} as any;

      // Mock getSession to return a session with refresh token
      const { getSession: mockGetSession } = require('@auth0/nextjs-auth0');
      mockGetSession.mockResolvedValue({
        user: { sub: 'test-user-id' },
        refreshToken: 'invalid-refresh-token'
      });

      const result = await refreshSession(mockReq, mockRes);
      expect(result).toBeNull();
    })

    it('should handle network errors', async () => {
      // Create a mock implementation that throws a network error
      const mockFetchImpl = jest.fn()
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')));
      
      // Override the global.fetch with our mock implementation
      const originalFetch = global.fetch;
      global.fetch = mockFetchImpl as any;

      try {
        // Mock the request with a session that contains a refresh token
        const mockReq = { session: { refreshToken: 'mock-refresh-token' } } as any;
        const mockRes = {} as any;

        // Mock getSession to return a session with refresh token
        const { getSession: mockGetSession } = require('@auth0/nextjs-auth0');
        mockGetSession.mockResolvedValue({
          user: { sub: 'test-user-id' },
          refreshToken: 'mock-refresh-token'
        });

        const result = await refreshSession(mockReq, mockRes);
        expect(result).toBeNull();
      } finally {
        // Restore the original fetch
        global.fetch = originalFetch;
      }
    })

    it('should return null when no refresh token provided', async () => {
      const mockReq = { session: {} } as any
      const mockRes = {} as any
      
      // Mock getSession to return a session without refresh token
      const { getSession: mockGetSession } = require('@auth0/nextjs-auth0')
      mockGetSession.mockResolvedValue({
        user: { sub: 'test-user-id' }
        // No refreshToken in session
      })

      const result = await refreshSession(mockReq, mockRes)

      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Environment Variables', () => {
    it('should handle missing environment variables', async () => {
      delete process.env.AUTH0_CLIENT_ID
      delete process.env.AUTH0_CLIENT_SECRET
      delete process.env.AUTH0_ISSUER_BASE_URL

      // Mock the request with a session that contains a refresh token
      const mockReq = { session: { refreshToken: 'mock-refresh-token' } } as any
      const mockRes = {} as any

      // Mock getSession to return a session with refresh token
      const { getSession: mockGetSession } = require('@auth0/nextjs-auth0')
      mockGetSession.mockResolvedValue({
        user: { sub: 'test-user-id' },
        refreshToken: 'mock-refresh-token'
      })

      const result = await refreshSession(mockReq, mockRes)

      expect(result).toBeNull()
    })
  })
})
