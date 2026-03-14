import { createContext, useContext, useState, useMemo } from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem("sv_theme") as ThemeMode) || "dark";
  });

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("sv_theme", next);
      return next;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === "dark"
            ? {
                background: { default: "#0b0e17", paper: "#141824" },
                primary: { main: "#00e5a0" },
                secondary: { main: "#7c5cfc" },
                text: { primary: "#e8eaf0", secondary: "#8a8fa8" },
                divider: "rgba(255,255,255,0.08)",
              }
            : {
                background: { default: "#f0f2f8", paper: "#ffffff" },
                primary: { main: "#00b87a" },
                secondary: { main: "#6c47ec" },
                text: { primary: "#1a1d2e", secondary: "#6b7080" },
                divider: "rgba(0,0,0,0.08)",
              }),
        },
        shape: { borderRadius: 16 },
        typography: {
          fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
          h4: { fontWeight: 800, letterSpacing: "-0.02em" },
          h5: { fontWeight: 800, letterSpacing: "-0.01em" },
          h6: { fontWeight: 700 },
          subtitle1: { fontWeight: 700 },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: { textTransform: "none", fontWeight: 600, borderRadius: 12 },
            },
          },
          MuiToggleButton: {
            styleOverrides: {
              root: { textTransform: "none", fontWeight: 600, borderRadius: 10 },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { fontWeight: 500 },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: { backgroundImage: "none" },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
