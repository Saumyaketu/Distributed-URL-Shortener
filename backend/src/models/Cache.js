import mongoose from "mongoose";

const cacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired docs
    },
  },
  {
    timestamps: true,
  },
);

const Cache = mongoose.model("Cache", cacheSchema);

export default Cache;
