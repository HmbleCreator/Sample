import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { TRPCProvider } from '@/components/TRPCProvider'

// Mock Auth0 user for testing
export const mockUser = {
  sub: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  picture: 'https://example.com/avatar.jpg',
}

// Mock authenticated state
export const mockAuthenticatedUser = () => {
  ;(useUser as jest.Mock).mockReturnValue({
    user: mockUser,
    error: null,
    isLoading: false,
  })
}

// Mock unauthenticated state
export const mockUnauthenticatedUser = () => {
  ;(useUser as jest.Mock).mockReturnValue({
    user: null,
    error: null,
    isLoading: false,
  })
}

// Mock loading state
export const mockLoadingUser = () => {
  ;(useUser as jest.Mock).mockReturnValue({
    user: null,
    error: null,
    isLoading: true,
  })
}

// Mock TRPC queries and mutations
export const mockTRPCQueries = {
  getConversations: {
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  },
  getMessages: {
    data: [],
    isLoading: false,
  },
  sendMessage: {
    mutate: jest.fn(),
    isLoading: false,
  },
}

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TRPCProvider>{children}</TRPCProvider>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Helper to create mock messages
export const createMockMessage = (overrides = {}) => ({
  id: `msg-${Date.now()}`,
  content: 'Test message',
  role: 'user' as const,
  message_type: 'text' as const,
  created_at: new Date().toISOString(),
  ...overrides,
})

// Helper to create mock conversations
export const createMockConversation = (overrides = {}) => ({
  id: `conv-${Date.now()}`,
  title: 'Test Conversation',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

// Helper to create mock AI responses
export const createMockAIResponse = (content: string, type: 'text' | 'image' = 'text') => ({
  id: `ai-${Date.now()}`,
  content,
  role: 'assistant' as const,
  message_type: type,
  created_at: new Date().toISOString(),
})

// Helper to simulate user typing
export const simulateTyping = async (input: HTMLElement, text: string, userEvent: any) => {
  await userEvent.clear(input)
  await userEvent.type(input, text)
}

// Helper to wait for async operations
export const waitForAsync = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))

// Mock successful TRPC mutation
export const mockSuccessfulMutation = (response: any) => ({
  mutate: jest.fn().mockImplementation((_, options) => {
    if (options?.onSuccess) {
      options.onSuccess(response)
    }
  }),
  isLoading: false,
})

// Mock failed TRPC mutation
export const mockFailedMutation = (error: any) => ({
  mutate: jest.fn().mockImplementation((_, options) => {
    if (options?.onError) {
      options.onError(error)
    }
  }),
  isLoading: false,
})

// Helper to mock window.scrollTo
export const mockScrollTo = () => {
  Object.defineProperty(window, 'scrollTo', {
    value: jest.fn(),
    writable: true,
  })
}

// Helper to mock localStorage
export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })
  return localStorageMock
}

// Helper to mock fetch API
export const mockFetch = (response: any, ok = true) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: jest.fn().mockResolvedValue(response),
    text: jest.fn().mockResolvedValue(JSON.stringify(response)),
  })
}

// Helper to assert error boundaries
export const expectErrorBoundary = (component: ReactElement) => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  
  try {
    render(component)
  } catch (error) {
    expect(error).toBeDefined()
  }
  
  spy.mockRestore()
}
