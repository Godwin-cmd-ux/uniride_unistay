import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { config } from '../config';
import { ApiError, asyncHandler, ok } from '../lib/http';
import { requireAuth } from '../middleware/auth';

const router = Router();

const allowed = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadsDir),
  filename: (_req, file, cb) => {
    const ext = allowed.get(file.mimetype) ?? path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      cb(new ApiError(400, 'Only JPG, PNG or WEBP images are accepted', 'INVALID_FILE'));
      return;
    }
    cb(null, true);
  },
});

router.post(
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'Attach an image file', 'MISSING_FILE');
    // Relative URLs keep images portable between web, mobile and hostname changes.
    ok(res, { url: `/uploads/${req.file.filename}` }, 201);
  }),
);

export default router;
