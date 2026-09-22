import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceImage } from '../adapters/source/types.js';

export const SOURCE_IMAGE_DIR = fileURLToPath(
  new URL('../../storage/listings/', import.meta.url),
);

export const saveSourceImage = async (
  externalId: string,
  position: number,
  image: SourceImage,
): Promise<string> => {
  if (!/^\d+$/.test(externalId)) throw new Error('Некорректный ID изображения');
  if (!Number.isInteger(position) || position < 0 || position > 3) {
    throw new Error('Некорректная позиция изображения');
  }
  const fileName = `${externalId}-${position + 1}.${image.extension}`;
  await mkdir(SOURCE_IMAGE_DIR, { recursive: true });
  await writeFile(join(SOURCE_IMAGE_DIR, fileName), image.bytes, { flag: 'w' });
  return fileName;
};

export const sourceImagePath = (fileName: string): string => {
  if (basename(fileName) !== fileName || !/^\d+-[1-4]\.(?:jpg|png|heic|heif)$/i.test(fileName)) {
    throw new Error('Некорректное имя сохранённого изображения');
  }
  return join(SOURCE_IMAGE_DIR, fileName);
};

export const deleteSourceImages = async (fileNames: string[]): Promise<void> => {
  await Promise.all(
    fileNames.map(async (fileName) => {
      try {
        await unlink(sourceImagePath(fileName));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }),
  );
};
