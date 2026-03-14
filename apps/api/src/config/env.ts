import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ALCHEMY_API_KEY: z.string(),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().default(3003),
});

export const env = envSchema.parse(process.env);

export const isDev = env.NODE_ENV === "development";
