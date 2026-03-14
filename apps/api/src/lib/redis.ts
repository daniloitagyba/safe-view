import Redis from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
});

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error(`Corrupted JSON in Redis key: ${key}`);
    await redis.del(key);
    return null;
  }
}

export async function setJson<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
}

export async function del(key: string): Promise<void> {
  await redis.del(key);
}
