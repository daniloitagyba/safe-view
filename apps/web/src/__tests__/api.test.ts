import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock axios before importing api module
vi.mock("axios", () => {
  const interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  const instance = {
    interceptors,
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => instance),
    },
  };
});

describe("api service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("creates axios instance with base URL", async () => {
    const axios = (await import("axios")).default;

    // Re-import to trigger module
    vi.resetModules();
    await import("../services/api");

    expect(axios.create).toHaveBeenCalledWith({ baseURL: "/" });
  });

  it("registers request and response interceptors", async () => {
    vi.resetModules();
    const { api } = await import("../services/api");

    expect(api.interceptors.request.use).toHaveBeenCalledOnce();
    expect(api.interceptors.response.use).toHaveBeenCalledTimes(1);
  });
});
