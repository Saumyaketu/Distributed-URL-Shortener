import Analytics from "../models/Analytics.js";
import { UAParser } from "ua-parser-js";
import mongoose from "mongoose";

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

export const getAnalyticsByUrlId = async (urlId) => {
  const urlObjectId = new mongoose.Types.ObjectId(urlId);

  const totalClicks = await Analytics.countDocuments({ urlId: urlObjectId });
  const uniqueVisitors = await Analytics.distinct("ipAddress", {
    urlId: urlObjectId,
  });

  const dailyClicks = await Analytics.aggregate([
    { $match: { urlId: urlObjectId } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$clickedAt" },
        },
        clicks: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", clicks: 1 } },
  ]);

  const topReferrers = await Analytics.aggregate([
    { $match: { urlId: urlObjectId } },
    {
      $group: {
        _id: "$referrer",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, source: "$_id", count: 1 } },
  ]);

  const clicks = await Analytics.find({ urlId: urlObjectId }).select(
    "userAgent",
  );
  const devices = {
    Desktop: 0,
    Mobile: 0,
    Tablet: 0,
  };

  clicks.forEach((click) => {
    if (click.userAgent) {
      const parser = new UAParser(click.userAgent);
      const type = parser.getDevice().type;

      if (type === "mobile") {
        devices.Mobile++;
      } else if (type === "tablet") {
        devices.Tablet++;
      } else {
        devices.Desktop++;
      }
    } else {
      devices.Desktop++;
    }
  });

  const deviceBreakdown = Object.entries(devices).map(([device, count]) => ({
    device,
    count,
  }));

  const recentClicks = await Analytics.find({ urlId: urlObjectId })
    .sort({ clickedAt: -1 })
    .limit(10);

  return {
    totalClicks,
    uniqueVisitors: uniqueVisitors.length,
    dailyClicks,
    topReferrers,
    deviceBreakdown,
    recentClicks,
  };
};
