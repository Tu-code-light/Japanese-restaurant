import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const imageDirectory = path.join(env.uploadDirectory, 'products');
const publicPrefix = '/uploads/products/';
const extensionByMime = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

export async function saveProductImage(file) {
  const extension = extensionByMime.get(file.mimetype);
  if (!extension) throw new Error('Unsupported product image type');

  await mkdir(imageDirectory, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  await writeFile(path.join(imageDirectory, filename), file.buffer, { flag: 'wx' });
  return `${publicPrefix}${filename}`;
}

export async function deleteProductImage(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith(publicPrefix)) return;

  const filename = imageUrl.slice(publicPrefix.length);
  if (!filename || path.basename(filename) !== filename) return;

  try {
    await unlink(path.join(imageDirectory, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
