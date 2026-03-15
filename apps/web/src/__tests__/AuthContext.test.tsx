import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

// Mock api module
vi.mock("../services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const { api } = await import("../services/api");

function TestConsumer() {
  const { user, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? user.email : "none"}</span>
      <button onClick={() => login("test-credential")}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("starts with loading true and no user when no token", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("fetches user when token exists in localStorage", async () => {
    localStorage.setItem("token", "existing-token");
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { user: { id: "u1", email: "test@test.com", name: "Test", avatarUrl: null, googleId: "g1" } },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });
    expect(api.get).toHaveBeenCalledWith("/auth/me");
  });

  it("removes token when /auth/me fails", async () => {
    localStorage.setItem("token", "bad-token");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("401"));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(localStorage.getItem("token")).toBeNull();
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("login stores token and sets user", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        token: "new-jwt",
        user: { id: "u1", email: "new@test.com", name: "New", avatarUrl: null, googleId: "g1" },
      },
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    await user.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("new@test.com");
    });
    expect(localStorage.getItem("token")).toBe("new-jwt");
    expect(api.post).toHaveBeenCalledWith("/auth/google", { credential: "test-credential" });
  });

  it("logout clears token and user", async () => {
    localStorage.setItem("token", "existing-token");
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { user: { id: "u1", email: "test@test.com", name: "Test", avatarUrl: null, googleId: "g1" } },
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@test.com");
    });

    await user.click(screen.getByText("Logout"));

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("useAuth throws when used outside provider", () => {
    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useAuth must be used within an AuthProvider");
  });
});
