import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@auth0/nextjs-auth0/client'
import Home, { HomeContent } from '../page'
import { api } from '@/utils/api'

// Mock the TRPC provider
jest.mock('@/components/TRPCProvider', () => ({
  TRPCProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock the API utilities
jest.mock('@/utils/api')

const mockApi = api as jest.Mocked<typeof api>

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication Flow', () => {
    it('shows login page when user is not authenticated', () => {
      ;(useUser as jest.Mock).mockReturnValue({
        user: null,
        error: null,
        isLoading: false,
      })

      render(<Home />)

      expect(screen.getByText('🤖 ChatGPT Clone')).toBeInTheDocument()
      expect(screen.getByText('Your AI-powered conversation companion')).toBeInTheDocument()
      expect(screen.getByText('🚀 Get Started')).toBeInTheDocument()
    })

    it('shows loading state when authentication is loading', () => {
      ;(useUser as jest.Mock).mockReturnValue({
        user: null,
        error: null,
        isLoading: true,
      })

      render(<Home />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('shows chat interface when user is authenticated', () => {
      ;(useUser as jest.Mock).mockReturnValue({
        user: {
          sub: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
        },
        error: null,
        isLoading: false,
      })

      // Mock TRPC queries
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

      expect(screen.getByText('ChatGPT Clone')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
      expect(screen.getByText('Send')).toBeInTheDocument()
    })
  })
})

describe('HomeContent Component', () => {
  const mockUser = {
    sub: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
  }

  const mockSendMessageMutation = {
    mutate: jest.fn(),
    isLoading: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useUser as jest.Mock).mockReturnValue({
      user: mockUser,
      error: null,
      isLoading: false,
    })

    mockApi.chat.getConversations.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    } as any)

    mockApi.chat.getMessages.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    mockApi.chat.sendMessage.useMutation.mockReturnValue(mockSendMessageMutation as any)
  })

  describe('Message Input', () => {
    it('renders message input field', () => {
      render(<HomeContent />)
      
      const input = screen.getByPlaceholderText('Type your message...')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('')
    })

    it('updates input value when typing', async () => {
      const user = userEvent.setup()
      render(<HomeContent />)
      
      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'Hello, world!')
      
      expect(input).toHaveValue('Hello, world!')
    })

    it('clears input after sending message', async () => {
      const user = userEvent.setup()
      render(<HomeContent />)
      
      const input = screen.getByPlaceholderText('Type your message...')
      const sendButton = screen.getByText('Send')
      
      await user.type(input, 'Test message')
      expect(input).toHaveValue('Test message')
      
      await user.click(sendButton)
      
      expect(input).toHaveValue('')
      expect(mockSendMessageMutation.mutate).toHaveBeenCalledWith({
        message: 'Test message',
        conversationId: undefined,
      })
    })

    it('does not send empty messages', async () => {
      const user = userEvent.setup()
      render(<HomeContent />)
      
      const sendButton = screen.getByText('Send')
      await user.click(sendButton)
      
      expect(mockSendMessageMutation.mutate).not.toHaveBeenCalled()
    })

    it('does not send messages when generating', async () => {
      mockApi.chat.sendMessage.useMutation.mockReturnValue({
        mutate: jest.fn(),
        isLoading: true,
      } as any)

      const user = userEvent.setup()
      render(<HomeContent />)
      
      const input = screen.getByPlaceholderText('Type your message...')
      const sendButton = screen.getByText('Send')
      
      await user.type(input, 'Test message')
      await user.click(sendButton)
      
      expect(mockSendMessageMutation.mutate).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('sends message on Enter key press', async () => {
      const user = userEvent.setup()
      render(<HomeContent />)
      
      const input = screen.getByPlaceholderText('Type your message...')
      
      await user.type(input, 'Test message')
      await user.keyboard('{Enter}')
      
      expect(mockSendMessageMutation.mutate).toHaveBeenCalledWith({
        message: 'Test message',
        conversationId: undefined,
      })
    })

    it('does not send message on Shift+Enter (allows multiline)', async () => {
      const user = userEvent.setup()
      render(<HomeContent />)
      
      const input = screen.getByPlaceholderText('Type your message...')
      
      await user.type(input, 'Test message')
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      
      expect(mockSendMessageMutation.mutate).not.toHaveBeenCalled()
    })
  })

  describe('Image Generation', () => {
    it('renders generate image button', () => {
      render(<HomeContent />)
      
      expect(screen.getByText('Generate Image')).toBeInTheDocument()
    })

    it('sends image generation request with /image prefix', async () => {
      const user = userEvent.setup()
      render(<HomeContent />)
      
      const input = screen.getByPlaceholderText('Type your message...')
      const generateButton = screen.getByText('Generate Image')
      
      await user.type(input, 'A beautiful sunset')
      await user.click(generateButton)
      
      expect(mockSendMessageMutation.mutate).toHaveBeenCalledWith({
        message: '/image A beautiful sunset',
        conversationId: undefined,
      })
    })
  })

  describe('Message Display', () => {
    it('displays messages from conversation', () => {
      const mockMessages = [
        {
          id: '1',
          content: 'Hello!',
          role: 'user' as const,
          message_type: 'text' as const,
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          content: 'Hi there! How can I help you?',
          role: 'assistant' as const,
          message_type: 'text' as const,
          created_at: '2023-01-01T00:00:01Z',
        },
      ]

      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: mockMessages,
        isLoading: false,
      } as any)

      render(<HomeContent />)

      expect(screen.getByText('Hello!')).toBeInTheDocument()
      expect(screen.getByText('Hi there! How can I help you?')).toBeInTheDocument()
    })

    it('displays image messages correctly', () => {
      const mockMessages = [
        {
          id: '1',
          content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          role: 'assistant' as const,
          message_type: 'image' as const,
          created_at: '2023-01-01T00:00:00Z',
        },
      ]

      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: mockMessages,
        isLoading: false,
      } as any)

      render(<HomeContent />)

      const image = screen.getByRole('img')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', mockMessages[0].content)
    })

    it('shows loading state when messages are loading', () => {
      mockApi.chat.getMessages.useQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      render(<HomeContent />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Conversation Management', () => {
    it('displays conversation list', () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test Conversation 1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'conv-2',
          title: 'Test Conversation 2',
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ]

      mockApi.chat.getConversations.useQuery.mockReturnValue({
        data: mockConversations,
        isLoading: false,
        refetch: jest.fn(),
      } as any)

      render(<HomeContent />)

      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
      expect(screen.getByText('Test Conversation 2')).toBeInTheDocument()
    })

    it('creates new conversation when clicking new chat', async () => {
      const user = userEvent.setup()
      render(<HomeContent />)

      const newChatButton = screen.getByText('+ New Chat')
      await user.click(newChatButton)

      // Should clear current conversation and messages
      expect(screen.queryByText('Test Conversation 1')).not.toBeInTheDocument()
    })
  })

  describe('Sidebar Toggle', () => {
    it('toggles sidebar when clicking menu button', async () => {
      const user = userEvent.setup()
      render(<HomeContent />)

      const menuButton = screen.getByLabelText('Toggle sidebar')
      await user.click(menuButton)

      // Check if sidebar overlay is present (indicates sidebar is open)
      expect(document.querySelector('.sidebar-overlay.open')).toBeInTheDocument()
    })
  })

  describe('Real-time Message Updates', () => {
    it('adds user message to local state immediately when sending', async () => {
      const user = userEvent.setup()
      render(<HomeContent />)

      const input = screen.getByPlaceholderText('Type your message...')
      const sendButton = screen.getByText('Send')

      await user.type(input, 'Test message')
      await user.click(sendButton)

      // Should see the user message appear immediately
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    it('adds AI response when mutation succeeds', async () => {
      const mockMutationSuccess = jest.fn()
      
      mockApi.chat.sendMessage.useMutation.mockReturnValue({
        mutate: jest.fn().mockImplementation((_, options) => {
          // Simulate successful response
          if (options?.onSuccess) {
            options.onSuccess({
              aiMessage: {
                id: 'ai-1',
                content: 'AI response',
                role: 'assistant',
                message_type: 'text',
                created_at: '2023-01-01T00:00:01Z',
              },
              conversationId: 'conv-1',
            })
          }
        }),
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      render(<HomeContent />)

      const input = screen.getByPlaceholderText('Type your message...')
      const sendButton = screen.getByText('Send')

      await user.type(input, 'Test message')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('AI response')).toBeInTheDocument()
      })
    })
  })
})
