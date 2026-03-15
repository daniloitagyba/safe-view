export type FiatCurrency = "usd" | "brl";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  googleId: string;
}

export interface Wallet {
  id: string;
  address: string;
  label: string | null;
  userId: string;
  createdAt: string;
}

export interface TokenBalance {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  balance: string;
  balanceFormatted: number;
  imageUrl: string;
  valueFiat: number | null;
}

export interface WalletBalances {
  address: string;
  currency: FiatCurrency;
  ethBalance: number;
  ethPrice: number;
  ethValue: number;
  totalValue: number;
  tokens: TokenBalance[];
  syncedAt?: number;
}
