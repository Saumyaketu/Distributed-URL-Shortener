import { getAnalyticsByUrlId } from "../services/analytics.service.js";
import { getUrlById } from "../services/url.service.js";

export const getAnalytics = async (req, res, next) => {
  try {
    const url = await getUrlById(req.params.urlId);

    if (!url) {
      return res.status(404).json({
        success: false,
        message: "URL not found",
      });
    }

    if (url.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
    
    const analytics = await getAnalyticsByUrlId(req.params.urlId);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};
