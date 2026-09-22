import cloudinary from "./cloudinary.js";
import { Story } from "../models/story.model.js";

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
let cleanupInProgress = false;
let cleanupTimer;

// The first story version used a MongoDB TTL index. MongoDB preserves indexes
// after a schema change, so remove that old index once before cleanup starts;
// otherwise it could delete the record before its Cloudinary public id is read.
export const removeLegacyStoryTtlIndex = async () => {
  try {
    const indexes = await Story.collection.indexes();
    const legacyTtlIndex = indexes.find(
      (index) => index.name === "expiresAt_1" && index.expireAfterSeconds !== undefined,
    );
    if (legacyTtlIndex) {
      await Story.collection.dropIndex(legacyTtlIndex.name);
      console.log("Removed legacy story TTL index.");
    }
  } catch (error) {
    // A fresh database has no Story collection/index yet, which is expected.
    if (error.code !== 26) console.error("Unable to check story TTL index:", error);
  }
};

export const cleanupExpiredStories = async () => {
  if (cleanupInProgress) return;
  cleanupInProgress = true;

  try {
    const expiredStories = await Story.find({
      expiresAt: { $lte: new Date() },
    })
      .select("_id imagePublicId")
      .lean();

    for (const story of expiredStories) {
      try {
        // Older story records may not have a public id. Their database record
        // can still be safely removed, but new uploads always have one.
        if (story.imagePublicId) {
          await cloudinary.uploader.destroy(story.imagePublicId, {
            resource_type: "image",
            invalidate: true,
          });
        }
        await Story.deleteOne({ _id: story._id });
      } catch (error) {
        // Keep the record when Cloudinary fails, so the next run retries it.
        console.error(`Unable to clean up expired story ${story._id}:`, error);
      }
    }
  } catch (error) {
    console.error("Story cleanup error:", error);
  } finally {
    cleanupInProgress = false;
  }
};

export const startStoryCleanup = () => {
  if (cleanupTimer) return;
  cleanupExpiredStories();
  cleanupTimer = setInterval(cleanupExpiredStories, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
};
