import Url from "../models/Url.js";
import generateShortCode from "../utils/generateShortCode.js";
import { deleteCachedUrl } from "./cache.service.js";

export const createShortUrl = async (originalUrl, userId) => {
  let shortCode = generateShortCode();

  while (
    await Url.findOne({
      shortCode,
    })
  ) {
    shortCode = generateShortCode();
  }

  const url = await Url.create({
    originalUrl,
    shortCode,
    user: userId,
  });

  return url;
};

export const getUrlByShortCode = async (shortCode) => {
  const url = await Url.findOne({
    shortCode,
    isActive: true,
  });

  if (!url) {
    throw new Error("URL not found");
  }

  return url;
};

export const getUserUrls = async (userId) => {
  const urls = await Url.find({
    user: userId,
  }).sort({ createdAt: -1 });

  return urls;
};

export const getUrlById = async (urlId) => {
  return await Url.findById(urlId);
};

export const deleteUserUrl = async (urlId, userId) => {
  const url = await Url.findOne({
    _id: urlId,
    user: userId,
  });

  if (!url) {
    throw new Error("URL not found");
  }

  await deleteCachedUrl(url.shortCode);
  await url.deleteOne();

  return true;
};
