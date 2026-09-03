import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import { connectRedis, isRedisConnected } from "../config/redis.js";
import {
  replenishKeyPool,
  getKeyPoolLength,
  DEFAULT_BATCH_SIZE,
  DEFAULT_LOW_WATERMARK,
} from "../services/kgs.service.js";

const CHECK_INTERVAL_MS = parseInt(process.env.KGS_CHECK_INTERVAL_MS || "5000", 10);
const TARGET_WATERMARK = parseInt(
  process.env.KGS_LOW_WATERMARK || String(DEFAULT_LOW_WATERMARK),
  10,
);
const BATCH_SIZE = parseInt(
  process.env.KGS_BATCH_SIZE || String(DEFAULT_BATCH_SIZE),
  10,
);

let isRunning = true;
let checkTimer = null;

const runKgsCycle = async () => {
  if (!isRunning) return;

  try {
    if (isRedisConnected()) {
      const currentCount = await getKeyPoolLength();
      if (currentCount < TARGET_WATERMARK) {
        console.log(
          `[KGS Worker] Pool size (${currentCount}) < Watermark (${TARGET_WATERMARK}). Generating ${BATCH_SIZE} keys...`,
        );
        const result = await replenishKeyPool({
          lowWatermark: TARGET_WATERMARK,
          batchSize: BATCH_SIZE,
        });

        if (result.replenished) {
          console.log(
            `[KGS Worker] Generated ${result.generatedCount} keys. Total pool size: ${result.currentPoolSize}`,
          );
        }
      }
    } else {
      console.warn("[KGS Worker] Redis disconnected. Waiting for reconnection...");
    }
  } catch (error) {
    console.error("[KGS Worker] Cycle error:", error.message);
  } finally {
    if (isRunning) {
      checkTimer = setTimeout(runKgsCycle, CHECK_INTERVAL_MS);
    }
  }
};

const startWorker = async () => {
  console.log("==========================================");
  console.log("Starting Key Generation Service (KGS) Worker");
  console.log(`- Low Watermark: ${TARGET_WATERMARK}`);
  console.log(`- Batch Size:    ${BATCH_SIZE}`);
  console.log(`- Poll Interval: ${CHECK_INTERVAL_MS}ms`);
  console.log("==========================================");

  try {
    await connectDB();
    await connectRedis();

    // Run first cycle immediately
    await runKgsCycle();
  } catch (error) {
    console.error("[KGS Worker] Startup failed:", error.message);
    process.exit(1);
  }
};

const shutdown = () => {
  console.log("\n[KGS Worker] Shutting down gracefully...");
  isRunning = false;
  if (checkTimer) clearTimeout(checkTimer);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startWorker();
