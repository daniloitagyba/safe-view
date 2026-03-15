import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "../contexts/ThemeContext";
import { Header } from "../components/Header";

const mockLogout = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "u1", email: "test@test.com", name: "Test User", avatarUrl: null, googleId: "g1" },
    isLoading: false,
    login: vi.fn(),
    logout: mockLogout,
  })),
}));

function renderHeader() {
  return {
    user: userEvent.setup(),
    ...render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>
    ),
  };
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders SafeView brand", () => {
    renderHeader();
    expect(screen.getByText("SafeView")).toBeInTheDocument();
  });

  it("shows theme toggle button", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /light mode/i })).toBeInTheDocument();
  });

  it("toggles theme on click", async () => {
    const { user } = renderHeader();

    await user.click(screen.getByRole("button", { name: /light mode/i }));

    expect(screen.getByRole("button", { name: /dark mode/i })).toBeInTheDocument();
  });

  it("shows user avatar button", () => {
    renderHeader();
    // Avatar button is present
    const avatarButtons = screen.getAllByRole("button");
    expect(avatarButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("opens menu and shows email on avatar click", async () => {
    const { user } = renderHeader();

    // Find and click the avatar button (the one that isn't the theme toggle)
    const buttons = screen.getAllByRole("button");
    const avatarButton = buttons.find((b) => b.querySelector(".MuiAvatar-root"));
    expect(avatarButton).toBeDefined();

    await user.click(avatarButton!);

    await waitFor(() => {
      expect(screen.getByText("test@test.com")).toBeInTheDocument();
    });
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("calls logout when Logout menu item is clicked", async () => {
    const { user } = renderHeader();

    const buttons = screen.getAllByRole("button");
    const avatarButton = buttons.find((b) => b.querySelector(".MuiAvatar-root"));
    await user.click(avatarButton!);

    await waitFor(() => {
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Logout"));

    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
