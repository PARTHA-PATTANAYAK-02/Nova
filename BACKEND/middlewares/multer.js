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

export const uploadPost = createSingleUpload(MAX_POST_UPLOAD_SIZE, "Post media (50 MB maximum)");
export const uploadStory = createSingleUpload(MAX_STORY_UPLOAD_SIZE, "Story media (20 MB maximum)");

const upload = multer({ storage: memoryStorage });
export default upload;
