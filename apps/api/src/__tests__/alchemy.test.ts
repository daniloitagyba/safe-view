import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally before importing alchemy
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Must import after mocks are set up
const { getEthBalance, getTokenBalances, getEthPrices } = await import(
  "../lib/alchemy.js"
);

function rpcResponse<T>(result: T) {
  return { ok: true, json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result }) };
}

function rpcError(code: number, message: string) {
  return { ok: true, json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, error: { code, message } }) };
}

describe("alchemy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEthBalance", () => {
    it("returns balance in wei as decimal string", async () => {
      mockFetch.mockResolvedValueOnce(rpcResponse("0xde0b6b3a7640000")); // 1 ETH

      const balance = await getEthBalance("0x1234567890abcdef1234567890abcdef12345678");

      expect(balance).toBe("1000000000000000000");
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("throws on RPC error", async () => {
      // withRetry retries 3 times, so mock all attempts
      mockFetch.mockResolvedValue(rpcError(-32600, "Invalid request"));

      await expect(
        getEthBalance("0x1234567890abcdef1234567890abcdef12345678")
      ).rejects.toThrow("Failed to fetch blockchain data");
    });

    it("retries on network failure", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(rpcResponse("0x0"));

      const balance = await getEthBalance("0x1234567890abcdef1234567890abcdef12345678");

      expect(balance).toBe("0");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getTokenBalances", () => {
    it("returns empty array when no tokens", async () => {
      mockFetch.mockResolvedValueOnce(
        rpcResponse({ address: "0xabc", tokenBalances: [] })
      );

      const tokens = await getTokenBalances("0x1234567890abcdef1234567890abcdef12345678");

      expect(tokens).toEqual([]);
    });

    it("filters out zero-balance tokens", async () => {
      mockFetch.mockResolvedValueOnce(
        rpcResponse({
          address: "0xabc",
          tokenBalances: [{ contractAddress: "0xtoken1", tokenBalance: "0x0" }],
        })
      );

      const tokens = await getTokenBalances("0x1234567890abcdef1234567890abcdef12345678");

      expect(tokens).toEqual([]);
    });

    it("fetches metadata and prices for non-zero tokens", async () => {
      // 1. getTokenBalances RPC
      mockFetch.mockResolvedValueOnce(
        rpcResponse({
          address: "0xabc",
          tokenBalances: [
            { contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7", tokenBalance: "0x5f5e100" }, // 100 USDT (6 decimals)
          ],
        })
      );

      // 2. getTokenMetadata RPC
      mockFetch.mockResolvedValueOnce(
        rpcResponse({
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          logo: "https://example.com/usdt.png",
        })
      );

      // 3. getTokenPrices (CryptoCompare)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ USDT: { USD: 1.0, EUR: 0.92, BRL: 5.0 } }),
      });

      const tokens = await getTokenBalances("0x1234567890abcdef1234567890abcdef12345678");

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
        tokenName: "Tether USD",
        tokenSymbol: "USDT",
        tokenDecimal: 6,
        balanceFormatted: 100,
        imageUrl: "https://example.com/usdt.png",
      });
      expect(tokens[0].prices).toEqual({ usd: 1.0, eur: 0.92, brl: 5.0 });
    });

    it("skips tokens without prices", async () => {
      mockFetch.mockResolvedValueOnce(
        rpcResponse({
          address: "0xabc",
          tokenBalances: [
            { contractAddress: "0xtoken1", tokenBalance: "0x5f5e100" },
          ],
        })
      );

      mockFetch.mockResolvedValueOnce(
        rpcResponse({ name: "Unknown Token", symbol: "UNK", decimals: 18, logo: null })
      );

      // CryptoCompare returns empty (no price for UNK)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const tokens = await getTokenBalances("0x1234567890abcdef1234567890abcdef12345678");

      expect(tokens).toHaveLength(0);
    });
  });

  describe("getEthPrices", () => {
    it("returns ETH prices in multiple currencies", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ USD: 2500, EUR: 2300, BRL: 12500 }),
      });

      const prices = await getEthPrices();

      expect(prices).toEqual({ usd: 2500, eur: 2300, brl: 12500 });
    });

    it("throws when USD price is missing", async () => {
      // withRetry retries 3 times
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ EUR: 2300 }),
      });

      await expect(getEthPrices()).rejects.toThrow("Failed to fetch ETH prices");
    });
  });
});
