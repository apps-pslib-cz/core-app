// Test setup for Vitest
import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock environment variables for API auth
process.env.AUTH_DUENDE_IDENTITY_SERVER6_ISSUER = "https://oauth.pslib.cz";
process.env.AUTH_DUENDE_IDENTITY_SERVER6_ID = "core.js";

// Mock NextAuth and Next.js server dependencies
vi.mock("next/server");
vi.mock("next-auth");
vi.mock("@/libs/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock jose for JWT verification
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn().mockReturnValue(vi.fn()),
}));

// Mock Prisma client
vi.mock("@/libs/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock window.matchMedia for Mantine components
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver (must be a real class: @floating-ui/dom does `new ResizeObserver(...)`,
// which throws with an arrow-function mock)
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock IntersectionObserver (same constructibility requirement)
global.IntersectionObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as unknown as typeof IntersectionObserver;

// Mock scrollIntoView for Mantine components
Element.prototype.scrollIntoView = vi.fn();

// Basic setup for now
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
