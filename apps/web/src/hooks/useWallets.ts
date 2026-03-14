import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { Wallet, WalletBalances, FiatCurrency } from "../types";

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWallets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/wallets");
      setWallets(res.data.wallets);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const addWallet = async (address: string, label?: string) => {
    const res = await api.post("/api/wallets", { address, label });
    setWallets((prev) => [res.data.wallet, ...prev]);
    return res.data.wallet as Wallet;
  };

  const updateWallet = async (id: string, label: string) => {
    const res = await api.patch(`/api/wallets/${id}`, { label });
    setWallets((prev) =>
      prev.map((w) => (w.id === id ? res.data.wallet : w))
    );
  };

  const removeWallet = async (id: string) => {
    await api.delete(`/api/wallets/${id}`);
    setWallets((prev) => prev.filter((w) => w.id !== id));
  };

  return { wallets, isLoading, addWallet, updateWallet, removeWallet, refetch: fetchWallets };
}

export function useWalletBalances(
  walletId: string | null,
  currency: FiatCurrency
) {
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!walletId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/wallets/${walletId}/balances`, {
        params: { currency },
      });
      setBalances(res.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch balances"
      );
    } finally {
      setIsLoading(false);
    }
  }, [walletId, currency]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, isLoading, error, refetch: fetchBalances };
}
