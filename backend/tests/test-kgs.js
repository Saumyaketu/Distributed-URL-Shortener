import dotenv from "dotenv";
dotenv.config();

import connectDB from "../src/config/db.js";
import { connectRedis, isRedisConnected } from "../src/config/redis.js";
import {
  allocateRangeBlock,
  generateKeysForRange,
  replenishKeyPool,
  getKeyPoolLength,
} from "../src/services/kgs.service.js";
import {
  initTokenBuffer,
  acquireKey,
  getTokenBufferStats,
} from "../src/services/tokenBuffer.service.js";
import mongoose from "mongoose";

const runSuite = async () => {
  console.log("\n========================================================");
  console.log("  DISTRIBUTED URL SHORTENER - KGS & BUFFER TEST SUITE");
  console.log("========================================================\n");

  let passedTests = 0;
  let totalTests = 5;

  try {
    // Connect Infrastructure
    console.log("Connecting to MongoDB and Redis...");
    await connectDB();
    await connectRedis();

    console.log(`- MongoDB Connected: ✅`);
    console.log(`- Redis Connected:   ${isRedisConnected() ? "✅" : "⚠️ (Offline Fallback Mode)"}\n`);

    // TEST 1: Base-62 Range Generation & Uniqueness
    console.log("--------------------------------------------------------");
    console.log("Test 1: Base-62 Range Generation & 100% Uniqueness");
    console.log("--------------------------------------------------------");
    const count = 2000;
    const generatedKeys = generateKeysForRange(1, count);
    const uniqueSet = new Set(generatedKeys);

    if (generatedKeys.length === count && uniqueSet.size === count) {
      console.log(`✅ PASSED: Generated ${count} keys with 0 collisions.`);
      console.log(`   Sample Short Codes: [${generatedKeys.slice(0, 5).join(", ")}...]`);
      passedTests++;
    } else {
      console.error(`❌ FAILED: Key collision detected! Total: ${generatedKeys.length}, Unique: ${uniqueSet.size}`);
    }

    // TEST 2: Range Block Allocation (No Overlap)
    console.log("\n--------------------------------------------------------");
    console.log("Test 2: Atomic Range Block Allocation (No ID Overlap)");
    console.log("--------------------------------------------------------");
    const blockSize = 100;
    const block1 = await allocateRangeBlock(blockSize);
    const block2 = await allocateRangeBlock(blockSize);

    const isBlock1Valid = block1.endId - block1.startId + 1 === blockSize;
    const isBlock2Valid = block2.endId - block2.startId + 1 === blockSize;
    const isNonOverlapping = block2.startId > block1.endId;

    if (isBlock1Valid && isBlock2Valid && isNonOverlapping) {
      console.log(`✅ PASSED: Atomic Range Allocation with 0 overlap.`);
      console.log(`   Block 1: [${block1.startId} - ${block1.endId}] (Span: ${block1.endId - block1.startId + 1})`);
      console.log(`   Block 2: [${block2.startId} - ${block2.endId}] (Span: ${block2.endId - block2.startId + 1})`);
      passedTests++;
    } else {
      console.error(`❌ FAILED: Overlapping or invalid range blocks. Block 1:`, block1, `Block 2:`, block2);
    }

    // TEST 3: Redis Key Pool Replenishment
    console.log("\n--------------------------------------------------------");
    console.log("Test 3: Redis Centralized Key Pool Replenishment");
    console.log("--------------------------------------------------------");
    if (isRedisConnected()) {
      const poolBefore = await getKeyPoolLength();
      console.log(`   Pool Size Before: ${poolBefore}`);

      await replenishKeyPool({ lowWatermark: 5000, batchSize: 3000 });
      const poolAfter = await getKeyPoolLength();
      console.log(`   Pool Size After:  ${poolAfter}`);

      if (poolAfter >= poolBefore) {
        console.log(`✅ PASSED: Centralized Redis key pool active and verified (${poolAfter} keys ready).`);
        passedTests++;
      } else {
        console.error(`❌ FAILED: Key pool size decreased unexpectedly.`);
      }
    } else {
      console.log(`⚠️ SKIPPED Test 3: Redis is offline (MongoDB fallback active).`);
      totalTests--;
    }

    // TEST 4: TokenBuffer Initialization & Sub-Millisecond RAM Retrieval
    console.log("\n--------------------------------------------------------");
    console.log("Test 4: In-Memory Token Buffer & 0ms Fast Path");
    console.log("--------------------------------------------------------");
    await initTokenBuffer();
    const stats = getTokenBufferStats();
    console.log(`   Local In-Memory Buffer Count: ${stats.bufferedCount}`);

    const tStart = performance.now();
    const shortCode = await acquireKey();
    const tEnd = performance.now();
    const latencyMs = (tEnd - tStart).toFixed(3);

    if (shortCode && shortCode.length >= 7) {
      console.log(`✅ PASSED: Acquired short code "${shortCode}" in ${latencyMs}ms from memory RAM.`);
      passedTests++;
    } else {
      console.error(`❌ FAILED: Invalid short code acquired: ${shortCode}`);
    }

    // TEST 5: High Concurrency Burst (300 Parallel Requests)
    console.log("\n--------------------------------------------------------");
    console.log("Test 5: High-Concurrency Burst (300 Simultaneous Requests)");
    console.log("--------------------------------------------------------");
    const burstSize = 300;
    const burstStart = performance.now();
    const burstKeys = await Promise.all(
      Array.from({ length: burstSize }, () => acquireKey())
    );
    const burstEnd = performance.now();
    const burstDurationMs = (burstEnd - burstStart).toFixed(2);
    const burstUniqueSet = new Set(burstKeys);

    if (burstUniqueSet.size === burstSize) {
      const throughput = ((burstSize / (burstDurationMs / 1000))).toFixed(0);
      console.log(`✅ PASSED: 300/300 keys acquired with 100% uniqueness (0 duplicates).`);
      console.log(`   Completed in ${burstDurationMs}ms (~${throughput} ops/sec).`);
      passedTests++;
    } else {
      console.error(`❌ FAILED: Concurrency race condition detected! Unique: ${burstUniqueSet.size}/${burstSize}`);
    }

    // SUMMARY
    console.log("\n========================================================");
    console.log(`  TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed`);
    console.log("========================================================\n");

  } catch (err) {
    console.error("\n❌ Unexpected Suite Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
};

runSuite();
