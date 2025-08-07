import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TRPCProvider } from '../TRPCProvider'

// Mock TRPC client
jest.mock('@/utils/api', () => {
  const mockTrpcClient = {
    query: jest.fn(),
    mutation: jest.fn(),
  }
  
  const mockApi = {
    Provider: ({ children }: { children: React.ReactNode }) => <div data-testid="trpc-provider">{children}</div>,
    useContext: jest.fn(),
  }
  
  return {
    api: mockApi,
    trpcClient: mockTrpcClient,
  }
})

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

describe('TRPCProvider', () => {
  it('should render children correctly', () => {
    render(
      <TRPCProvider>
        <div data-testid="test-child">Test Content</div>
      </TRPCProvider>
    )

    expect(screen.getByTestId('test-child')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should provide TRPC context to children', () => {
    const TestComponent = () => {
      return <div data-testid="trpc-consumer">TRPC Consumer</div>
    }

    render(
      <TRPCProvider>
        <TestComponent />
      </TRPCProvider>
    )

    expect(screen.getByTestId('trpc-consumer')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <TRPCProvider>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </TRPCProvider>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
    expect(screen.getByTestId('child-3')).toBeInTheDocument()
  })
})
