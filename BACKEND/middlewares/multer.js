import multer from "multer";

const memoryStorage = multer.memoryStorage();
const MAX_POST_UPLOAD_SIZE = 50 * 1024 * 1024;
const MAX_STORY_UPLOAD_SIZE = 20 * 1024 * 1024;

const createSingleUpload = (maxFileSize, label) => {
  const handler = multer({
    storage: memoryStorage,
    limits: { fileSize: maxFileSize },
  }).single("image");

  return (req, res, next) => {
    handler(req, res, (error) => {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: `${label} is too large`,
        });
      }
      if (error) return next(error);
      return next();
    });
  };
};

const createMultiUpload = (maxFileSize, maxCount, label) => {
  const handler = multer({
    storage: memoryStorage,
    limits: { fileSize: maxFileSize },
  }).fields([
    { name: "media", maxCount },
    { name: "image", maxCount },
  ]);

  return (req, res, next) => {
    handler(req, res, (error) => {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: `${label} is too large`,
        });
      }
      if (error instanceof multer.MulterError && error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxCount} files allowed per post`,
        });
      }
      if (error) return next(error);

      // Prefer 'media' array if present; only fallback to 'image' if 'media' is absent
      const mediaArr = (req.files?.media && req.files.media.length > 0)
        ? req.files.media
        : (req.files?.image || []);
      req.mediaFiles = mediaArr;
      if (mediaArr.length > 0 && !req.file) {
        req.file = mediaArr[0];
      }
      return next();
    });
  };
};

export const uploadPost = createMultiUpload(MAX_POST_UPLOAD_SIZE, 5, "Post media (50 MB maximum)");
export const uploadStory = createSingleUpload(MAX_STORY_UPLOAD_SIZE, "Story media (20 MB maximum)");

const upload = multer({ storage: memoryStorage });
export default upload;
