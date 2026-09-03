import { validationResult } from "express-validator";
import {
  createShortUrl,
  getUserUrls,
  deleteUserUrl,
  getUrlByShortCode,
  updateUserUrl,
} from "../services/url.service.js";
import { recordClick } from "../services/analytics.service.js";
import {
  getCachedUrl,
  cacheUrl,
  deleteCachedUrl,
} from "../services/cache.service.js";
import { checkBloomFilter } from "../services/bloom.service.js";

export const createUrl = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { originalUrl, expiresAt } = req.body;
    const url = await createShortUrl(
      req.body.originalUrl,
      req.user.userId,
      expiresAt,
    );

    res.status(201).json({
      success: true,
      message: "URL created successfully",
      data: {
        id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
        expiresAt: url.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const redirectUrl = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    // Fast-path Bloom Filter Check (Cache Penetration / DDoS Defense)
    const mightExist = await checkBloomFilter(shortCode);
    if (!mightExist) {
      return res.status(404).json({
        success: false,
        message: "URL not found",
      });
    }

    let cachedUrl = null;

    try {
      const cached = await getCachedUrl(shortCode);
      if (cached) {
        cachedUrl = cached;
      }
    } catch (err) {
      console.error("Cache read failed:", err.message);
    }

    if (cachedUrl) {
      console.log(`CACHE HIT: ${shortCode}`);

      const isExpired =
        cachedUrl.isExpired ||
        (cachedUrl.expiresAt && new Date() > new Date(cachedUrl.expiresAt));

      if (isExpired) {
        // Ensure 24-hour negative tombstone is set so subsequent requests never hit MongoDB
        if (!cachedUrl.isExpired) {
          try {
            await cacheUrl(
              shortCode,
              { isExpired: true, expiresAt: cachedUrl.expiresAt },
              86400,
            );
          } catch (err) {
            console.error("Failed to update tombstone cache key:", err.message);
          }
        }

        const frontendUrl = process.env.CORS_ORIGIN;
        return res.redirect(`${frontendUrl}/expired`);
      }

      recordClick({
        urlId: cachedUrl.urlId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        referrer: req.headers.referer || "Direct",
      }).catch(console.error);

      return res.redirect(cachedUrl.originalUrl);
    }

    console.log(`CACHE MISS: ${shortCode}`);

    const url = await getUrlByShortCode(shortCode);

    if (!url) {
      return res.status(404).json({
        success: false,
        message: "URL not found",
      });
    }

    if (url.expiresAt && new Date() > new Date(url.expiresAt)) {
      // Negative Caching: Store a 24-hour Expired Tombstone in Redis
      try {
        await cacheUrl(
          shortCode,
          { isExpired: true, expiresAt: url.expiresAt },
          86400,
        );
      } catch (err) {
        console.error("Failed to cache expired tombstone:", err.message);
      }

      const frontendUrl = process.env.CORS_ORIGIN;
      return res.redirect(`${frontendUrl}/expired`);
    }

    try {
      const dataToCache = {
        urlId: url._id,
        originalUrl: url.originalUrl,
        expiresAt: url.expiresAt,
      };
      let ttlSeconds = null;
      if (url.expiresAt) {
        ttlSeconds = Math.floor(
          (new Date(url.expiresAt).getTime() - Date.now()) / 1000,
        );
      }

      await cacheUrl(shortCode, dataToCache, ttlSeconds);
    } catch (err) {
      console.error("Cache write failed:", err.message);
    }

    recordClick({
      urlId: url._id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      referrer: req.headers.referer || "Direct",
    }).catch(console.error);

    return res.redirect(url.originalUrl);
  } catch (error) {
    next(error);
  }
};

export const getUrls = async (req, res, next) => {
  try {
    const urls = await getUserUrls(req.user.userId);

    res.status(200).json({
      success: true,
      count: urls.length,
      data: urls,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUrl = async (req, res, next) => {
  try {
    await deleteUserUrl(req.params.id, req.user.userId);

    res.status(200).json({
      success: true,
      message: "URL deleted successfully",
    });
  } catch (error) {
    if (error.message === "URL not found") {
      return res.status(404).json({
        success: false,
        message: "URL not found",
      });
    }

    next(error);
  }
};

export const updateUrl = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const url = await updateUserUrl(
      req.params.id,
      req.user.userId,
      req.body.originalUrl,
    );

    res.status(200).json({
      success: true,
      message: "URL updated successfully",
      data: {
        id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
      },
    });
  } catch (error) {
    if (error.message === "URL not found") {
      return res.status(404).json({
        success: false,
        message: "URL not found",
      });
    }

    next(error);
  }
};
