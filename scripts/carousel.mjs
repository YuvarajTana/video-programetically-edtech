#!/usr/bin/env node
/**
 * Renders carousel deliveries: one slide per scene, captured late in the
 * scene so every element has entered, plus a PDF for LinkedIn document posts.
 *
 *   npm run carousel -- tech/my-video
 *
 * Slides land in out/<ref>/instagram-carousel/slides/, the PDF beside them.
 */
import {bundle} from '@remotion/bundler';
import {getCompositions, renderStill} from '@remotion/renderer';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DELIVERIES, matchesRef, positionals, videoComposition} from './deliveries.mjs';
import {jpegsToPdf} from './pdf-lib.mjs';
import {PUBLIC_DIR, RENDER_KIT_ENTRY} from './render-kit.mjs';

const refs = positionals(process.argv.slice(2));

const browserOptions = {
  browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null,
  chromeMode: process.env.REMOTION_CHROME_MODE || undefined,
};

console.log('· bundling');
const serveUrl = await bundle({
  entryPoint: RENDER_KIT_ENTRY,
  publicDir: PUBLIC_DIR,
  onProgress: () => {},
});
const compositions = await getCompositions(serveUrl, browserOptions);

let count = 0;
for (const composition of compositions.filter(videoComposition)) {
  const {spec} = composition.props ?? {};
  if (!spec || spec.kind === 'style-guide' || !matchesRef(spec, refs)) continue;

  const stillDeliveries = (spec.deliveries ?? []).filter(
    (id) => DELIVERIES[id]?.stills,
  );
  for (const deliveryId of stillDeliveries) {
    const delivery = DELIVERIES[deliveryId];
    if (composition.id !== `${spec.channel}--${spec.slug}--${delivery.renderProfile}`) {
      continue;
    }

    const slidesDir = join('out', spec.channel, spec.slug, deliveryId, 'slides');
    mkdirSync(slidesDir, {recursive: true});

    const slides = [];
    let at = 0;
    for (const [index, scene] of spec.scenes.entries()) {
      // Capture at 80% through the scene: entrances done, exit fade not begun.
      const frame = Math.min(
        at + Math.max(Math.round(scene.durationInFrames * 0.8) - 1, 0),
        at + scene.durationInFrames - 1,
      );
      const output = join(slidesDir, `slide-${String(index + 1).padStart(2, '0')}.jpg`);
      await renderStill({
        composition,
        serveUrl,
        output,
        frame,
        imageFormat: 'jpeg',
        jpegQuality: 95,
        overwrite: true,
        ...browserOptions,
      });
      slides.push(output);
      at += scene.durationInFrames;
    }

    const pdfPath = join('out', spec.channel, spec.slug, deliveryId, 'carousel.pdf');
    writeFileSync(pdfPath, jpegsToPdf(slides.map((slide) => readFileSync(slide))));
    console.log(
      `· ${spec.channel}/${spec.slug} ${deliveryId}: ${slides.length} slides + carousel.pdf`,
    );
    count++;
  }
}

if (!count) {
  console.error(
    'no carousel deliveries matched — declare "instagram-carousel" in spec.deliveries',
  );
  process.exit(1);
}
