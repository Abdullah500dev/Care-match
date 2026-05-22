import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads/facilities");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, uploadDir);
  },
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".svg",
]);

const fileFilter = (_, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const isImageMime = file.mimetype?.startsWith("image/");
  const isImageExt = allowedExtensions.has(ext);

  if (isImageMime && isImageExt) {
    cb(null, true);
    return;
  }
  cb(new Error("Only image files are allowed (jpg, jpeg, png, webp, gif, bmp, svg)."), false);
};

const uploadFacilityImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8,
  },
});

export default uploadFacilityImages;
