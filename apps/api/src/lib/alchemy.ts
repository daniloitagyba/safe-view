import { env } from "../config/env.js";

const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;
const CRYPTOCOMPARE_URL =
  "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,BRL";

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Alchemy RPC
// ---------------------------------------------------------------------------

interface AlchemyRpcResponse<T> {
  jsonrpc: string;
  id: number;
  result: T;
  error?: { code: number; message: string };
}

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface AlchemyTokenBalancesResult {
  address: string;
  tokenBalances: AlchemyTokenBalance[];
}

export interface AlchemyTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
}

async function alchemyRpc<T>(
  method: string,
  params: unknown[]
): Promise<T> {
  const response = await fetch(ALCHEMY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  const data = (await response.json()) as AlchemyRpcResponse<T>;

  if (data.error) {
    console.error(`Alchemy RPC error [${method}]: ${data.error.message}`);
    throw new Error("Failed to fetch blockchain data");
  }

  return data.result;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FiatCurrency = "usd" | "eur" | "brl";

export interface EthPrices {
  usd: number;
  eur: number;
  brl: number;
}

export interface TokenBalance {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  balance: string;
  balanceFormatted: number;
  imageUrl: string;
  prices: EthPrices | null;
}

export interface CachedWalletData {
  ethBalanceWei: string;
  tokens: TokenBalance[];
  ethPrices: EthPrices;
  syncedAt: number;
}

// ---------------------------------------------------------------------------
// Public API — pure calls, no cache (worker handles caching via Redis)
// ---------------------------------------------------------------------------

export async function getEthBalance(address: string): Promise<string> {
  const hexBalance = await withRetry(() =>
    alchemyRpc<string>("eth_getBalance", [address, "latest"])
  );
  return BigInt(hexBalance).toString();
}

export async function getTokenBalances(
  address: string
): Promise<TokenBalance[]> {
  const result = await withRetry(() =>
    alchemyRpc<AlchemyTokenBalancesResult>("alchemy_getTokenBalances", [
      address,
      "erc20",
    ])
  );

  const nonZeroTokens = result.tokenBalances.filter(
    (t) => t.tokenBalance !== "0x" && BigInt(t.tokenBalance) > 0n
  );

  if (nonZeroTokens.length === 0) return [];

  const metadataList: { token: AlchemyTokenBalance; metadata: AlchemyTokenMetadata }[] = [];

  for (const token of nonZeroTokens) {
    try {
      const metadata = await getTokenMetadata(token.contractAddress);
      metadataList.push({ token, metadata });
    } catch {
      // Skip tokens that fail metadata fetch
    }
  }

  const symbols = metadataList
    .map((m) => m.metadata.symbol)
    .filter(Boolean);
  const priceMap = await getTokenPrices(symbols);

  return metadataList.map(({ token, metadata }) => {
    const decimals = metadata.decimals || 18;
    const rawBalance = BigInt(token.tokenBalance).toString();
    const balanceFormatted =
      Number(BigInt(token.tokenBalance)) / Math.pow(10, decimals);
    const symbol = (metadata.symbol || "").toUpperCase();

    return {
      contractAddress: token.contractAddress,
      tokenName: metadata.name || "Unknown",
      tokenSymbol: metadata.symbol || "???",
      tokenDecimal: decimals,
      balance: rawBalance,
      balanceFormatted,
      imageUrl:
        metadata.logo ||
        `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token.contractAddress}/logo.png`,
      prices: priceMap.get(symbol) ?? null,
    };
  });
}

type CryptoComparePriceMulti = Record<string, Record<string, number>>;

async function getTokenPrices(
  symbols: string[]
): Promise<Map<string, EthPrices>> {
  const result = new Map<string, EthPrices>();
  if (symbols.length === 0) return result;

  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];

  try {
    const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${unique.join(",")}&tsyms=USD,EUR,BRL`;
    const data = await withRetry(async () => {
      const res = await fetch(url);
      return (await res.json()) as CryptoComparePriceMulti;
    });

    for (const [symbol, prices] of Object.entries(data)) {
      if (prices.USD !== undefined) {
        result.set(symbol.toUpperCase(), {
          usd: prices.USD,
          eur: prices.EUR,
          brl: prices.BRL,
        });
      }
    }
  } catch {
    // Return partial/empty results if price fetch fails
  }

  return result;
}

async function getTokenMetadata(
  contractAddress: string
): Promise<AlchemyTokenMetadata> {
  return withRetry(() =>
    alchemyRpc<AlchemyTokenMetadata>("alchemy_getTokenMetadata", [
      contractAddress,
    ])
  );
}

export async function getEthPrices(): Promise<EthPrices> {
  return withRetry(async () => {
    const response = await fetch(CRYPTOCOMPARE_URL);
    const data = (await response.json()) as Record<string, number>;

    if (!data.USD) {
      throw new Error("Failed to fetch ETH prices");
    }

    return { usd: data.USD, eur: data.EUR, brl: data.BRL };
  });
}
