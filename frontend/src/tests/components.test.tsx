import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApiErrorMessage } from "@/lib/apiError";
import { mapBackendProduct } from "@/lib/mapBackendProduct";
import Login from "@/pages/Login";
import Shop from "@/pages/Shop";
import Checkout from "@/pages/Checkout";

const {
  mockApiGet,
  mockAddToCart,
  mockLogin,
  mockRegister,
  mockCartState,
} = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockAddToCart: vi.fn(),
  mockLogin: vi.fn(),
  mockRegister: vi.fn(),
  mockCartState: {
    items: [
      {
        product: {
          id: "product-1",
          name: "VI-07",
          price: 4500,
          originalPrice: 5400,
          description: "Test product",
          shortDescription: "Test product",
          category: "Patina",
          finishType: "Standard",
          image: "https://example.com/product.jpg",
          rating: 4.5,
          reviews: 12,
          inStock: true,
        },
        quantity: 1,
      },
    ],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    totalItems: 1,
    totalPrice: 4500,
    loading: false,
    error: null,
    syncCart: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  default: {
    get: mockApiGet,
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    register: mockRegister,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => mockCartState,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("frontend smoke tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("maps backend product ids and upload URLs correctly", () => {
    const product = mapBackendProduct({
      _id: "abc123",
      name: "Test Product",
      price: 999,
      image: "/uploads/test.jpg",
      category: "Patina",
      description: "Long description",
      stock: 3,
      createdAt: "2026-04-04T00:00:00.000Z",
    });

    expect(product.id).toBe("abc123");
    expect(product.image).toContain("/uploads/test.jpg");
    expect(product.createdAt).toBe("2026-04-04T00:00:00.000Z");
  });

  it("extracts API error messages from axios-style errors", () => {
    const message = getApiErrorMessage(
      {
        isAxiosError: true,
        message: "Request failed",
        response: { data: { message: "Backend said no" } },
      },
      "Fallback"
    );

    expect(message).toBe("Backend said no");
  });

  it("renders the login form", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /access securely/i })).toBeInTheDocument();
  });

  it("renders the signup form when requested", () => {
    render(
      <MemoryRouter>
        <Login defaultMode="signup" />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create secure account/i })).toBeInTheDocument();
  });

  it("renders products returned by the shop API", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        products: [
          {
            _id: "prod-1",
            name: "Matte Patina",
            price: 500,
            category: "Chemicals",
            finishType: "Matte",
            image: "https://example.com/image.jpg",
            description: "Patina solution",
            stock: 5,
          },
          {
            _id: "prod-2",
            name: "Glossy Finish",
            price: 750,
            category: "Finishes",
            finishType: "Glossy",
            image: "https://example.com/image2.jpg",
            description: "Gloss top coat",
            stock: 8,
          },
        ],
        page: 1,
        pages: 1,
        total: 2,
      },
    });

    render(
      <MemoryRouter>
        <Shop />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Matte Patina")).toBeInTheDocument();
      expect(screen.getByText("Glossy Finish")).toBeInTheDocument();
    });
  });

  it("renders checkout order summary for the current cart", () => {
    localStorage.setItem("token", "token-123");

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>
    );

    expect(screen.getByText(/order summary/i)).toBeInTheDocument();
    expect(screen.getByText("VI-07")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pay with razorpay/i })).toBeInTheDocument();
  });
});
