import { getRedisClient, isRedisConnected } from "../config/redis.js";
import Cache from "../models/Cache.js";

export const createRateLimiter = ({ windowInSeconds, maxRequests, prefix }) => {
  return async (req, res, next) => {
    try {
      const ip = req.ip;
      const key = `rate_limit:${prefix}:${ip}`;

      if (isRedisConnected()) {
        try {
          // Try Redis first
          const client = getRedisClient();
          const current = await client.get(key);

          if (!current) {
            await client.set(key, 1, {
              EX: windowInSeconds,
            });
            res.setHeader("X-RateLimit-Limit", maxRequests);
            res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
            return next();
          }

          const count = Number(current);

          if (count >= maxRequests) {
            res.setHeader("X-RateLimit-Limit", maxRequests);
            res.setHeader("X-RateLimit-Remaining", 0);
            return res.status(429).json({
              success: false,
              message: "Too many requests.",
              remainingRequests: 0,
            });
          }

          await client.incr(key);
          res.setHeader("X-RateLimit-Limit", maxRequests);
          res.setHeader("X-RateLimit-Remaining", maxRequests - (count + 1));
          next();
        } catch (redisError) {
          // Real-time Redis failure detection - fall back to MongoDB
          console.warn(`Redis rate limiter failed. Falling back to MongoDB:`, redisError.message);
          await handleRateLimitWithMongoDB(key, windowInSeconds, maxRequests, res, next);
        }
      } else {
        // Redis not connected at startup - use MongoDB
        await handleRateLimitWithMongoDB(key, windowInSeconds, maxRequests, res, next);
      }
    } catch (error) {
      console.error("Rate limiter error:", error.message);
      next();
    }
  };
};

const handleRateLimitWithMongoDB = async (key, windowInSeconds, maxRequests, res, next) => {
  try {
    const expiresAt = new Date(Date.now() + windowInSeconds * 1000);
    
    const cacheDoc = await Cache.findOne({ key });

    if (!cacheDoc) {
      await Cache.create({ key, value: 1, expiresAt });
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      return next();
    }

    const count = Number(cacheDoc.value);

    if (count >= maxRequests) {
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      return res.status(429).json({
        success: false,
        message: "Too many requests.",
        remainingRequests: 0,
      });
    }

    await Cache.findOneAndUpdate(
      { key },
      { value: count + 1, expiresAt },
      { returnDocument: "after" }
    );

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - (count + 1));
    next();
  } catch (mongoError) {
    console.error("MongoDB rate limiter fallback failed:", mongoError.message);
    // If MongoDB also fails, allow the request through (fail open)
    next();
  }
};

export const authLimiter = createRateLimiter({
  prefix: "auth",
  windowInSeconds: 15 * 60,
  maxRequests: 10,
});

export const createUrlLimiter = createRateLimiter({
  prefix: "url",
  windowInSeconds: 60 * 60,
  maxRequests: 100,
});
