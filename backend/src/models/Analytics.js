import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    urlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Url",
      required: true,
      index: true,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    referrer: {
      type: String,
      default: "Direct",
    },

    clickedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const Analytics = mongoose.model("Analytics", analyticsSchema);

export default Analytics;
