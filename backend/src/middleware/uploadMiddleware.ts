import path from "node:path";
import { mkdirSync } from "node:fs";
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";

const imagesDirectory = path.resolve(process.cwd(), "public/images");
mkdirSync(imagesDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, imagesDirectory);
  },
  filename: (_req, file, callback) => {
    const safeBaseName = path
      .parse(file.originalname)
      .name
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 80);

    const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
    callback(null, `${Date.now()}-${safeBaseName}${extension}`);
  },
});

const imageMimePattern = /^image\//;

function imageFileFilter(_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void {
  if (imageMimePattern.test(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new Error("Only image file uploads are allowed."));
}

export const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
