import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'
import { 
  mockAuthenticatedUser, 
  mockSuccessfulMutation, 
  createMockAIResponse,
  createMockConversation,
  createMockMessage 
} from '../utils/test-utils'
import { api } from '@/utils/api'

// Mock the API
jest.mock('@/utils/api')
const mockApi = api as jest.Mocked<typeof api>

describe('Chat Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthenticatedUser()
  })

  describe('Complete Chat Conversation Flow', () => {
    it('should handle a complete chat conversation from start to finish', async () => {
      const user = userEvent.setup()
      
      // Mock initial empty state
      mockApi.chat.getConversations.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      } as any)

      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      // Mock successful message sending
      const mockConversation = createMockConversation({ 
        id: 'conv-1', 
        title: 'New Chat' 
      })
      
      const mockAIResponse = createMockAIResponse(
        'Hello! How can I help you today?'
      )

      mockApi.chat.sendMessage.useMutation.mockReturnValue(
        mockSuccessfulMutation({
          aiMessage: mockAIResponse,
          conversationId: mockConversation.id,
        })
      )

      render(<Home />)

      // 1. Verify initial state
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
      expect(screen.getByText('Send')).toBeInTheDocument()

      // 2. Type and send first message
      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'Hello, AI!')
      
      // Verify user message appears immediately
      expect(screen.getByText('Hello, AI!')).toBeInTheDocument()
      
      const sendButton = screen.getByText('Send')
      await user.click(sendButton)

      // 3. Verify input is cleared
      expect(input).toHaveValue('')

      // 4. Wait for AI response to appear
      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      // 5. Send follow-up message
      await user.type(input, 'What is 2+2?')
      await user.click(sendButton)

      // Verify follow-up appears
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()

      // 6. Verify mutation was called with correct parameters
      expect(mockApi.chat.sendMessage.useMutation().mutate).toHaveBeenCalledWith({
        message: 'Hello, AI!',
        conversationId: undefined,
      })
    })

    it('should handle image generation flow', async () => {
      const user = userEvent.setup()
      
      mockApi.chat.getConversations.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      } as any)

      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      const mockImageResponse = createMockAIResponse(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'image'
      )

      mockApi.chat.sendMessage.useMutation.mockReturnValue(
        mockSuccessfulMutation({
          aiMessage: mockImageResponse,
          conversationId: 'conv-1',
        })
      )

      render(<Home />)

      // 1. Type image prompt
      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'A beautiful sunset over mountains')

      // 2. Click generate image button
      const generateButton = screen.getByText('Generate Image')
      await user.click(generateButton)

      // 3. Verify user prompt appears
      expect(screen.getByText('A beautiful sunset over mountains')).toBeInTheDocument()

      // 4. Wait for generated image to appear
      await waitFor(() => {
        const image = screen.getByRole('img')
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute('src', mockImageResponse.content)
      })

      // 5. Verify mutation was called with /image prefix
      expect(mockApi.chat.sendMessage.useMutation().mutate).toHaveBeenCalledWith({
        message: '/image A beautiful sunset over mountains',
        conversationId: undefined,
      })
    })

    it('should handle conversation switching', async () => {
      const user = userEvent.setup()
      
      const mockConversations = [
        createMockConversation({ id: 'conv-1', title: 'First Chat' }),
        createMockConversation({ id: 'conv-2', title: 'Second Chat' }),
      ]

      const mockMessages1 = [
        createMockMessage({ id: 'msg-1', content: 'Hello from first chat' }),
      ]

      const mockMessages2 = [
        createMockMessage({ id: 'msg-2', content: 'Hello from second chat' }),
      ]

      mockApi.chat.getConversations.useQuery.mockReturnValue({
        data: mockConversations,
        isLoading: false,
        refetch: jest.fn(),
      } as any)

      // Mock messages query to return different data based on conversation ID
      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: mockMessages1, // Simplified for testing
        isLoading: false,
      } as any)

      mockApi.chat.sendMessage.useMutation.mockReturnValue({
        mutate: jest.fn(),
        isLoading: false,
      } as any)

      render(<Home />)

      // 1. Verify both conversations are listed
      expect(screen.getByText('First Chat')).toBeInTheDocument()
      expect(screen.getByText('Second Chat')).toBeInTheDocument()

      // 2. Click on first conversation
      await user.click(screen.getByText('First Chat'))

      // 3. Verify first conversation messages are shown
      await waitFor(() => {
        expect(screen.getByText('Hello from first chat')).toBeInTheDocument()
      })

      // 4. Switch to second conversation
      await user.click(screen.getByText('Second Chat'))

      // 5. Verify second conversation messages are shown
      await waitFor(() => {
        expect(screen.getByText('Hello from second chat')).toBeInTheDocument()
      })
    })

    it('should handle new conversation creation', async () => {
      const user = userEvent.setup()
      
      mockApi.chat.getConversations.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      } as any)

      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      mockApi.chat.sendMessage.useMutation.mockReturnValue({
        mutate: jest.fn(),
        isLoading: false,
      } as any)

      render(<Home />)

      // 1. Click new chat button
      const newChatButton = screen.getByText('+ New Chat')
      await user.click(newChatButton)

      // 2. Verify chat area is cleared
      expect(screen.getByPlaceholderText('Type your message...')).toHaveValue('')

      // 3. Send a message in new conversation
      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'Starting new conversation')
      
      const sendButton = screen.getByText('Send')
      await user.click(sendButton)

      // 4. Verify message appears
      expect(screen.getByText('Starting new conversation')).toBeInTheDocument()
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      
      mockApi.chat.getConversations.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      } as any)

      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      // Mock failed mutation
      mockApi.chat.sendMessage.useMutation.mockReturnValue({
        mutate: jest.fn().mockImplementation((_, options) => {
          if (options?.onError) {
            options.onError(new Error('API Error'))
          }
        }),
        isLoading: false,
      } as any)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<Home />)

      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'Test message')
      
      const sendButton = screen.getByText('Send')
      await user.click(sendButton)

      // Verify error is logged
      expect(consoleSpy).toHaveBeenCalledWith('Error sending message:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should handle loading states correctly', async () => {
      mockApi.chat.getConversations.useQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      } as any)

      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      mockApi.chat.sendMessage.useMutation.mockReturnValue({
        mutate: jest.fn(),
        isLoading: true,
      } as any)

      render(<Home />)

      // Should show loading indicators
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Keyboard Shortcuts Integration', () => {
    it('should handle Enter key to send messages', async () => {
      const user = userEvent.setup()
      
      mockApi.chat.getConversations.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      } as any)

      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      const mockMutate = jest.fn()
      mockApi.chat.sendMessage.useMutation.mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      } as any)

      render(<Home />)

      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'Test message')
      await user.keyboard('{Enter}')

      expect(mockMutate).toHaveBeenCalledWith({
        message: 'Test message',
        conversationId: undefined,
      })
    })

    it('should not send on Shift+Enter', async () => {
      const user = userEvent.setup()
      
      mockApi.chat.getConversations.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      } as any)

      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      const mockMutate = jest.fn()
      mockApi.chat.sendMessage.useMutation.mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      } as any)

      render(<Home />)

      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'Test message')
      await user.keyboard('{Shift>}{Enter}{/Shift}')

      expect(mockMutate).not.toHaveBeenCalled()
    })
  })
})
