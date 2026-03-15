import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../contexts/ThemeContext";
import { DashboardPage } from "../pages/DashboardPage";

// Mock useWallets
const mockAddWallet = vi.fn();
const mockUpdateWallet = vi.fn();
const mockRemoveWallet = vi.fn();

const mockUseWallets = vi.fn(() => ({
  wallets: [] as any[],
  isLoading: false,
  addWallet: mockAddWallet,
  updateWallet: mockUpdateWallet,
  removeWallet: mockRemoveWallet,
  refetch: vi.fn(),
}));

vi.mock("../hooks/useWallets", () => ({
  useWallets: (...args: any[]) => mockUseWallets(...args),
  useWalletBalances: vi.fn(() => ({
    balances: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    refetch: vi.fn(),
    refreshBalances: vi.fn(),
  })),
}));

// Mock AuthContext
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "u1", email: "test@test.com", name: "Test", avatarUrl: null, googleId: "g1" },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderDashboard() {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter>
        <ThemeProvider>
          <DashboardPage />
        </ThemeProvider>
      </MemoryRouter>
    ),
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders page title", () => {
    renderDashboard();

    expect(screen.getByText("My Wallets")).toBeInTheDocument();
  });

  it("shows empty state when no wallets", () => {
    renderDashboard();

    expect(screen.getByText("No wallets added yet")).toBeInTheDocument();
  });

  it("renders currency toggle buttons", () => {
    renderDashboard();

    expect(screen.getByRole("button", { name: /usd/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /brl/i })).toBeInTheDocument();
  });

  it("renders add wallet form", () => {
    renderDashboard();

    expect(screen.getByLabelText(/ethereum address/i)).toBeInTheDocument();
  });

  it("shows hide small balances toggle", () => {
    renderDashboard();

    expect(screen.getByRole("switch", { name: /hide/i })).toBeInTheDocument();
  });

  it("persists currency selection to localStorage", async () => {
    const { user } = renderDashboard();

    await user.click(screen.getByRole("button", { name: /brl/i }));

    expect(localStorage.getItem("sv_currency")).toBe("brl");
  });

  it("persists hide small balances toggle", async () => {
    const { user } = renderDashboard();

    await user.click(screen.getByRole("switch", { name: /hide/i }));

    expect(localStorage.getItem("sv_hideSmall")).toBe("true");
  });

  it("reads saved currency from localStorage", () => {
    localStorage.setItem("sv_currency", "brl");

    renderDashboard();

    const brlButton = screen.getByRole("button", { name: /brl/i });
    expect(brlButton).toHaveAttribute("aria-pressed", "true");
  });

  it("reads saved hideSmall from localStorage", () => {
    localStorage.setItem("sv_hideSmall", "true");

    renderDashboard();

    const toggle = screen.getByRole("switch", { name: /hide/i });
    expect(toggle).toBeChecked();
  });

});
