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

export const getAnalyticsByUrlId = async (urlId) => {
  const totalClicks = await Analytics.countDocuments({ urlId });
  const uniqueVisitors = await Analytics.distinct("ipAddress", { urlId });

  const topReferrers = await Analytics.aggregate([
    {
      $match: { urlId },
    },
    {
      $group: {
        _id: "$referrer",
        count: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        count: -1,
      },
    },
    {
      $limit: 5,
    },
  ]);

  const recentClicks = await Analytics.find({ urlId })
    .sort({ clickedAt: -1 })
    .limit(10);

  return {
    totalClicks,
    uniqueVisitors: uniqueVisitors.length,
    topReferrers,
    recentClicks,
  };
};
