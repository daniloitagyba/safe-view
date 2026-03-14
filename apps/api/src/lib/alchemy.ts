import { env } from "../config/env.js";

const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;
const CRYPTOCOMPARE_URL =
  "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,BRL";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const TTL = {
  PRICES: 60_000,         // 60s  — prices don't change every second
  BALANCE: 30_000,        // 30s  — balances update infrequently
  TOKEN_METADATA: 600_000, // 10min — name/symbol/logo are static
} as const;

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

interface AlchemyTokenMetadata {
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
    throw new Error(`Alchemy API error: ${data.error.message}`);
  }

  return data.result;
}

// ---------------------------------------------------------------------------
// Public API
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

export async function getEthBalance(address: string): Promise<string> {
  const cacheKey = `eth_balance:${address}`;
  const cached = getCached<string>(cacheKey);
  if (cached !== null) return cached;

  const hexBalance = await withRetry(() =>
    alchemyRpc<string>("eth_getBalance", [address, "latest"])
  );

  const balance = BigInt(hexBalance).toString();
  setCache(cacheKey, balance, TTL.BALANCE);
  return balance;
}

export async function getTokenBalances(
  address: string
): Promise<TokenBalance[]> {
  const cacheKey = `token_balances:${address}`;
  const cached = getCached<TokenBalance[]>(cacheKey);
  if (cached !== null) return cached;

  const result = await withRetry(() =>
    alchemyRpc<AlchemyTokenBalancesResult>("alchemy_getTokenBalances", [
      address,
      "erc20",
    ])
  );

  const nonZeroTokens = result.tokenBalances.filter(
    (t) => t.tokenBalance !== "0x" && BigInt(t.tokenBalance) > 0n
  );

  if (nonZeroTokens.length === 0) {
    setCache(cacheKey, [], TTL.BALANCE);
    return [];
  }

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

  const balances: TokenBalance[] = metadataList.map(({ token, metadata }) => {
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

  setCache(cacheKey, balances, TTL.BALANCE);
  return balances;
}

type CryptoComparePriceMulti = Record<string, Record<string, number>>;

async function getTokenPrices(
  symbols: string[]
): Promise<Map<string, EthPrices>> {
  const result = new Map<string, EthPrices>();
  if (symbols.length === 0) return result;

  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const cacheKey = `token_prices:${unique.sort().join(",")}`;
  const cached = getCached<Map<string, EthPrices>>(cacheKey);
  if (cached !== null) return cached;

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

  setCache(cacheKey, result, TTL.PRICES);
  return result;
}

async function getTokenMetadata(
  contractAddress: string
): Promise<AlchemyTokenMetadata> {
  const cacheKey = `token_meta:${contractAddress}`;
  const cached = getCached<AlchemyTokenMetadata>(cacheKey);
  if (cached !== null) return cached;

  const metadata = await withRetry(() =>
    alchemyRpc<AlchemyTokenMetadata>("alchemy_getTokenMetadata", [
      contractAddress,
    ])
  );

  setCache(cacheKey, metadata, TTL.TOKEN_METADATA);
  return metadata;
}

export async function getEthPrices(): Promise<EthPrices> {
  const cacheKey = "eth_prices";
  const cached = getCached<EthPrices>(cacheKey);
  if (cached !== null) return cached;

  const prices = await withRetry(async () => {
    const response = await fetch(CRYPTOCOMPARE_URL);
    const data = (await response.json()) as Record<string, number>;

    if (!data.USD) {
      throw new Error("Failed to fetch ETH prices from CryptoCompare");
    }

    return { usd: data.USD, eur: data.EUR, brl: data.BRL };
  });

  setCache(cacheKey, prices, TTL.PRICES);
  return prices;
}
