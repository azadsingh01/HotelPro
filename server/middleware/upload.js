import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import ApiError from '../utils/ApiError.js';

export const uploadDirectory = fileURLToPath(new URL('../uploads/', import.meta.url));
mkdirSync(uploadDirectory, { recursive: true });

const extensionByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDirectory),
  filename: (_request, file, callback) => {
    const extension = extensionByMimeType[file.mimetype];
    callback(null, `${Date.now()}-${randomBytes(12).toString('hex')}${extension}`);
  },
});

export const uploadRoomPhotos = multer({
  storage,
  limits: { files: 5, fileSize: 2 * 1024 * 1024 },
  fileFilter(_request, file, callback) {
    if (!extensionByMimeType[file.mimetype]) {
      return callback(new ApiError(400, 'Only JPEG, PNG, WebP, GIF, or AVIF images are accepted.'));
    }
    return callback(null, true);
  },
});

/** Merge JSON URLs, multipart photoUrls, and uploaded files into Room.photos. */
export function collectRoomPhotos(request, _response, next) {
  try {
    request.body ??= {};
    let urls = request.body.photos;
    if (typeof urls === 'string') urls = [urls];
    if (!Array.isArray(urls)) urls = [];

    let suppliedUrls = request.body.photoUrls;
    if (typeof suppliedUrls === 'string') {
      try {
        suppliedUrls = JSON.parse(suppliedUrls);
      } catch {
        suppliedUrls = [suppliedUrls];
      }
    }
    if (typeof suppliedUrls === 'string') suppliedUrls = [suppliedUrls];
    if (Array.isArray(suppliedUrls)) urls.push(...suppliedUrls);

    const uploadedUrls = (request.files ?? []).map((file) => (
      `${request.protocol}://${request.get('host')}/uploads/${path.basename(file.filename)}`
    ));
    if (urls.length || uploadedUrls.length || Object.hasOwn(request.body, 'photos') || Object.hasOwn(request.body, 'photoUrls')) {
      request.body.photos = [...urls, ...uploadedUrls];
    }
    delete request.body.photoUrls;
    return next();
  } catch (error) {
    return next(error);
  }
}
