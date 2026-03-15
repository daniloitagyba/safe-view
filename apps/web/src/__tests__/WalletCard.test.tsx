import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "../contexts/ThemeContext";
import { WalletCard } from "../components/WalletCard";
import type { Wallet, WalletBalances } from "../types";

const mockRefreshBalances = vi.fn();
const mockRefetch = vi.fn();

const MOCK_BALANCES: WalletBalances = {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  currency: "usd",
  ethBalance: 1.5,
  ethPrice: 2500,
  ethValue: 3750,
  totalValue: 4750,
  tokens: [
    {
      contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      tokenName: "Tether USD",
      tokenSymbol: "USDT",
      tokenDecimal: 6,
      balance: "1000000000",
      balanceFormatted: 1000,
      imageUrl: "https://example.com/usdt.png",
      valueFiat: 1000,
    },
  ],
  syncedAt: Date.now(),
};

vi.mock("../hooks/useWallets", () => ({
  useWallets: vi.fn(),
  useWalletBalances: vi.fn(() => ({
    balances: MOCK_BALANCES,
    isLoading: false,
    isRefreshing: false,
    error: null,
    refetch: mockRefetch,
    refreshBalances: mockRefreshBalances,
  })),
}));

const WALLET: Wallet = {
  id: "wallet-1",
  address: "0x1234567890abcdef1234567890abcdef12345678",
  label: "My Wallet",
  userId: "user-1",
  createdAt: new Date().toISOString(),
};

const mockOnRemove = vi.fn().mockResolvedValue(undefined);
const mockOnUpdateLabel = vi.fn().mockResolvedValue(undefined);
const mockOnTotalChange = vi.fn();

function renderCard(overrides: Partial<typeof WALLET> = {}) {
  const wallet = { ...WALLET, ...overrides };
  return {
    user: userEvent.setup(),
    ...render(
      <ThemeProvider>
        <WalletCard
          wallet={wallet}
          currency="usd"
          hideSmallBalances={false}
          onRemove={mockOnRemove}
          onUpdateLabel={mockOnUpdateLabel}
          onTotalChange={mockOnTotalChange}
        />
      </ThemeProvider>
    ),
  };
}

