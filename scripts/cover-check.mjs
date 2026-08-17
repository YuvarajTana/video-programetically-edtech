#!/usr/bin/env node
/**
 * Cover safe-box audit. Decodes rendered cover PNGs and measures where the
 * content actually sits, because the Instagram profile grid crops covers to a
 * centered tile and clipped text ships silently.
 *
 *   npm run cover:check                      # every rendered cover in out/
 *   npm run cover:check -- tech/my-video
 *
 * Checks, per cover:
 *   - side margins ≥ 140px (content must not hug the edges)
 *   - portrait covers: content inside the centered 800×1100 grid-safe box
 * Exits non-zero when any cover fails.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {DELIVERIES, positionals} from './deliveries.mjs';
import {decodePng, rgbDistance} from './png-lib.mjs';

const refs = positionals(process.argv.slice(2));
const MIN_SIDE_MARGIN = 140;
const GRID_SAFE = {width: 800, height: 1100}; // centered, portrait covers

const sampleAt = (image, x, y) => {
  const at = (y * image.width + x) * image.channels;
  return [image.pixels[at], image.pixels[at + 1], image.pixels[at + 2]];
};

const contentBounds = (image) => {
  // Background = the dominant corner color; anything sufficiently different
  // counts as content. Sample a grid rather than every pixel for speed.
  // The top and bottom 10% are excluded: the kicker chip and footer handles
  // are deliberately edge-anchored chrome, not content that must survive a
  // grid crop.
  const corners = [
    sampleAt(image, 2, 2),
    sampleAt(image, image.width - 3, 2),
    sampleAt(image, 2, image.height - 3),
    sampleAt(image, image.width - 3, image.height - 3),
  ];
  const step = 3;
  const threshold = 40;
  // The chrome rows sit inside the top/bottom ~160px at every cover size.
  const chromeBand = Math.max(160, Math.round(image.height * 0.1));
  let minX = image.width;
  let maxX = -1;
  let minY = image.height;
  let maxY = -1;
  for (let y = chromeBand; y < image.height - chromeBand; y += step) {
    for (let x = 0; x < image.width; x += step) {
      const pixel = sampleAt(image, x, y);
      const isBackground = corners.some(
        (corner) => rgbDistance(pixel, corner) < threshold,
      );
      if (isBackground) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX === -1 ? null : {minX, maxX, minY, maxY};
};

const outRoot = 'out';
let checked = 0;
let failures = 0;

for (const channel of existsSync(outRoot) ? readdirSync(outRoot) : []) {
  const channelDir = join(outRoot, channel);
  let slugs;
  try {
    slugs = readdirSync(channelDir);
  } catch {
    continue;
  }
  for (const slug of slugs) {
    const ref = `${channel}/${slug}`;
    if (refs.length && !refs.includes(ref) && !refs.includes(slug)) continue;
    for (const deliveryId of Object.keys(DELIVERIES)) {
      const coverPath = join(channelDir, slug, deliveryId, 'cover.png');
      if (!existsSync(coverPath)) continue;
      checked++;
      const image = decodePng(readFileSync(coverPath));
      const bounds = contentBounds(image);
      const problems = [];
      if (!bounds) {
        problems.push('no content detected');
      } else {
        const left = bounds.minX;
        const right = image.width - 1 - bounds.maxX;
        if (left < MIN_SIDE_MARGIN || right < MIN_SIDE_MARGIN) {
          problems.push(
            `side margins ${left}px / ${right}px (need ${MIN_SIDE_MARGIN}px)`,
          );
        }
        if (image.height > image.width) {
          const safeLeft = (image.width - GRID_SAFE.width) / 2;
          const safeTop = (image.height - GRID_SAFE.height) / 2;
          if (
            bounds.minX < safeLeft ||
            bounds.maxX > image.width - safeLeft ||
            bounds.minY < safeTop ||
            bounds.maxY > image.height - safeTop
          ) {
            problems.push(
              `content escapes the centered ${GRID_SAFE.width}×${GRID_SAFE.height} grid-safe box`,
            );
          }
        }
      }
      if (problems.length) {
        failures++;
        console.log(`× ${ref} ${deliveryId}: ${problems.join('; ')}`);
      } else {
        console.log(`✓ ${ref} ${deliveryId}`);
      }
    }
  }
}

if (!checked) {
  console.error('no rendered covers found — run npm run render -- <ref> --still first');
  process.exit(1);
}
console.log(`\n${checked} covers · ${failures} failing`);
if (failures) process.exit(1);
