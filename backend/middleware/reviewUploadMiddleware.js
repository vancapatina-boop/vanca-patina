const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { hasCloudinary } = require("../config/cloudinary");

const uploadDir = path.join(__dirname, "../uploads/reviews");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

const allowedImageTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const fileFilter = (_req, file, cb) => {
  if (file.fieldname === "images" && allowedImageTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  if (file.fieldname === "video" && allowedVideoTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  const err = new Error("Review uploads support JPG, PNG, WebP images and MP4, WebM, MOV videos only.");
  err.statusCode = 400;
  return cb(err);
};

const reviewUpload = multer({
  storage: hasCloudinary ? multer.memoryStorage() : diskStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 6,
  },
  fileFilter,
});

module.exports = reviewUpload;
