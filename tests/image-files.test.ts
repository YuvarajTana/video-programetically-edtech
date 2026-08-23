import assert from 'node:assert/strict';
import test from 'node:test';
import {detectImageFormat, ingestProjectImage} from '@video-kit/backend/image-files';

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

test('project image ingestion detects supported image content', () => {
  assert.equal(detectImageFormat(png)?.mimeType, 'image/png');
  assert.equal(
    detectImageFormat(Buffer.from([0xff, 0xd8, 0xff, ...new Array(32).fill(0)]))
      ?.mimeType,
    'image/jpeg',
  );
  assert.equal(
    detectImageFormat(Buffer.from('RIFF0000WEBP012345678901234567890123', 'ascii'))
      ?.mimeType,
    'image/webp',
  );
});

test('project image ingestion rejects MIME-spoofed content before writing', () => {
  assert.throws(
    () =>
      ingestProjectImage({
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        originalFilename: 'photo.jpg',
        mimeType: 'image/jpeg',
        data: png,
      }),
    /does not match its MIME type/,
  );
});
