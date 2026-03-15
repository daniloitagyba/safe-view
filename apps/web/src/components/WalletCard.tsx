import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  Collapse,
  CircularProgress,
  Avatar,
  Tooltip,
  Divider,
  TextField,
} from "@mui/material";
import {
  Delete,
  ExpandMore,
  ContentCopy,
  Edit,
  Check,
  Close,
  Refresh,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import type { Wallet, FiatCurrency, TokenBalance } from "../types";
import { useWalletBalances } from "../hooks/useWallets";

interface WalletCardProps {
  wallet: Wallet;
  currency: FiatCurrency;
  hideSmallBalances: boolean;
  onRemove: (id: string) => Promise<void>;
  onUpdateLabel: (id: string, label: string) => Promise<void>;
  onTotalChange?: (walletId: string, total: number) => void;
}

const CURRENCY_CODE: Record<FiatCurrency, string> = {
  usd: "USD",
  brl: "BRL",
};

const browserLocale = navigator.language || "en-US";

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatFiat(value: number, currency: FiatCurrency) {
  return new Intl.NumberFormat(browserLocale, {
    style: "currency",
    currency: CURRENCY_CODE[currency],
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCrypto(value: number) {
  if (value < 0.01) return "< 0.01";
  return new Intl.NumberFormat(browserLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function shouldShow(valueFiat: number | null, hide: boolean): boolean {
  if (!hide) return true;
  if (valueFiat === null) return true;
  return valueFiat >= 1;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const ETH_LOGO =
  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png";

function stringToColor(str: string): string {
  const colors = [
    "#00e5a0", "#7c5cfc", "#ff6b6b", "#ffa94d",
    "#339af0", "#e64980", "#20c997", "#845ef7",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function TokenRow({
  name,
  symbol,
  imageUrl,
  balance,
  valueFiat,
  fallbackChar,
}: {
  name: string;
  symbol: string;
  imageUrl: string;
  balance: string;
  valueFiat: string | null;
  fallbackChar: string;
}) {
  const fallbackColor = stringToColor(symbol);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 1.5,
        px: 0.5,
        borderRadius: 2,
        transition: "background 0.15s",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Avatar
          src={imageUrl}
          alt={symbol}
          imgProps={{
            onError: (e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            },
          }}
          sx={{
            width: 36,
            height: 36,
            bgcolor: "#ffffff",
            fontSize: 14,
            fontWeight: 800,
            color: fallbackColor,
            "& img": { objectFit: "contain", p: 0.25 },
          }}
        >
          {fallbackChar}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {symbol}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: "right", flexShrink: 0, ml: 2 }}>
        <Typography variant="body2" fontWeight={600}>
          {balance}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {valueFiat ?? "-"}
        </Typography>
      </Box>
    </Box>
  );
}

export function WalletCard({
  wallet,
  currency,
  hideSmallBalances,
  onRemove,
  onUpdateLabel,
  onTotalChange,
}: WalletCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(wallet.label ?? "");
  const { balances, isLoading, isRefreshing, error, refreshBalances } =
    useWalletBalances(wallet.id, currency);

  useEffect(() => {
    onTotalChange?.(wallet.id, balances?.totalValue ?? 0);
  }, [balances?.totalValue, wallet.id, onTotalChange]);

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    toast.success("Address copied");
  };

  const startEditing = () => {
    setEditLabel(wallet.label ?? "");
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const saveLabel = async () => {
    await onUpdateLabel(wallet.id, editLabel.trim());
    setEditing(false);
    toast.success("Label updated");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveLabel();
    if (e.key === "Escape") cancelEditing();
  };

  const showEth = shouldShow(balances?.ethValue ?? null, hideSmallBalances);

  const visibleTokens: TokenBalance[] = balances
    ? balances.tokens.filter((t) => shouldShow(t.valueFiat, hideSmallBalances))
    : [];

  const hasVisibleRows = showEth || visibleTokens.length > 0;

  return (
    <Card
      data-testid={`wallet-card-${wallet.id}`}
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: (t) =>
            t.palette.mode === "dark"
              ? "0 0 20px rgba(0,229,160,0.08)"
              : "0 4px 20px rgba(0,0,0,0.06)",
        },
      }}
    >
      <Box sx={{ px: { xs: 2.5, md: 3 }, py: 2.5, borderBottom: expanded ? "1px solid" : "none", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #00e5a0 0%, #7c5cfc 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {(wallet.label || wallet.address).charAt(0).toUpperCase()}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              {editing ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <TextField
                    data-testid="edit-label-input"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={handleKeyDown}
                    size="small"
                    autoFocus
                    placeholder="Wallet label"
                    sx={{ "& input": { py: 0.5, fontSize: 14 } }}
                  />
                  <IconButton data-testid="save-label-button" size="small" onClick={saveLabel} color="primary">
                    <Check fontSize="small" />
                  </IconButton>
                  <IconButton data-testid="cancel-label-button" size="small" onClick={cancelEditing}>
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography data-testid="wallet-label" variant="subtitle1" fontWeight={700} noWrap>
                    {wallet.label || formatAddress(wallet.address)}
                  </Typography>
                  <Tooltip title="Edit label">
                    <IconButton
                      data-testid="edit-label-button"
                      size="small"
                      onClick={startEditing}
                      sx={{ opacity: 0.4, "&:hover": { opacity: 1 } }}
                    >
                      <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              <Chip
                label={formatAddress(wallet.address)}
                size="small"
                variant="outlined"
                onClick={copyAddress}
                icon={<ContentCopy sx={{ fontSize: 11 }} />}
                sx={{
                  height: 22,
                  fontSize: 11,
                  mt: 0.5,
                  fontFamily: "'JetBrains Mono', monospace",
                  borderColor: "divider",
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            {balances && (
              <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" }, mr: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Total
                  {balances.syncedAt && (
                    <> &middot; {formatTimeAgo(balances.syncedAt)}</>
                  )}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  {formatFiat(balances.totalValue, currency)}
                </Typography>
              </Box>
            )}
            <Tooltip title="Refresh balances">
              <IconButton
                data-testid="refresh-button"
                size="small"
                onClick={refreshBalances}
                disabled={isRefreshing}
                sx={{
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              >
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={expanded ? "Collapse" : "Expand"}>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{
                  transition: "transform 0.2s",
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <ExpandMore fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove wallet">
              <IconButton
                data-testid="delete-wallet-button"
                size="small"
                onClick={() => onRemove(wallet.id)}
                sx={{ opacity: 0.4, "&:hover": { opacity: 1, color: "error.main" } }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <CardContent sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, "&:last-child": { pb: 2 } }}>
          {isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={24} sx={{ color: "primary.main" }} />
            </Box>
          )}

          {error && (
            <Typography color="error" variant="body2" sx={{ textAlign: "center", py: 3 }}>
              {error}
            </Typography>
          )}

          {balances && !hasVisibleRows && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
              All balances are below 1 {currency.toUpperCase()}
            </Typography>
          )}

          {balances && hasVisibleRows && (
            <>
              <Box>
                {showEth && (
                  <TokenRow
                    name="Ethereum"
                    symbol="ETH"
                    imageUrl={ETH_LOGO}
                    balance={formatCrypto(balances.ethBalance)}
                    valueFiat={formatFiat(balances.ethValue, currency)}
                    fallbackChar="E"
                  />
                )}

                {visibleTokens.map((token) => (
                  <TokenRow
                    key={token.contractAddress}
                    name={token.tokenName}
                    symbol={token.tokenSymbol}
                    imageUrl={token.imageUrl}
                    balance={formatCrypto(token.balanceFormatted)}
                    valueFiat={
                      token.valueFiat !== null
                        ? formatFiat(token.valueFiat, currency)
                        : null
                    }
                    fallbackChar={token.tokenSymbol.charAt(0)}
                  />
                ))}
              </Box>

              <Divider sx={{ mt: 1.5 }} />
              <Box sx={{ display: { xs: "flex", sm: "none" }, justifyContent: "space-between", alignItems: "center", pt: 2 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Total Value
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  {formatFiat(balances.totalValue, currency)}
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
}
