import { Queue, QueueEvents, Worker, type Job } from "bullmq";
import { redisOptions, getJson, setJson, del } from "./redis.js";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";
import {
  getEthBalance,
  getTokenBalances,
  getEthPrices,
  type CachedWalletData,
} from "./alchemy.js";

const QUEUE_NAME = "wallet-sync";
const SYNC_INTERVAL_MS = 120_000;
const WALLET_DATA_TTL = 120;
const ETH_PRICES_TTL = 60;
const SYNC_TIMEOUT_MS = 15_000;

export const KEYS = {
  walletData: (address: string) => `sv:wallet_data:${address}`,
  ethPrices: () => "sv:eth_prices",
} as const;

const syncQueue = new Queue(QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

const queueEvents = new QueueEvents(QUEUE_NAME, { connection: redisOptions });

let worker: Worker | null = null;

async function processSyncWallet(job: Job<{ address: string }>) {
  const { address } = job.data;

  const [ethBalanceWei, tokens, ethPrices] = await Promise.all([
    getEthBalance(address),
    getTokenBalances(address),
    getEthPrices(),
  ]);

  const walletData: CachedWalletData = {
    ethBalanceWei,
    tokens,
    ethPrices,
    syncedAt: Date.now(),
  };

  await setJson(KEYS.walletData(address), walletData, WALLET_DATA_TTL);
  await setJson(KEYS.ethPrices(), ethPrices, ETH_PRICES_TTL);

  return walletData;
}

async function processSyncAll() {
  const wallets = await prisma.wallet.findMany({
    select: { address: true },
    distinct: ["address"],
  });

  for (const { address } of wallets) {
    await syncQueue.add("sync-wallet", { address }, {
      jobId: `sync-wallet-${address}`,
      priority: 10,
    });
  }

  return { synced: wallets.length };
}

export function initWorker() {
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "sync-wallet") return processSyncWallet(job);
      if (job.name === "sync-all") return processSyncAll();
      throw new Error(`Unknown job: ${job.name}`);
    },
    {
      connection: redisOptions,
      concurrency: 2,
      limiter: { max: 5, duration: 1000 },
    }
  );

  worker.on("completed", (job) => {
    logger.info({ job: job.name, id: job.id }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ job: job?.name, err: err.message }, "Job failed");
  });

  syncQueue.upsertJobScheduler(
    "sync-all-scheduler",
    { every: SYNC_INTERVAL_MS },
    { name: "sync-all" }
  );

  logger.info("Worker started");
  return worker;
}

export async function shutdownWorker() {
  if (worker) {
    await worker.close();
    logger.info("Worker stopped");
  }
  await queueEvents.close();
  await syncQueue.close();
}

export async function enqueueSyncWallet(address: string, priority = 10): Promise<void> {
  await syncQueue.add("sync-wallet", { address }, {
    jobId: `sync-wallet-${address}-${Date.now()}`,
    priority,
  });
}

export async function invalidateAndSync(address: string): Promise<CachedWalletData> {
  await del(KEYS.walletData(address));

  const job = await syncQueue.add("sync-wallet", { address }, {
    jobId: `sync-wallet-${address}-priority-${Date.now()}`,
    priority: 1,
  });

  return await job.waitUntilFinished(queueEvents, SYNC_TIMEOUT_MS) as CachedWalletData;
}

export async function waitForSync(address: string, timeoutMs = SYNC_TIMEOUT_MS): Promise<CachedWalletData | null> {
  const existing = await getJson<CachedWalletData>(KEYS.walletData(address));
  if (existing) return existing;

  const job = await syncQueue.add("sync-wallet", { address }, {
    jobId: `sync-wallet-${address}-wait-${Date.now()}`,
    priority: 1,
  });

  return await job.waitUntilFinished(queueEvents, timeoutMs) as CachedWalletData;
}

export async function cleanupAddress(address: string): Promise<void> {
  const count = await prisma.wallet.count({ where: { address } });
  if (count === 0) {
    await del(KEYS.walletData(address));
  }
}
