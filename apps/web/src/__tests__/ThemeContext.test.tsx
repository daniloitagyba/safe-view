import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useThemeMode } from "../contexts/ThemeContext";

function TestConsumer() {
  const { mode, toggleTheme } = useThemeMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to dark mode", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
  });

  it("reads saved theme from localStorage", () => {
    localStorage.setItem("sv_theme", "light");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("toggles theme and persists to localStorage", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");

    await user.click(screen.getByText("Toggle"));

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
    expect(localStorage.getItem("sv_theme")).toBe("light");

    await user.click(screen.getByText("Toggle"));

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(localStorage.getItem("sv_theme")).toBe("dark");
  });
});
