import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../contexts/ThemeContext";
import { LoginPage } from "../pages/LoginPage";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

// Mock GoogleLogin since it requires provider context
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: (props: { onSuccess: Function; onError: Function }) => (
    <button
      data-testid="google-login"
      onClick={() => props.onSuccess({ credential: "test-cred" })}
    >
      Sign in with Google
    </button>
  ),
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  it("renders SafeView brand", () => {
    renderLogin();
    expect(screen.getByText("SafeView")).toBeInTheDocument();
  });

  it("renders description text", () => {
    renderLogin();
    expect(
      screen.getByText(/track your ethereum portfolio/i)
    ).toBeInTheDocument();
  });

  it("renders Google login button", () => {
    renderLogin();
    expect(screen.getByTestId("google-login")).toBeInTheDocument();
  });

  it("calls login on successful Google auth", async () => {
    const { useAuth } = await import("../contexts/AuthContext");
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
    });

    const { user } = { user: (await import("@testing-library/user-event")).default.setup() };

    renderLogin();
    await user.click(screen.getByTestId("google-login"));

    expect(mockLogin).toHaveBeenCalledWith("test-cred");
  });
});
