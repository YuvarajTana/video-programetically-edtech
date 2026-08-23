#!/usr/bin/env node
/**
 * Channel-aware batch renderer.
 *
 *   npm run render
 *   npm run render -- tech/selection-sort
 *   npm run render -- tech/selection-sort --profile portrait
 *   npm run render -- tech/selection-sort --variant instagram-carousel-slides
 *   npm run render -- tech/selection-sort --variant loop-gif
 *   npm run render -- tech/selection-sort --still
 *
 * Specs come from @video-kit/catalog and artifacts from @video-kit/render-engine,
 * so this no longer launches a browser just to enumerate compositions and parse
 * meaning out of their ids.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {config, paths} from '@video-kit/core/config';
import {variantById, variantsFor} from '@video-kit/core/output';
import {produceVariants} from '@video-kit/render-engine';
import {toSrt, toVoScript} from './captions-lib.mjs';
import {matchesRef, positionals, preferredRenderProfile} from './deliveries.mjs';
import {packageSpec} from './package-lib.mjs';
import {loadSpecs} from './spec-loader.mjs';
import {validateCollection} from './validation-lib.mjs';

const argv = process.argv.slice(2);
const flagValue = (name) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? null : (argv[index + 1] ?? null);
};
const has = (name) => argv.includes(`--${name}`);
const refs = positionals(argv, ['profile', 'format', 'variant']);
const onlyAspect = flagValue('profile') ?? flagValue('format');
const onlyVariant = flagValue('variant');
const stillsOnly = has('still');
const outRoot = paths.out();

const browser = {
  browserExecutable: config.browserExecutable(),
  chromeMode: config.chromeMode(),
  concurrency: config.renderConcurrency() ?? null,
};

const entries = (await loadSpecs()).filter(({spec}) => matchesRef(spec, refs));
if (!entries.length) {
  console.error('no production specs matched');
  process.exit(1);
}

const validation = validateCollection(entries);
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

/**
 * Which variants to produce. `--variant` names one directly, so any registered
 * output can be produced ad hoc without editing the spec's deliveries; without
 * it the spec's own variants apply.
 */
const selectVariants = (spec, channel) => {
  if (onlyVariant) return [variantById(onlyVariant)];
  return variantsFor(spec, channel).filter((variant) => {
    if (onlyAspect && variant.aspect !== onlyAspect) return false;
    // --still keeps everything that is not a moving picture.
    if (stillsOnly && (variant.kind === 'video' || variant.kind === 'animated-image')) {
      return false;
    }
    return true;
  });
};

for (const {spec, channel} of entries) {
  const variants = selectVariants(spec, channel);
  if (!variants.length) {
    console.log(`· skip   ${spec.channel}/${spec.slug} (no matching variants)`);
    continue;
  }

  const base = join(outRoot, spec.channel, spec.slug);
  let last = -1;
  const artifacts = await produceVariants({
    spec,
    channel,
    variants,
    outDir: base,
    browser,
    onProgress: (variant, fraction) => {
      if (variant.kind !== 'video') return;
      const pct = Math.floor(fraction * 100);
      if (pct < last + 10) return;
      last = pct;
      process.stdout.write(
        `\r· render ${spec.channel}/${spec.slug} ${variant.id} ${pct}%   `,
      );
    },
  });
  if (last >= 0) process.stdout.write('\n');

  for (const artifact of artifacts) {
    console.log(`· ${artifact.kind.padEnd(9)} ${artifact.path}`);
  }

  mkdirSync(base, {recursive: true});
  const fps = spec.fps ?? 30;
  writeFileSync(join(base, 'captions.srt'), toSrt(spec, fps));
  writeFileSync(
    join(base, 'voiceover.md'),
    toVoScript(
      spec,
      fps,
      join(base, `${onlyAspect ?? preferredRenderProfile(spec, channel)}.mp4`),
    ),
  );
  packageSpec({spec, channel, outRoot});
  console.log(`· package ${spec.channel}/${spec.slug}`);
}

console.log(`\ndone → ${outRoot}`);
