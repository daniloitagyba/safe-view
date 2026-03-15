import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { Logout, DarkMode, LightMode } from "@mui/icons-material";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";

export function Header() {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: mode === "dark" ? "rgba(11,14,23,0.85)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ maxWidth: 900, width: "100%", mx: "auto", px: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexGrow: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00e5a0 0%, #7c5cfc 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            S
          </Box>
          <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
            SafeView
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
            <IconButton data-testid="theme-toggle" onClick={toggleTheme} color="inherit" size="small">
              {mode === "dark" ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Tooltip>

          {user && (
            <Box>
              <IconButton data-testid="user-menu-button" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 0.5 }}>
                <Avatar
                  src={user.avatarUrl ?? undefined}
                  alt={user.name ?? "User"}
                  sx={{
                    width: 34,
                    height: 34,
                    border: "2px solid",
                    borderColor: "primary.main",
                  }}
                />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                slotProps={{ paper: { sx: { borderRadius: 3, mt: 1 } } }}
              >
                <MenuItem disabled>
                  <Typography variant="body2">{user.email}</Typography>
                </MenuItem>
                <MenuItem
                  data-testid="logout-button"
                  onClick={() => {
                    setAnchorEl(null);
                    logout();
                  }}
                >
                  <Logout fontSize="small" sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
