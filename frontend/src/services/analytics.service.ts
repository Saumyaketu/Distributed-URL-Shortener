import api from "../api/axios";

export const getUrlAnalytics = async (urlId: string) => {
  const response = await api.get(`/analytics/${urlId}`);
  return response.data.data;
};
