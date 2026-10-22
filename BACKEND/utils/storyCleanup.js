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

const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
  return match ? match[1] : null;
};

export const cleanupExpiredStories = async () => {
  if (cleanupInProgress) return;
  cleanupInProgress = true;

  try {
    const expiredStories = await Story.find({
      expiresAt: { $lte: new Date() },
    })
      .select("_id image imagePublicId resourceType")
      .limit(100)
      .lean();

    for (const story of expiredStories) {
      const publicId = story.imagePublicId || extractPublicIdFromUrl(story.image);
      let mediaDestroyed = !publicId; // If no publicId could be resolved, proceed with document deletion

      if (publicId) {
        try {
          const res = await cloudinary.uploader.destroy(publicId, {
            resource_type: story.resourceType === "video" ? "video" : "image",
            invalidate: true,
          });
          if (res?.result === "ok" || res?.result === "not found") {
            mediaDestroyed = true;
          }
        } catch (destroyError) {
          if (destroyError?.http_code === 404 || destroyError?.message?.includes("not found")) {
            mediaDestroyed = true;
          } else {
            console.error(`Cloudinary deletion error for story ${story._id}:`, destroyError);
          }
        }
      }

      if (mediaDestroyed) {
        try {
          await Story.deleteOne({ _id: story._id });
        } catch (dbError) {
          console.error(`Unable to delete expired story record ${story._id}:`, dbError);
        }
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
