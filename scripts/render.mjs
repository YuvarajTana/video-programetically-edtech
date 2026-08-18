#!/usr/bin/env node
/**
 * Channel-aware batch renderer.
 *
 *   npm run render
 *   npm run render -- tech/selection-sort
 *   npm run render -- tech/selection-sort --profile portrait
 *   npm run render -- tech/selection-sort --still
 */
import {bundle} from '@remotion/bundler';
import {getCompositions, renderMedia, renderStill} from '@remotion/renderer';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {toSrt, toVoScript} from './captions-lib.mjs';
import {
  coverComposition,
  matchesRef,
  positionals,
  preferredRenderProfile,
  STILL_PROFILES,
  videoComposition,
} from './deliveries.mjs';
import {packageSpec} from './package-lib.mjs';
import {validateCollection} from './validation-lib.mjs';
import {PUBLIC_DIR, RENDER_KIT_ENTRY} from './render-kit.mjs';

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? null : (argv[index + 1] ?? true);
};
const has = (name) => argv.includes(`--${name}`);
const refs = positionals(argv, ['profile', 'format']);
const onlyProfile = flag('profile') ?? flag('format');
const stillsOnly = has('still');
const outRoot = 'out';

const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
const concurrency = process.env.RENDER_CONCURRENCY
  ? Number(process.env.RENDER_CONCURRENCY)
  : null;
const chromeMode = process.env.REMOTION_CHROME_MODE || undefined;

console.log('· bundling');
const serveUrl = await bundle({
  entryPoint: RENDER_KIT_ENTRY,
  publicDir: PUBLIC_DIR,
  onProgress: () => {},
});
const compositions = await getCompositions(serveUrl, {
  browserExecutable,
  chromeMode,
});

const productionVideos = compositions.filter((composition) => {
  if (!videoComposition(composition)) return false;
  const {spec} = composition.props ?? {};
  if (!spec || spec.kind === 'style-guide') return false;
  if (!matchesRef(spec, refs)) return false;
  const profile = composition.id.split('--')[2];
  // Stills-only profiles (carousels) render via `npm run carousel`, not as video.
  if (STILL_PROFILES.has(profile)) return false;
  if (onlyProfile && profile !== onlyProfile) return false;
  return true;
});

const selectedRefs = new Set(
  productionVideos.map(({props}) => `${props.spec.channel}/${props.spec.slug}`),
);
const productionCovers = compositions.filter((composition) => {
  if (!coverComposition(composition)) return false;
  const {spec, delivery} = composition.props ?? {};
  if (!spec || !selectedRefs.has(`${spec.channel}/${spec.slug}`)) return false;
  if (onlyProfile && delivery.renderProfile !== onlyProfile) return false;
  return true;
});

if (!productionVideos.length && !productionCovers.length) {
  console.error('no production compositions matched');
  process.exit(1);
}

const uniqueEntries = [];
const seenSpecs = new Set();
for (const composition of productionVideos) {
  const {spec, channel} = composition.props;
  const ref = `${spec.channel}/${spec.slug}`;
  if (seenSpecs.has(ref)) continue;
  seenSpecs.add(ref);
  uniqueEntries.push({spec, channel});
}

const validation = validateCollection(uniqueEntries);
const errors = validation.flatMap((result) =>
  result.issues.filter((item) => item.severity === 'error'),
);
if (errors.length) {
  for (const result of validation) {
    for (const item of result.issues.filter((entry) => entry.severity === 'error')) {
      console.error(`error ${result.ref} ${item.path}: ${item.message}`);
    }
  }
  process.exit(1);
}

for (const composition of productionCovers) {
  const {spec, delivery} = composition.props;
  const base = join(outRoot, spec.channel, spec.slug, delivery.id);
  mkdirSync(base, {recursive: true});
  const output = join(base, 'cover.png');
  await renderStill({
    composition,
    serveUrl,
    output,
    frame: 0,
    browserExecutable,
    chromeMode,
    overwrite: true,
  });
  console.log(`· cover  ${output}`);
}

if (!stillsOnly) {
  for (const composition of productionVideos) {
    const {spec} = composition.props;
    const renderProfile = composition.id.split('--')[2];
    const renderDir = join(outRoot, spec.channel, spec.slug, 'renders');
    mkdirSync(renderDir, {recursive: true});
    const output = join(renderDir, `${renderProfile}.mp4`);
    let last = -1;
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      crf: 18,
      outputLocation: output,
      browserExecutable,
      chromeMode,
      concurrency,
      onProgress: ({progress}) => {
        const pct = Math.floor(progress * 100);
        if (pct >= last + 10) {
          last = pct;
          process.stdout.write(
            `\r· render ${spec.channel}/${spec.slug} ${renderProfile} ${pct}%   `,
          );
        }
      },
    });
    process.stdout.write(
      `\r· render ${spec.channel}/${spec.slug} ${renderProfile} 100%\n`,
    );
    console.log(`· video  ${output}`);
  }
}

for (const {spec, channel} of uniqueEntries) {
  const base = join(outRoot, spec.channel, spec.slug);
  mkdirSync(base, {recursive: true});
  const fps = spec.fps ?? 30;
  writeFileSync(join(base, 'captions.srt'), toSrt(spec, fps));
  writeFileSync(
    join(base, 'voiceover.md'),
    toVoScript(
      spec,
      fps,
      join(
        base,
        'renders',
        `${onlyProfile ?? preferredRenderProfile(spec, channel)}.mp4`,
      ),
    ),
  );
  packageSpec({spec, channel, outRoot});
  console.log(`· package ${spec.channel}/${spec.slug}`);
}

console.log(`\ndone → ${outRoot}`);