describe("WalletCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders wallet label", () => {
    renderCard();
    expect(screen.getByText("My Wallet")).toBeInTheDocument();
  });

  it("renders formatted address when no label", () => {
    renderCard({ label: null });
    // Address appears in both title and chip
    const elements = screen.getAllByText("0x1234...5678");
    expect(elements.length).toBeGreaterThanOrEqual(2);
  });

  it("renders ETH balance row", () => {
    renderCard();
    expect(screen.getByText("Ethereum")).toBeInTheDocument();
    expect(screen.getByText("ETH")).toBeInTheDocument();
  });

  it("renders token rows", () => {
    renderCard();
    expect(screen.getByText("Tether USD")).toBeInTheDocument();
    expect(screen.getByText("USDT")).toBeInTheDocument();
  });

  it("shows total value", () => {
    renderCard();
    // Total value should be displayed
    const totalElements = screen.getAllByText(/4,750/);
    expect(totalElements.length).toBeGreaterThanOrEqual(1);
  });

  it("copies address to clipboard on chip click", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator.clipboard, { writeText: writeTextSpy });

    const { user } = renderCard();

    // Click the chip (the one inside the MuiChip)
    const chips = screen.getAllByText("0x1234...5678");
    const chipElement = chips.find((el) => el.closest(".MuiChip-root"));
    expect(chipElement).toBeDefined();
    await user.click(chipElement!);

    expect(writeTextSpy).toHaveBeenCalledWith(
      "0x1234567890abcdef1234567890abcdef12345678"
    );
  });

  it("calls onRemove when delete button is clicked", async () => {
    const { user } = renderCard();

    const deleteButton = screen.getByRole("button", { name: /remove wallet/i });
    await user.click(deleteButton);

    expect(mockOnRemove).toHaveBeenCalledWith("wallet-1");
  });

  it("calls refreshBalances when refresh button is clicked", async () => {
    const { user } = renderCard();

    const refreshButton = screen.getByRole("button", { name: /refresh balances/i });
    await user.click(refreshButton);

    expect(mockRefreshBalances).toHaveBeenCalledOnce();
  });

  it("collapses content when collapse button is clicked", async () => {
    const { user } = renderCard();

    // Initially expanded, tokens visible
    expect(screen.getByText("Ethereum")).toBeInTheDocument();

    const collapseButton = screen.getByRole("button", { name: /collapse/i });
    await user.click(collapseButton);

    // After collapse the button text changes to "Expand"
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
  });

  it("enters edit mode on edit button click", async () => {
    const { user } = renderCard();

    const editButton = screen.getByRole("button", { name: /edit label/i });
    await user.click(editButton);

    expect(screen.getByPlaceholderText("Wallet label")).toBeInTheDocument();
  });

  it("saves label on check button click", async () => {
    const { user } = renderCard();

    await user.click(screen.getByRole("button", { name: /edit label/i }));

    const input = screen.getByPlaceholderText("Wallet label");
    await user.clear(input);
    await user.type(input, "New Label");

    // Find the check/save button (MUI Check icon)
    const buttons = screen.getAllByRole("button");
    const checkButton = buttons.find(
      (b) => b.querySelector("[data-testid='CheckIcon']")
    );
    expect(checkButton).toBeDefined();
    await user.click(checkButton!);

    await waitFor(() => {
      expect(mockOnUpdateLabel).toHaveBeenCalledWith("wallet-1", "New Label");
    });
  });

  it("cancels editing on close button click", async () => {
    const { user } = renderCard();

    await user.click(screen.getByRole("button", { name: /edit label/i }));
    expect(screen.getByPlaceholderText("Wallet label")).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    const closeButton = buttons.find(
      (b) => b.querySelector("[data-testid='CloseIcon']")
    );
    expect(closeButton).toBeDefined();
    await user.click(closeButton!);

    // Back to non-edit mode
    expect(screen.getByText("My Wallet")).toBeInTheDocument();
  });

  it("reports totalValue via onTotalChange", () => {
    renderCard();
    expect(mockOnTotalChange).toHaveBeenCalledWith("wallet-1", 4750);
  });

  it("shows loading state", async () => {
    const { useWalletBalances } = await import("../hooks/useWallets");
    vi.mocked(useWalletBalances).mockReturnValueOnce({
      balances: null,
      isLoading: true,
      isRefreshing: false,
      error: null,
      refetch: vi.fn(),
      refreshBalances: vi.fn(),
    });

    render(
      <ThemeProvider>
        <WalletCard
          wallet={WALLET}
          currency="usd"
          hideSmallBalances={false}
          onRemove={mockOnRemove}
          onUpdateLabel={mockOnUpdateLabel}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows error state", async () => {
    const { useWalletBalances } = await import("../hooks/useWallets");
    vi.mocked(useWalletBalances).mockReturnValueOnce({
      balances: null,
      isLoading: false,
      isRefreshing: false,
      error: "Failed to load",
      refetch: vi.fn(),
      refreshBalances: vi.fn(),
    });

    render(
      <ThemeProvider>
        <WalletCard
          wallet={WALLET}
          currency="usd"
          hideSmallBalances={false}
          onRemove={mockOnRemove}
          onUpdateLabel={mockOnUpdateLabel}
        />
      </ThemeProvider>
    );

    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("hides small balance tokens when hideSmallBalances is true", () => {
    render(
      <ThemeProvider>
        <WalletCard
          wallet={WALLET}
          currency="usd"
          hideSmallBalances={true}
          onRemove={mockOnRemove}
          onUpdateLabel={mockOnUpdateLabel}
        />
      </ThemeProvider>
    );

    // USDT with $1000 value should still be visible
    expect(screen.getByText("Tether USD")).toBeInTheDocument();
  });

  it("shows 'all balances below' message when all tokens are hidden", async () => {
    const { useWalletBalances } = await import("../hooks/useWallets");
    vi.mocked(useWalletBalances).mockReturnValueOnce({
      balances: {
        ...MOCK_BALANCES,
        ethValue: 0.5,
        totalValue: 0.5,
        tokens: [
          { ...MOCK_BALANCES.tokens[0], valueFiat: 0.5 },
        ],
      },
      isLoading: false,
      isRefreshing: false,
      error: null,
      refetch: vi.fn(),
      refreshBalances: vi.fn(),
    });

    render(
      <ThemeProvider>
        <WalletCard
          wallet={WALLET}
          currency="usd"
          hideSmallBalances={true}
          onRemove={mockOnRemove}
          onUpdateLabel={mockOnUpdateLabel}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/all balances are below/i)).toBeInTheDocument();
  });
});
