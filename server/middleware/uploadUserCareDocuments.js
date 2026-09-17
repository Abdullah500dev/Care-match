import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads/user-care");

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
  ".pdf",
  ".doc",
  ".docx",
]);

const allowedMimePrefixes = ["image/"];
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (_, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  const okExt = allowedExtensions.has(ext);
  const okMime =
    allowedMimePrefixes.some((prefix) => mime.startsWith(prefix)) ||
    allowedMimeTypes.has(mime);

  if (okExt && okMime) {
    cb(null, true);
    return;
  }
  cb(
    new Error(
      "Only images (jpg, png, webp, gif) or documents (pdf, doc, docx) are allowed.",
    ),
    false,
  );
};

const uploadUserCareDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 6,
  },
});

export default uploadUserCareDocuments;
