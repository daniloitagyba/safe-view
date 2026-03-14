import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { walletRoutes } from "./modules/wallet/wallet.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  app.register(authRoutes);
  app.register(walletRoutes, { prefix: "/api" });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
