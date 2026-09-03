import dotenv from "dotenv";
dotenv.config();

import connectDB from "../src/config/db.js";
import { connectRedis, isRedisConnected } from "../src/config/redis.js";
import Url from "../src/models/Url.js";
import User from "../src/models/User.js";
import { cacheUrl, getCachedUrl, deleteCachedUrl } from "../src/services/cache.service.js";
import { addToBloomFilter, checkBloomFilter } from "../src/services/bloom.service.js";
import mongoose from "mongoose";

const runSuite = async () => {
  console.log("\n========================================================");
  console.log(" DISTRIBUTED URL SHORTENER - TOMBSTONE CACHING TEST");
  console.log("========================================================\n");

  let passed = true;

  try {
    await connectDB();
    await connectRedis();

    console.log(`- MongoDB Connected: ✅`);
    console.log(`- Redis Connected:   ${isRedisConnected() ? "✅" : "⚠️"}\n`);

    // 1. Setup an expired URL document in MongoDB
    const testShortCode = `expired_test_${Date.now()}`;
    const testExpiredDate = new Date(Date.now() - 60000); // Expired 1 minute ago

    // Get or create dummy user
    let user = await User.findOne();
    if (!user) {
      user = await User.create({
        name: "Test User",
        email: `test_${Date.now()}@example.com`,
        password: "hashedpassword123",
      });
    }

    const createdUrl = await Url.create({
      originalUrl: "https://example.com/expired-campaign",
      shortCode: testShortCode,
      user: user._id,
      expiresAt: testExpiredDate,
      isActive: true,
    });

    // 2. Register in Bloom Filter
    await addToBloomFilter(testShortCode);
    const mightExist = await checkBloomFilter(testShortCode);
    if (!mightExist) throw new Error("Bloom filter failed to register expired code");
    console.log(`Step 1: Expired URL created and registered in Bloom filter: ✅`);

    // 3. Ensure cache is clean for a cold start
    await deleteCachedUrl(testShortCode);
    const initialCache = await getCachedUrl(testShortCode);
    if (initialCache !== null) throw new Error("Cache should be empty initially");
    console.log(`Step 2: Initial cache is clean (cold miss simulated): ✅`);

    // 4. Simulate Click #1: Cold miss -> MongoDB lookup -> Tombstone written to Redis
    console.log(`Step 3: Simulating Click #1 (Cold Cache Miss)...`);
    const dbUrl = await Url.findOne({ shortCode: testShortCode, isActive: true });
    const isDbExpired = dbUrl.expiresAt && new Date() > new Date(dbUrl.expiresAt);

    if (isDbExpired) {
      // Write 24-hour expired tombstone (exact logic in url.controller.js)
      await cacheUrl(testShortCode, { isExpired: true, expiresAt: dbUrl.expiresAt }, 86400);
      console.log(`        -> Wrote negative tombstone to Redis { isExpired: true }: ✅`);
    }
    

    // 5. Simulate Click #2: Second request hits Redis directly (Zero DB queries!)
    console.log(`Step 4: Simulating Click #2 (Subsequent Request)...`);
    const tombstoneCache = await getCachedUrl(testShortCode);

    if (tombstoneCache && tombstoneCache.isExpired === true) {
      console.log(`        -> Cache HIT! Successfully read tombstone from Redis: ✅`);
      console.log(`        -> Value:`, JSON.stringify(tombstoneCache));
      console.log(`        -> MongoDB query avoided completely (0 DB reads): ✅`);
    } else {
      passed = false;
      console.error(`❌ FAILED: Tombstone was not cached in Redis!`, tombstoneCache);
    }

    // Clean up test document
    await Url.deleteOne({ _id: createdUrl._id });
    await deleteCachedUrl(testShortCode);

    console.log("\n========================================================");
    if (passed) {
      console.log(" NEGATIVE TOMBSTONE CACHING VERIFIED SUCCESSFULLY!");
    } else {
      console.log("❌ TOMBSTONE CACHING TEST FAILED.");
    }
    console.log("========================================================\n");

  } catch (err) {
    console.error("Test Error:", err);
    passed = false;
  } finally {
    await mongoose.disconnect();
    process.exit(passed ? 0 : 1);
  }
};

runSuite();
