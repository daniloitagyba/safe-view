import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

// Must hoist so the mock factory can reference it
const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = mockVerifyIdToken;
  },
}));

const app = buildApp();

const TEST_USER = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: "https://example.com/avatar.jpg",
  googleId: "google-sub-123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /auth/google", () => {
  it("authenticates with valid Google credential", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        sub: "google-sub-123",
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/avatar.jpg",
      }),
    });
    vi.mocked(prisma.user.upsert).mockResolvedValueOnce(TEST_USER);

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { credential: "valid-google-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe("test@example.com");
  });

  it("returns 401 when Google token verification fails", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { credential: "invalid-token" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe("Invalid Google token");
  });

  it("returns 401 when payload has no sub", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ email: "test@example.com" }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { credential: "token-no-sub" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 when payload has no email", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ sub: "123" }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { credential: "token-no-email" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 when payload is null", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => null,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { credential: "token-null-payload" },
    });

    expect(response.statusCode).toBe(401);
  });

});
