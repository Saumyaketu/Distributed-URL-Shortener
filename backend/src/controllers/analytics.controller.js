import { getAnalyticsByUrlId } from "../services/analytics.service.js";

export const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await getAnalyticsByUrlId(req.params.urlId);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};
