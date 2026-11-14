import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { ApiError } from "@/lib/apiError";

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // iPhones default to HEIC/HEIF for camera photos.
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadRecipeMedia = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB, generous enough for short recipe videos
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      // Must be an ApiError (not a plain Error) so the central error handler
      // reports a 400 with this message instead of a generic 500 - and so a
      // rejection partway through a multi-file batch still surfaces clearly.
      cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`, "UNSUPPORTED_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(ApiError.badRequest("Avatar must be an image", "UNSUPPORTED_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});
