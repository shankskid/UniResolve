const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { ANONYMOUS_SUBMISSION } = require("@uniresolve/shared");

const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

function fileFilter(_req, file, cb) {
  if (!ANONYMOUS_SUBMISSION.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error("Unsupported file type."));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: ANONYMOUS_SUBMISSION.MAX_ATTACHMENT_BYTES
  }
});

module.exports = upload;
