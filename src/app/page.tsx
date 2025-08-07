'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useRef, useEffect } from 'react';
import { TRPCProvider } from '@/components/TRPCProvider';
import { api } from '@/utils/api';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  message_type: 'text' | 'image' | 'image_prompt';
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function HomeContent() {
  const { user, error, isLoading } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // TRPC queries and mutations
  const getConversationsQuery = api.chat.getConversations.useQuery(undefined, {
    enabled: !!user,
    onSuccess: (data) => {
      setConversations(data || []);
    },
  });

  type SendMessageResponse = {
    aiMessage: Message;
    conversationId: string | undefined;
  };

  const sendMessageMutation = api.chat.sendMessage.useMutation<SendMessageResponse>({
    onSuccess: (data: SendMessageResponse) => {
      // Add the AI response to local state
      setMessages(prev => [...prev, data.aiMessage]);
      setCurrentConversationId(data.conversationId || null);
      // Refetch conversations to update the list
      getConversationsQuery.refetch();
      setIsGenerating(false);
    },
    onError: (error: unknown) => {
      console.error('Error sending message:', error);
      setIsGenerating(false);
    }
  });

  // For image generation, we'll use the same sendMessage endpoint but with a special command
  const generateImage = (prompt: string, conversationId?: string) => {
    // The actual image generation is handled by the sendMessage mutation
    // with a special /image command
    sendMessageMutation.mutate({
      message: `/image ${prompt}`,
      conversationId: conversationId || currentConversationId || undefined,
    });
  };

  const getMessagesQuery = api.chat.getMessages.useQuery(
    { conversationId: currentConversationId! },
    {
      enabled: !!currentConversationId,
      onSuccess: (data: Message[] | undefined) => {
        setMessages(data || []);
      },
    }
  );

  // Create a new conversation by sending a message without a conversationId
  const createNewChat = () => {
    // This will trigger the creation of a new conversation in the sendMessage mutation
    sendMessageMutation.mutate({
      message: 'New chat started',
      conversationId: undefined,
    });
  };

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setSidebarOpen(false);
    // Messages will be loaded automatically by the getMessagesQuery
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isGenerating) return;

    setIsGenerating(true);
    const messageToSend = inputMessage;
    setInputMessage('');

    // Add user message to local state immediately for real-time display
    const userMessage: Message = {
      id: `temp-${Date.now()}`, // Temporary ID until we get the real one from DB
      content: messageToSend,
      role: 'user',
      message_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    sendMessageMutation.mutate({
      message: messageToSend,
      conversationId: currentConversationId || undefined,
    });
  };

  const handleGenerateImage = () => {
    if (!inputMessage.trim() || isGenerating) return;

    setIsGenerating(true);
    const promptToSend = inputMessage;
    setInputMessage('');

    // Add user message to local state immediately for real-time display
    const userMessage: Message = {
      id: `temp-${Date.now()}`, // Temporary ID until we get the real one from DB
      content: promptToSend,
      role: 'user',
      message_type: 'image_prompt',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Use the generateImage function which internally uses sendMessage with /image prefix
    generateImage(promptToSend, currentConversationId || undefined);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Authentication Error</h4>
          <p>There was an error loading your session. Please try refreshing the page.</p>
          <hr />
          <p className="mb-0">Error: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">🤖 ChatGPT Clone</h1>
          <p className="auth-subtitle">Your AI-powered conversation companion</p>
          <p className="mb-4">Experience the power of gemini-2.0-flash-preview-image-generation and gemini-2.5-flash</p>
          <a href="/api/auth/login" className="auth-button">
            🚀 Get Started
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'mobile-open' : 'mobile-hidden'}`}>
        <div className="sidebar-header">
          <div className="header-title">
            <h5>ChatGPT Clone</h5>
            <small>{conversations.length} conversations</small>
          </div>
        </div>
        <div className="sidebar-content">
          <button 
            className="new-chat-btn"
            onClick={createNewChat}
          >
            <span>➕</span> New chat
          </button>
          
          <div className="conversations-list">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conversation-item ${
                  currentConversationId === conversation.id ? 'active' : ''
                }`}
                onClick={() => selectConversation(conversation.id)}
              >
                <div className="conversation-title">{conversation.title}</div>
                <div className="conversation-date">
                  {new Date(conversation.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="chat-header">
          <button 
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            ☰
          </button>
          
          <div className="header-content">
            <div className="header-title">
              <h5>ChatGPT Clone</h5>
              <small>Powered by gemini-2.0-flash-preview-image-generation and gemini-2.5-flash</small>
            </div>
            
            <div className="header-actions">
              <img
                src={user.picture || '/default-avatar.png'}
                alt="Profile"
                className="profile-img"
              />
              <a href="/api/auth/logout" className="logout-btn">
                Logout
              </a>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          <div className="messages-content">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <h3>Good to see you, {user.name?.split(' ')[0] || 'there'}.</h3>
                <p>How can I help you today?</p>
              </div>
            ) : (
              messages
                .filter((message): message is Message => 
                  message && 
                  message.role && 
                  (message.role === 'user' || message.role === 'assistant')
                )
                .map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="message-avatar">
                        🤖
                      </div>
                    )}
                    <div className={`message-bubble ${message.role}`}>
                      {message.message_type === 'image' ? (
                        <img 
                          src={message.content.startsWith('data:image/') 
                            ? message.content 
                            : `https://via.placeholder.com/400x300/2f2f2f/ececec?text=Generated+Image`}
                          alt="Generated content"
                          style={{ 
                            borderRadius: '12px',
                            maxWidth: '100%',
                            height: 'auto'
                          }}
                        />
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                ))
            )}
            
            {isGenerating && (
              <div className="message message-assistant">
                <div className="message-avatar">
                  🤖
                </div>
                <div className="message-bubble assistant">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="input-container">
          <div className="input-wrapper">
            <div className="input-group">
              <textarea
                className="message-input"
                placeholder="Message ChatGPT Clone..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isGenerating}
                rows={1}
              />
              <div className="input-actions">
                <button
                  className="image-button"
                  onClick={handleGenerateImage}
                  disabled={!inputMessage.trim() || isGenerating}
                  title="Generate Image"
                >
                  🎨
                </button>
                <button
                  className={`send-button ${inputMessage.trim() && !isGenerating ? 'active' : ''}`}
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isGenerating}
                  title="Send Message"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <TRPCProvider>
      <HomeContent />
    </TRPCProvider>
  );
}
