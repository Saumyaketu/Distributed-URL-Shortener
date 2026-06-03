import { validationResult } from "express-validator";
import {
  createShortUrl,
  getUserUrls,
  deleteUserUrl,
} from "../services/url.service.js";
import { getCachedUrl, cacheUrl } from "../services/cache.service.js";
import Url from "../models/Url.js";

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
      cachedUrl = await getCachedUrl(shortCode);
    } catch (err) {
      console.error("Cache read failed:", err.message);
    }

    if (cachedUrl) {
      console.log("CACHE HIT");
      return res.redirect(cachedUrl);
    }

    console.log("CACHE MISS");

    const url = await Url.findOne({
      shortCode,
      isActive: true,
    });

    if (!url) {
      return res.status(404).json({
        success: false,
        message: "URL not found",
      });
    }

    try {
      await cacheUrl(shortCode, url.originalUrl);
    } catch (err) {
      console.error("Cache write failed:", err.message);
    }

    url.clickCount += 1;

    await url.save();

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
