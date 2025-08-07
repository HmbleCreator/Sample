import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { TRPCError } from '@trpc/server'
import { chatRouter } from '../chat'
import { createTRPCMsw } from 'msw-trpc'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('Mocked AI response'),
        },
      }),
    }),
  })),
}))

// Mock Auth0 session
const mockSession = {
  user: {
    sub: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
  },
  idToken: 'mock-id-token',
  accessToken: 'mock-access-token',
}

// Mock TRPC context
const mockContext = {
  session: mockSession,
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  },
}

describe('Chat Router', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    }

    mockCreateClient.mockReturnValue(mockSupabaseClient)
  })

  describe('getConversations', () => {
    it('should fetch conversations for authenticated user', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test Conversation',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.select.mockResolvedValue({
        data: mockConversations,
        error: null,
      })

      const caller = chatRouter.createCaller(mockContext)
      const result = await caller.getConversations()

      expect(result).toEqual(mockConversations)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversations')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'test-user-id')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('updated_at', { ascending: false })
    })

    it('should throw error when user is not authenticated', async () => {
      const contextWithoutSession = { ...mockContext, session: null }
      const caller = chatRouter.createCaller(contextWithoutSession)

      await expect(caller.getConversations()).rejects.toThrow(TRPCError)
    })

    it('should handle Supabase errors', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const caller = chatRouter.createCaller(mockContext)

      await expect(caller.getConversations()).rejects.toThrow('Failed to fetch conversations')
    })
  })

  describe('getMessages', () => {
    it('should fetch messages for a conversation', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Hello',
          role: 'user',
          message_type: 'text',
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'msg-2',
          content: 'Hi there!',
          role: 'assistant',
          message_type: 'text',
          created_at: '2023-01-01T00:00:01Z',
        },
      ]

      mockSupabaseClient.select.mockResolvedValue({
        data: mockMessages,
        error: null,
      })

      const caller = chatRouter.createCaller(mockContext)
      const result = await caller.getMessages({ conversationId: 'conv-1' })

      expect(result).toEqual(mockMessages)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('conversation_id', 'conv-1')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: true })
    })

    it('should throw error when user is not authenticated', async () => {
      const contextWithoutSession = { ...mockContext, session: null }
      const caller = chatRouter.createCaller(contextWithoutSession)

      await expect(caller.getMessages({ conversationId: 'conv-1' })).rejects.toThrow(TRPCError)
    })
  })

  describe('sendMessage', () => {
    beforeEach(() => {
      // Mock successful database operations
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 'new-msg-id' }],
        error: null,
      })
      
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'new-msg-id', content: 'Test message', role: 'user' },
        error: null,
      })

      mockSupabaseClient.upsert.mockResolvedValue({
        data: [{ id: 'conv-1' }],
        error: null,
      })
    })

    it('should send a text message and get AI response', async () => {
      // Mock conversation history
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [
          {
            id: 'msg-1',
            content: 'Previous message',
            role: 'user',
            message_type: 'text',
          },
        ],
        error: null,
      })

      const caller = chatRouter.createCaller(mockContext)
      const result = await caller.sendMessage({
        message: 'Hello, AI!',
        conversationId: 'conv-1',
      })

      expect(result).toHaveProperty('aiMessage')
      expect(result).toHaveProperty('conversationId')
      expect(result.aiMessage.content).toBe('Mocked AI response')
      expect(result.aiMessage.role).toBe('assistant')
      expect(result.aiMessage.message_type).toBe('text')
    })

    it('should handle image generation requests', async () => {
      // Mock image generation response
      const mockImageModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='),
          },
        }),
      }

      // Mock Google AI to return image model
      const { GoogleGenerativeAI } = require('@google/generative-ai')
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockImageModel),
      }))

      const caller = chatRouter.createCaller(mockContext)
      const result = await caller.sendMessage({
        message: '/image A beautiful sunset',
        conversationId: 'conv-1',
      })

      expect(result.aiMessage.message_type).toBe('image')
      expect(result.aiMessage.content).toContain('data:image/png;base64')
    })

    it('should create new conversation if none provided', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const caller = chatRouter.createCaller(mockContext)
      const result = await caller.sendMessage({
        message: 'Hello, AI!',
      })

      expect(mockSupabaseClient.upsert).toHaveBeenCalled()
      expect(result).toHaveProperty('conversationId')
    })

    it('should throw error when user is not authenticated', async () => {
      const contextWithoutSession = { ...mockContext, session: null }
      const caller = chatRouter.createCaller(contextWithoutSession)

      await expect(caller.sendMessage({
        message: 'Hello',
      })).rejects.toThrow(TRPCError)
    })

    it('should handle AI generation errors gracefully', async () => {
      // Mock AI to throw error
      const { GoogleGenerativeAI } = require('@google/generative-ai')
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue(new Error('AI service error')),
        }),
      }))

      const caller = chatRouter.createCaller(mockContext)

      await expect(caller.sendMessage({
        message: 'Hello, AI!',
        conversationId: 'conv-1',
      })).rejects.toThrow('Failed to generate AI response')
    })

    it('should include conversation history in AI prompt', async () => {
      const mockConversationHistory = [
        {
          id: 'msg-1',
          content: 'What is 2+2?',
          role: 'user',
          message_type: 'text',
        },
        {
          id: 'msg-2',
          content: '2+2 equals 4.',
          role: 'assistant',
          message_type: 'text',
        },
      ]

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockConversationHistory,
        error: null,
      })

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('Based on our previous conversation about math...'),
        },
      })

      const { GoogleGenerativeAI } = require('@google/generative-ai')
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        }),
      }))

      const caller = chatRouter.createCaller(mockContext)
      await caller.sendMessage({
        message: 'What about 3+3?',
        conversationId: 'conv-1',
      })

      // Verify that conversation history was included in the AI prompt
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            parts: [{ text: 'What is 2+2?' }],
          }),
          expect.objectContaining({
            role: 'model',
            parts: [{ text: '2+2 equals 4.' }],
          }),
          expect.objectContaining({
            role: 'user',
            parts: [{ text: 'What about 3+3?' }],
          }),
        ]),
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.select.mockRejectedValue(new Error('Connection failed'))

      const caller = chatRouter.createCaller(mockContext)

      await expect(caller.getConversations()).rejects.toThrow()
    })

    it('should handle malformed input data', async () => {
      const caller = chatRouter.createCaller(mockContext)

      await expect(caller.sendMessage({
        message: '', // Empty message
      })).rejects.toThrow()
    })
  })
})
