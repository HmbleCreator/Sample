import '@testing-library/jest-dom';

// Mock Auth0
jest.mock('@auth0/nextjs-auth0/client', () => ({
  useUser: jest.fn(() => ({
    user: {
      sub: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
    },
    error: null,
    isLoading: false,
  })),
  withPageAuthRequired: (component) => component,
}));

// Mock next/head
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }) => {
      return <>{children}</>;
    },
  };
});

// Mock Next.js router
const useRouter = jest.fn();
const mockRouter = {
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  push: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(() => Promise.resolve()),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
};

useRouter.mockImplementation(() => mockRouter);

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
  withRouter: (component) => component,
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Mock console methods to reduce test noise
const originalConsole = {
  error: console.error,
  warn: console.warn,
  log: console.log,
  debug: console.debug,
};

// Suppress specific console warnings/errors during tests
const suppressedMessages = [
  'React does not recognize the `%s` prop on a DOM element.',
  'Using kebab-case for css properties in jsx',
  'A component is changing an uncontrolled input',
  'validateDOMNesting',
  'validateDOMNesting(...): Text nodes cannot appear as a child of',
];

beforeAll(() => {
  // Override console methods to filter out expected warnings
  const filterConsole = (method, ...args) => {
    const message = (args[0] && args[0].toString()) || '';
    
    // Check if this message should be suppressed
    const shouldSuppress = suppressedMessages.some(suppressed => 
      message.includes(suppressed)
    );
    
    if (!shouldSuppress) {
      originalConsole[method](...args);
    }
  };

  console.error = (...args) => filterConsole('error', ...args);
  console.warn = (...args) => filterConsole('warn', ...args);
  console.log = (...args) => filterConsole('log', ...args);
  console.debug = (...args) => filterConsole('debug', ...args);
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Add a mock for the ResizeObserver which is used by some components
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;
