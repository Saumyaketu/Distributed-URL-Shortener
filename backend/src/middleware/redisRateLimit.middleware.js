import { getRedisClient, isRedisConnected } from "../config/redis.js";

// In-memory fallback rate limiter for when Redis is offline
const memoryStore = new Map();

// Periodic cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of memoryStore.entries()) {
    if (data.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

const handleRateLimitInMemory = (key, windowInSeconds, maxRequests, res, next) => {
  try {
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry || entry.expiresAt < now) {
      memoryStore.set(key, { count: 1, expiresAt: now + windowInSeconds * 1000 });
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      return next();
    }

    if (entry.count >= maxRequests) {
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      return res.status(429).json({
        success: false,
        message: "Too many requests.",
        remainingRequests: 0,
      });
    }

    entry.count += 1;
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - entry.count);
    return next();
  } catch (err) {
    console.error("In-memory rate limiter error:", err.message);
    next();
  }
};

export const createRateLimiter = ({ windowInSeconds, maxRequests, prefix }) => {
  return async (req, res, next) => {
    try {
      const ip = req.ip;
      const key = `rate_limit:${prefix}:${ip}`;

      if (isRedisConnected()) {
        try {
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
          return next();
        } catch (redisError) {
          console.warn(`Redis rate limiter failed. Falling back to in-memory store:`, redisError.message);
          return handleRateLimitInMemory(key, windowInSeconds, maxRequests, res, next);
        }
      } else {
        return handleRateLimitInMemory(key, windowInSeconds, maxRequests, res, next);
      }
    } catch (error) {
      console.error("Rate limiter error:", error.message);
      next();
    }
  };
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
