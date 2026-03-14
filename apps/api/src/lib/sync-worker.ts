import { Queue, QueueEvents, Worker, type Job } from "bullmq";
import { redisOptions, getJson, setJson, del } from "./redis.js";
import { prisma } from "./prisma.js";
import {
  getEthBalance,
  getTokenBalances,
  getEthPrices,
  type CachedWalletData,
} from "./alchemy.js";

const QUEUE_NAME = "wallet-sync";

export const syncQueue = new Queue(QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

const queueEvents = new QueueEvents(QUEUE_NAME, { connection: redisOptions });

// ---------------------------------------------------------------------------
// Redis key helpers
// ---------------------------------------------------------------------------

export const KEYS = {
  walletData: (address: string) => `sv:wallet_data:${address}`,
  ethPrices: () => "sv:eth_prices",
  tokenMeta: (contract: string) => `sv:token_meta:${contract}`,
} as const;

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processSyncWallet(job: Job<{ address: string }>) {
  const { address } = job.data;
  job.log(`Syncing wallet ${address}`);

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

  await setJson(KEYS.walletData(address), walletData, 120);
  await setJson(KEYS.ethPrices(), ethPrices, 60);

  job.log(`Synced wallet ${address}: ETH=${ethBalanceWei}, tokens=${tokens.length}`);
  return walletData;
}

async function processSyncAll(job: Job) {
  const wallets = await prisma.wallet.findMany({
    select: { address: true },
    distinct: ["address"],
  });

  job.log(`Enqueueing sync for ${wallets.length} unique addresses`);

  for (const { address } of wallets) {
    await syncQueue.add("sync-wallet", { address }, {
      jobId: `sync-wallet-${address}`,
      priority: 10,
    });
  }

  return { synced: wallets.length };
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let worker: Worker | null = null;

export function initWorker() {
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "sync-wallet") return processSyncWallet(job);
      if (job.name === "sync-all") return processSyncAll(job);
      throw new Error(`Unknown job: ${job.name}`);
    },
    {
      connection: redisOptions,
      concurrency: 2,
      limiter: { max: 5, duration: 1000 },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.name} completed (${job.id})`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.name} failed: ${err.message}`);
  });

  // Schedule recurring sync-all every 2 minutes
  syncQueue.upsertJobScheduler(
    "sync-all-scheduler",
    { every: 120_000 },
    { name: "sync-all" }
  );

  console.log("[worker] Worker started");
  return worker;
}

export async function shutdownWorker() {
  if (worker) {
    await worker.close();
    console.log("[worker] Worker stopped");
  }
  await queueEvents.close();
  await syncQueue.close();
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export async function enqueueSyncWallet(
  address: string,
  priority = 10
): Promise<void> {
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

  const result = await job.waitUntilFinished(queueEvents, 15_000);
  return result as CachedWalletData;
}

export async function waitForSync(address: string, timeoutMs = 15_000): Promise<CachedWalletData | null> {
  // Check if data already exists
  const existing = await getJson<CachedWalletData>(KEYS.walletData(address));
  if (existing) return existing;

  // Enqueue and wait
  const job = await syncQueue.add("sync-wallet", { address }, {
    jobId: `sync-wallet-${address}-wait-${Date.now()}`,
    priority: 1,
  });

  const result = await job.waitUntilFinished(queueEvents, timeoutMs);
  return result as CachedWalletData;
}

export async function cleanupAddress(address: string): Promise<void> {
  const count = await prisma.wallet.count({ where: { address } });
  if (count === 0) {
    await del(KEYS.walletData(address));
  }
}
