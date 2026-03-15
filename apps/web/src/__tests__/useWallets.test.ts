import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("../services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const { api } = await import("../services/api");
const { useWallets, useWalletBalances } = await import("../hooks/useWallets");

const WALLET = {
  id: "w1",
  address: "0x1234567890abcdef1234567890abcdef12345678",
  label: "Test",
  userId: "u1",
  createdAt: new Date().toISOString(),
};

const BALANCES = {
  address: WALLET.address,
  currency: "usd",
  ethBalance: 1,
  ethPrice: 2500,
  ethValue: 2500,
  totalValue: 2500,
  tokens: [],
  syncedAt: Date.now(),
};

describe("useWallets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches wallets on mount", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { wallets: [WALLET] } });

    const { result } = renderHook(() => useWallets());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wallets).toEqual([WALLET]);
    expect(api.get).toHaveBeenCalledWith("/api/wallets");
  });

  it("addWallet posts and prepends to list", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { wallets: [] } });
    vi.mocked(api.post).mockResolvedValueOnce({ data: { wallet: WALLET } });

    const { result } = renderHook(() => useWallets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addWallet(WALLET.address, "Test");
    });

    expect(api.post).toHaveBeenCalledWith("/api/wallets", {
      address: WALLET.address,
      label: "Test",
    });
    expect(result.current.wallets).toHaveLength(1);
  });

  it("updateWallet patches and updates list", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { wallets: [WALLET] } });
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { wallet: { ...WALLET, label: "Updated" } },
    });

    const { result } = renderHook(() => useWallets());

    await waitFor(() => {
      expect(result.current.wallets).toHaveLength(1);
    });

    await act(async () => {
      await result.current.updateWallet("w1", "Updated");
    });

    expect(api.patch).toHaveBeenCalledWith("/api/wallets/w1", { label: "Updated" });
    expect(result.current.wallets[0].label).toBe("Updated");
  });

  it("removeWallet deletes and removes from list", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { wallets: [WALLET] } });
    vi.mocked(api.delete).mockResolvedValueOnce({});

    const { result } = renderHook(() => useWallets());

    await waitFor(() => {
      expect(result.current.wallets).toHaveLength(1);
    });

    await act(async () => {
      await result.current.removeWallet("w1");
    });

    expect(api.delete).toHaveBeenCalledWith("/api/wallets/w1");
    expect(result.current.wallets).toHaveLength(0);
  });
});

describe("useWalletBalances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches balances when walletId is provided", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: BALANCES });

    const { result } = renderHook(() => useWalletBalances("w1", "usd"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balances).toEqual(BALANCES);
    expect(api.get).toHaveBeenCalledWith("/api/wallets/w1/balances", {
      params: { currency: "usd" },
    });
  });

  it("does not fetch when walletId is null", async () => {
    const { result } = renderHook(() => useWalletBalances(null, "usd"));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.balances).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("sets error on fetch failure", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useWalletBalances("w1", "usd"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  it("refreshBalances posts and updates balances", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: BALANCES });
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { ...BALANCES, totalValue: 3000 },
    });

    const { result } = renderHook(() => useWalletBalances("w1", "usd"));

    await waitFor(() => {
      expect(result.current.balances).toBeTruthy();
    });

    await act(async () => {
      await result.current.refreshBalances();
    });

    expect(api.post).toHaveBeenCalledWith("/api/wallets/w1/refresh", {}, {
      params: { currency: "usd" },
    });
    expect(result.current.balances?.totalValue).toBe(3000);
  });

  it("sets error on refresh failure", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: BALANCES });
    vi.mocked(api.post).mockRejectedValueOnce(new Error("Timeout"));

    const { result } = renderHook(() => useWalletBalances("w1", "usd"));

    await waitFor(() => {
      expect(result.current.balances).toBeTruthy();
    });

    await act(async () => {
      await result.current.refreshBalances();
    });

    expect(result.current.error).toBe("Timeout");
  });
});
