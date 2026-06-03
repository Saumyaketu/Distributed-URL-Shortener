import Url from "../models/Url.js";
import generateShortCode from "../utils/generateShortCode.js";

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
