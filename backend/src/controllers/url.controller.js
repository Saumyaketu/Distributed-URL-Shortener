import { validationResult } from "express-validator";
import {
  createShortUrl,
  getUserUrls,
  deleteUserUrl,
  getUrlByShortCode,
  updateUserUrl,
} from "../services/url.service.js";
import { recordClick } from "../services/analytics.service.js";
import { getCachedUrl, cacheUrl } from "../services/cache.service.js";

export const createUrl = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const url = await createShortUrl(req.body.originalUrl, req.user.userId);

    res.status(201).json({
      success: true,
      message: "URL created successfully",
      data: {
        id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const redirectUrl = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    let cachedUrl = null;

    try {
      const rawCache = await getCachedUrl(shortCode);
      if (rawCache) {
        cachedUrl = JSON.parse(rawCache);
      }
    } catch (err) {
      console.error("Cache read failed:", err.message);
    }

    if (cachedUrl) {
      console.log(`CACHE HIT: ${shortCode}`);
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

    try {
      const dataToCache = JSON.stringify({
        urlId: url._id,
        originalUrl: url.originalUrl,
      });
      await cacheUrl(shortCode, dataToCache);
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
