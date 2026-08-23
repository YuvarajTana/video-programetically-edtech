import {fromRoot, paths} from '@video-kit/core/config';
import {randomUUID} from 'node:crypto';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {spawnSync} from 'node:child_process';

const IMAGE_FORMATS = {
  png: {mimeType: 'image/png', extension: 'png'},
  jpeg: {mimeType: 'image/jpeg', extension: 'jpg'},
  webp: {mimeType: 'image/webp', extension: 'webp'},
} as const;

export type ProjectImageAsset = {
  id: string;
  projectId: string;
  src: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export const detectImageFormat = (data: Buffer) => {
  if (
    data.length >= 8 &&
    data.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return IMAGE_FORMATS.png;
  }
  if (
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  ) {
    return IMAGE_FORMATS.jpeg;
  }
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString('ascii') === 'RIFF' &&
    data.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return IMAGE_FORMATS.webp;
  }
  return null;
};

export const ingestProjectImage = ({
  projectId,
  originalFilename,
  mimeType,
  data,
}: {
  projectId: string;
  originalFilename: string;
  mimeType: string;
  data: Buffer;
}): ProjectImageAsset => {
  if (data.length < 32 || data.length > 15 * 1024 * 1024) {
    throw new Error('Image must be between 32 bytes and 15 MB.');
  }
  const format = detectImageFormat(data);
  if (!format) {
    throw new Error('Unsupported image. Upload a valid PNG, JPEG, or WebP file.');
  }
  if (mimeType !== format.mimeType) {
    throw new Error('The uploaded image content does not match its MIME type.');
  }

  const root = join(paths.generated(), 'project-assets');
  const directory = resolve(root, projectId);
  if (!directory.startsWith(`${root}${sep}`)) {
    throw new Error('Invalid project image storage path.');
  }
  mkdirSync(directory, {recursive: true, mode: 0o700});
  const id = randomUUID();
  const filename = `${id}.${format.extension}`;
  const path = resolve(directory, filename);
  if (!path.startsWith(`${directory}${sep}`)) {
    throw new Error('Invalid project image path.');
  }
  writeFileSync(path, data, {mode: 0o600});
  const probe = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'json',
      path,
    ],
    {encoding: 'utf8', maxBuffer: 256_000},
  );
  try {
    if (probe.status !== 0) {
      throw new Error('The uploaded image is corrupt or cannot be decoded.');
    }
    const stream = JSON.parse(probe.stdout).streams?.[0] as
      | {width?: number; height?: number}
      | undefined;
    const width = Number(stream?.width);
    const height = Number(stream?.height);
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 12_000 ||
      height > 12_000 ||
      width * height > 80_000_000
    ) {
      throw new Error('Image dimensions must be at most 12,000 px per side and 80 megapixels.');
    }
  } catch (cause) {
    rmSync(path, {force: true});
    throw cause;
  }

  return {
    id,
    projectId,
    src: `generated/project-assets/${projectId}/${filename}`,
    originalFilename,
    mimeType: format.mimeType,
    sizeBytes: data.length,
  };
};
