export interface Url {
  _id: string;
  originalUrl: string;
  shortCode: string;
  isActive: boolean;
  customAlias?: string;
  expiresAt?: string;
  createdAt: string;
}
