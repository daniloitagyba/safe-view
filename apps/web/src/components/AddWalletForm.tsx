import { useState } from "react";
import {
  TextField,
  Button,
  Paper,
  Box,
  CircularProgress,
} from "@mui/material";
import { Add, ContentPaste } from "@mui/icons-material";
import { IconButton, InputAdornment } from "@mui/material";
import toast from "react-hot-toast";

interface AddWalletFormProps {
  onAdd: (address: string, label?: string) => Promise<unknown>;
}

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function AddWalletForm({ onAdd }: AddWalletFormProps) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = ETH_ADDRESS_REGEX.test(address);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onAdd(address, label || undefined);
      setAddress("");
      setLabel("");
      toast.success("Wallet added successfully");
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Failed to add wallet";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3 },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
      }}
    >
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "flex-start" } }}>
          <TextField
            data-testid="wallet-address-input"
            label="Ethereum Address (0x...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
            size="small"
            error={address.length > 0 && !isValid}
            helperText={
              address.length > 0 && !isValid ? "Invalid Ethereum address" : " "
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={async () => {
                        const text = await navigator.clipboard.readText();
                        setAddress(text.trim());
                      }}
                      edge="end"
                    >
                      <ContentPaste fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            data-testid="wallet-label-input"
            label="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <Button
            data-testid="add-wallet-button"
            type="submit"
            variant="contained"
            disabled={!isValid || isSubmitting}
            startIcon={
              isSubmitting ? <CircularProgress size={18} /> : <Add />
            }
            sx={{
              minWidth: 110,
              background: "linear-gradient(135deg, #00e5a0, #7c5cfc)",
              color: "#fff",
              fontWeight: 700,
              "&:hover": {
                background: "linear-gradient(135deg, #00c98c, #6a48e0)",
              },
              "&.Mui-disabled": {
                background: "rgba(128,128,128,0.3)",
              },
            }}
          >
            Add
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
