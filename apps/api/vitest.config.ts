import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/__tests__/**",
        "src/server.ts",
        "src/config/env.ts",
        "src/lib/prisma.ts",
        "src/lib/logger.ts",
        "src/lib/redis.ts",
        "src/lib/sync-worker.ts",
      ],
    },
  },
});
