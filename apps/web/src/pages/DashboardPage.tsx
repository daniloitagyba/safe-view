import { useState, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { Header } from "../components/Header";
import { AddWalletForm } from "../components/AddWalletForm";
import { WalletCard } from "../components/WalletCard";
import { useWallets } from "../hooks/useWallets";
import type { FiatCurrency } from "../types";

const CURRENCY_OPTIONS: { value: FiatCurrency; flag: string; label: string }[] = [
  { value: "usd", flag: "\u{1F1FA}\u{1F1F8}", label: "USD" },
  { value: "brl", flag: "\u{1F1E7}\u{1F1F7}", label: "BRL" },
];

const CURRENCY_CODE: Record<FiatCurrency, string> = {
  usd: "USD",
  eur: "EUR",
  brl: "BRL",
};

const browserLocale = navigator.language || "en-US";

function formatFiat(value: number, currency: FiatCurrency) {
  return new Intl.NumberFormat(browserLocale, {
    style: "currency",
    currency: CURRENCY_CODE[currency],
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DashboardPage() {
  const { wallets, isLoading, addWallet, updateWallet, removeWallet } = useWallets();
  const [currency, setCurrency] = useState<FiatCurrency>(() => {
    return (localStorage.getItem("sv_currency") as FiatCurrency) || "usd";
  });
  const [hideSmallBalances, setHideSmallBalances] = useState(() => {
    return localStorage.getItem("sv_hideSmall") === "true";
  });
  const [walletTotals, setWalletTotals] = useState<Record<string, number>>({});

  const handleCurrencyChange = (_: unknown, value: FiatCurrency | null) => {
    if (!value) return;
    setCurrency(value);
    localStorage.setItem("sv_currency", value);
  };

  const handleHideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHideSmallBalances(e.target.checked);
    localStorage.setItem("sv_hideSmall", String(e.target.checked));
  };

  const handleTotalChange = useCallback((walletId: string, total: number) => {
    setWalletTotals((prev) => {
      if (prev[walletId] === total) return prev;
      return { ...prev, [walletId]: total };
    });
  }, []);

  const grandTotal = Object.values(walletTotals).reduce((sum, v) => sum + v, 0);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Header />

      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 3 }, py: 4, display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Title + Grand Total */}
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>
            My Wallets
          </Typography>
          {wallets.length > 0 && grandTotal > 0 && (
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                mt: 0.5,
                background: "linear-gradient(90deg, #00e5a0, #7c5cfc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {formatFiat(grandTotal, currency)}
            </Typography>
          )}
        </Box>

        {/* Controls */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <ToggleButtonGroup
            value={currency}
            exclusive
            onChange={handleCurrencyChange}
            size="small"
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <ToggleButton
                key={opt.value}
                value={opt.value}
                sx={{
                  px: 2,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "#0b0e17",
                    fontWeight: 700,
                    "&:hover": { bgcolor: "primary.dark" },
                  },
                }}
              >
                <span style={{ marginRight: 6 }}>{opt.flag}</span>{opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <FormControlLabel
            control={
              <Switch
                checked={hideSmallBalances}
                onChange={handleHideChange}
                size="small"
                color="primary"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Hide &lt; 1 {currency.toUpperCase()}
              </Typography>
            }
            sx={{ ml: 0 }}
          />
        </Box>

        <AddWalletForm onAdd={addWallet} />

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: "primary.main" }} />
          </Box>
        )}

        {!isLoading && wallets.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography
              variant="h1"
              sx={{ fontSize: 56, mb: 2, opacity: 0.15 }}
            >
              { "\u{1F4B0}" }
            </Typography>
            <Typography variant="h6" color="text.secondary">
              No wallets added yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Add an Ethereum address above to start tracking.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              currency={currency}
              hideSmallBalances={hideSmallBalances}
              onRemove={removeWallet}
              onUpdateLabel={updateWallet}
              onTotalChange={handleTotalChange}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
