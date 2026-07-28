import api from "../api/axios";

export const createUrl = async (
  originalUrl: string,
  expiresAt?: string,
  customAlias?: string,
) => {
  const response = await api.post("/urls", {
    originalUrl,
    expiresAt,
    customAlias,
  });
  return response.data;
};

export const getUserUrls = async () => {
  const response = await api.get("/urls");
  return response.data;
};

export const deleteUrl = async (id: string) => {
  const response = await api.delete(`/urls/${id}`);
  return response.data;
};
