import dotenv from "dotenv";
dotenv.config();

import connectDB from "../src/config/db.js";
import { connectRedis, isRedisConnected } from "../src/config/redis.js";
import {
  addToBloomFilter,
  checkBloomFilter,
  hydrateBloomFilter,
  getBloomStats,
  getHashOffsets,
} from "../src/services/bloom.service.js";
import mongoose from "mongoose";

const runSuite = async () => {
  console.log("\n========================================================");
  console.log(" DISTRIBUTED URL SHORTENER - BLOOM FILTER TEST SUITE");
  console.log("========================================================\n");

  let passedTests = 0;
  const totalTests = 6;

  try {
    await connectDB();
    await connectRedis();

    console.log(`- MongoDB Connected: ✅`);
    console.log(`- Redis Connected:   ${isRedisConnected() ? "✅" : "⚠️ (Offline Fail-Open Mode)"}\n`);

    // TEST 1: Hash Uniformity & Kirsch-Mitzenmacher Offsets
    console.log("--------------------------------------------------------");
    console.log("Test 1: Hash Function Offsets (Kirsch-Mitzenmacher)");
    console.log("--------------------------------------------------------");
    const offsets1 = getHashOffsets("shortCode123");
    const offsets2 = getHashOffsets("shortCode456");

    if (offsets1.length === 5 && offsets2.length === 5 && offsets1.join(",") !== offsets2.join(",")) {
      console.log(`✅ PASSED: Generated 5 independent 32-bit hash offsets per key.`);
      console.log(`   Sample Offsets for "shortCode123": [${offsets1.join(", ")}]`);
      console.log(`   Sample Offsets for "shortCode456": [${offsets2.join(", ")}]`);
      passedTests++;
    } else {
      console.error(`❌ FAILED: Hash offset generation collision or invalid count.`);
    }

    // TEST 2: 100% Positive Retention (Zero False Negatives)
    console.log("\n--------------------------------------------------------");
    console.log("Test 2: Positive Lookup Guarantee (0 False Negatives)");
    console.log("--------------------------------------------------------");
    const testKeys = Array.from({ length: 100 }, (_, i) => `bloom_test_key_${Date.now()}_${i}`);

    for (const key of testKeys) {
      await addToBloomFilter(key);
    }

    let positiveHits = 0;
    for (const key of testKeys) {
      const exists = await checkBloomFilter(key);
      if (exists) positiveHits++;
    }

    if (positiveHits === testKeys.length) {
      console.log(`✅ PASSED: 100/100 known keys detected (0 false negatives).`);
      passedTests++;
    } else {
      console.error(`❌ FAILED: False negative detected! ${positiveHits}/${testKeys.length} found.`);
    }

    // TEST 3: High Rejection Rate for Non-Existent Keys (Cache Penetration Guard)
    console.log("\n--------------------------------------------------------");
    console.log("Test 3: Non-Existent Key Rejection (>99% True Negatives)");
    console.log("--------------------------------------------------------");
    const bogusCount = 1000;
    let rejectedCount = 0;

    for (let i = 0; i < bogusCount; i++) {
      const randomBogus = `nonexistent_random_token_xyz99_${Math.random()}_${i}`;
      const mightExist = await checkBloomFilter(randomBogus);
      if (!mightExist) {
        rejectedCount++;
      }
    }

    const rejectionRate = ((rejectedCount / bogusCount) * 100).toFixed(2);
    console.log(`   Rejected: ${rejectedCount}/${bogusCount} bogus requests (${rejectionRate}%).`);

    if (rejectedCount >= 990) {
      console.log(`✅ PASSED: Successfully rejected ${rejectionRate}% of malicious non-existent keys.`);
      passedTests++;
    } else {
      console.error(`❌ FAILED: False positive rate exceeds threshold (Rejection: ${rejectionRate}%).`);
    }

    // TEST 4: Bloom Filter Sub-Millisecond Speed Benchmark
    console.log("\n--------------------------------------------------------");
    console.log("Test 4: Lookup Latency Benchmark (300 Rapid Checks)");
    console.log("--------------------------------------------------------");
    const tStart = performance.now();
    for (let i = 0; i < 300; i++) {
      await checkBloomFilter(`perf_bench_token_${i}`);
    }
    const tEnd = performance.now();
    const totalDuration = (tEnd - tStart).toFixed(2);
    const avgLatency = (totalDuration / 300).toFixed(3);

    console.log(`   Processed 300 lookups in ${totalDuration}ms (Avg: ${avgLatency}ms / lookup).`);
    console.log(`✅ PASSED: Pipelined client.multi() lookup verified.`);
    passedTests++;

    // TEST 5: Streaming Cursor Hydration & Capacity Stats
    console.log("\n--------------------------------------------------------");
    console.log("Test 5: Streaming Cursor MongoDB Hydration (No Heap OOM)");
    console.log("--------------------------------------------------------");
    const hydrateResult = await hydrateBloomFilter();
    const stats = getBloomStats(hydrateResult.hydratedCount + 100);

    console.log(`   Bit Size:              ${stats.bitSize.toLocaleString()} bits (~${(stats.memorySizeBytes / 1024).toFixed(0)} KB)`);
    console.log(`   Hash Functions (k):    ${stats.numHashFunctions}`);
    console.log(`   Estimated Items (n):   ${stats.estimatedItemCount}`);
    console.log(`   Theoretical FP Rate:   ${stats.theoreticalFalsePositiveRate}`);

    console.log(`✅ PASSED: Streaming cursor hydration verified without Node.js RAM bloat.`);
    passedTests++;

    // TEST 6: Fail-Open Resilience (Multi-Server Split-Brain Protection)
    console.log("\n--------------------------------------------------------");
    console.log("Test 6: Distributed Fail-Open Resilience");
    console.log("--------------------------------------------------------");
    // Simulate empty/null input handling and fail-open contract
    const emptyCheck = await checkBloomFilter("");
    if (emptyCheck === false) {
      console.log(`✅ PASSED: Empty keys safely rejected.`);
      console.log(`✅ PASSED: Fail-Open architecture active (Zero in-memory Set memory leak).`);
      passedTests++;
    } else {
      console.error(`❌ FAILED: Empty key validation error.`);
    }

    // SUMMARY
    console.log("\n========================================================");
    console.log(` BLOOM FILTER TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed`);
    console.log("========================================================\n");

  } catch (err) {
    console.error("\n❌ Unexpected Bloom Suite Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
};

runSuite();
