import multer from 'multer';
import { AppError } from '../../../application/errors/AppError.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hasExpectedSignature(file) {
  const { buffer, mimetype } = file;
  if (mimetype === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return buffer.length >= 8
      && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimetype === 'image/webp') {
    return buffer.length >= 12
      && buffer.toString('ascii', 0, 4) === 'RIFF'
      && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 100 * 1024 },
  fileFilter(_req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      callback(AppError.badRequest('Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP'));
      return;
    }
    callback(null, true);
  },
}).single('image');

export function uploadProductImage(req, res, next) {
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      next(AppError.badRequest('Ảnh không hợp lệ hoặc vượt quá giới hạn 5 MB'));
      return;
    }
    if (error) {
      next(error);
      return;
    }
    if (req.file && !hasExpectedSignature(req.file)) {
      next(AppError.badRequest('Nội dung ảnh không khớp với định dạng tệp'));
      return;
    }
    next();
  });
}
