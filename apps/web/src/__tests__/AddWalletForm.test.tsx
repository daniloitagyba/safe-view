import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "../contexts/ThemeContext";
import { AddWalletForm } from "../components/AddWalletForm";

function renderForm(onAdd = vi.fn().mockResolvedValue(undefined)) {
  return {
    onAdd,
    user: userEvent.setup(),
    ...render(
      <ThemeProvider>
        <AddWalletForm onAdd={onAdd} />
      </ThemeProvider>
    ),
  };
}

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

describe("AddWalletForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders address and label inputs", () => {
    renderForm();

    expect(screen.getByLabelText(/ethereum address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
  });

  it("disables submit button when address is empty", () => {
    renderForm();

    const button = screen.getByRole("button", { name: /add/i });
    expect(button).toBeDisabled();
  });

  it("enables submit button with valid address", async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText(/ethereum address/i), VALID_ADDRESS);

    const button = screen.getByRole("button", { name: /add/i });
    expect(button).toBeEnabled();
  });

  it("shows error for invalid address", async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText(/ethereum address/i), "0xinvalid");

    expect(screen.getByText(/invalid ethereum address/i)).toBeInTheDocument();
  });

  it("calls onAdd with address and label", async () => {
    const { user, onAdd } = renderForm();

    await user.type(screen.getByLabelText(/ethereum address/i), VALID_ADDRESS);
    await user.type(screen.getByLabelText(/label/i), "My Wallet");
    await user.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(VALID_ADDRESS, "My Wallet");
    });
  });

  it("clears form after successful submission", async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText(/ethereum address/i), VALID_ADDRESS);
    await user.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/ethereum address/i)).toHaveValue("");
    });
  });

  it("does not submit with invalid address", async () => {
    const { user, onAdd } = renderForm();

    await user.type(screen.getByLabelText(/ethereum address/i), "invalid");

    // Button should be disabled, but also try form submission
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("sends undefined label when label is empty", async () => {
    const { user, onAdd } = renderForm();

    await user.type(screen.getByLabelText(/ethereum address/i), VALID_ADDRESS);
    await user.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(VALID_ADDRESS, undefined);
    });
  });
});
