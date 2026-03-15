import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
});

// Mock navigator.clipboard
vi.stubGlobal("navigator", {
  ...globalThis.navigator,
  language: "en-US",
  clipboard: {
    readText: vi.fn().mockResolvedValue(""),
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock window.location
const locationMock = new URL("http://localhost:5173");
vi.stubGlobal("location", locationMock);
