import Analytics from "../models/Analytics.js";

export const recordClick = async ({
  urlId,
  ipAddress,
  userAgent,
  referrer,
}) => {
  try {
    await Analytics.create({
      urlId,
      ipAddress,
      userAgent,
      referrer,
    });
  } catch (error) {
    console.error("Failed to record analytics:", error.message);
  }
};
