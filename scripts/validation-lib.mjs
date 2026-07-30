import {DELIVERIES, refOf} from './deliveries.mjs';
import {existsSync} from 'node:fs';
import {resolve, sep} from 'node:path';

const words = (text = '') => text.trim().split(/\s+/).filter(Boolean).length;

const issue = (severity, path, message) => ({severity, path, message});

export const validateSpec = (spec, channel) => {
  const issues = [];
  const add = (severity, path, message) => issues.push(issue(severity, path, message));
  if (!channel) {
    add('error', 'channel', `unknown channel "${spec.channel ?? ''}"`);
    return issues;
  }
  const fps = spec.fps ?? 30;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spec.slug ?? '')) {
    add('error', 'slug', 'must be lowercase kebab-case');
  }
  if (!spec.title?.trim()) add('error', 'title', 'is required');
  if (!spec.template?.trim()) add('error', 'template', 'is required');
  if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) {
    add('error', 'scenes', 'must contain at least one scene');
    return issues;
  }

  const deliveries = spec.deliveries ?? channel.defaultDeliveries;
  for (const delivery of deliveries) {
    if (!DELIVERIES[delivery]) add('error', 'deliveries', `unknown delivery "${delivery}"`);
  }

  const seen = new Set();
  let totalFrames = 0;
  let narratedScenes = 0;
  spec.scenes.forEach((scene, index) => {
    const path = `scenes[${index}]`;
    if (!Number.isInteger(scene.durationInFrames) || scene.durationInFrames <= 0) {
      add('error', `${path}.durationInFrames`, 'must be a positive integer');
    }
    totalFrames += Math.max(0, scene.durationInFrames ?? 0);

    const id = scene.id ?? `s${index + 1}`;
    if (seen.has(id)) add('error', `${path}.id`, `duplicate scene id "${id}"`);
    seen.add(id);

    if (scene.narration?.trim()) {
      narratedScenes++;
      const seconds = scene.durationInFrames / fps;
      const wpm = seconds > 0 ? (words(scene.narration) / seconds) * 60 : Infinity;
      if (wpm > channel.editorial.maxNarrationWpm) {
        add(
          'warning',
          `${path}.narration`,
          `${Math.round(wpm)} WPM exceeds ${channel.editorial.maxNarrationWpm} WPM for ${channel.id}`,
        );
      }
    }

    if (scene.type === 'architecture') {
      const ids = new Set(scene.nodes.map((node) => node.id));
      for (const edge of scene.edges) {
        if (!ids.has(edge.from)) add('error', `${path}.edges`, `unknown node "${edge.from}"`);
        if (!ids.has(edge.to)) add('error', `${path}.edges`, `unknown node "${edge.to}"`);
      }
      for (const traceId of scene.trace?.path ?? []) {
        if (!ids.has(traceId)) add('error', `${path}.trace`, `unknown node "${traceId}"`);
      }
    }
  });

  if (spec.kind !== 'style-guide') {
    if (narratedScenes === 0 && spec.channel !== 'fun') {
      add('error', 'scenes', 'at least one narrated scene is required');
    }

    const seconds = totalFrames / fps;
    if (seconds < channel.editorial.minSeconds || seconds > channel.editorial.maxSeconds) {
      add(
        'warning',
        'duration',
        `${seconds.toFixed(1)}s is outside the ${channel.editorial.minSeconds}–${channel.editorial.maxSeconds}s ${channel.id} range`,
      );
    }

    const hookSeconds = spec.scenes[0].durationInFrames / fps;
    if (hookSeconds > 3.2) {
      add('warning', 'scenes[0]', `hook lasts ${hookSeconds.toFixed(1)}s; target 3.2s or less`);
    }

    if (channel.editorial.requiresAgeBand && !spec.audience?.ageBand) {
      add('error', 'audience.ageBand', 'is required for Learn videos');
    }
    if (channel.editorial.requiresLearningObjective && !spec.editorial?.objective) {
      add('error', 'editorial.objective', 'is required for Learn videos');
    }
    if (
      channel.editorial.requiresSafetyReview &&
      !['reviewed', 'approved'].includes(spec.editorial?.safetyStatus)
    ) {
      add('error', 'editorial.safetyStatus', 'must be reviewed or approved for Learn videos');
    }

    const hasClaimScene = spec.scenes.some((scene) =>
      ['stats', 'bigStat'].includes(scene.type),
    );
    if (spec.channel === 'tech' && hasClaimScene && !spec.editorial?.sources?.length) {
      add('warning', 'editorial.sources', 'add sources for statistics or quantitative claims');
    }
  }

  const publicRoot = resolve('public');
  if (spec.captionTimings) {
    const captionTimingsPath = resolve(publicRoot, spec.captionTimings);
    if (!captionTimingsPath.startsWith(`${publicRoot}${sep}`)) {
      add('error', 'captionTimings', 'must stay inside public/');
    }
  }
  const validateAudioAsset = (asset, path) => {
    if (!asset?.src?.trim()) {
      add('error', `${path}.src`, 'is required');
      return;
    }
    const assetPath = resolve(publicRoot, asset.src);
    if (!assetPath.startsWith(`${publicRoot}${sep}`)) {
      add('error', `${path}.src`, 'must stay inside public/');
    } else if (!existsSync(assetPath)) {
      add('error', `${path}.src`, `missing public/${asset.src}`);
    }
    if (!asset.credit?.trim()) {
      add('error', `${path}.credit`, 'is required for media traceability');
    }
    if (!asset.license?.trim()) {
      add('error', `${path}.license`, 'is required for media traceability');
    }
    if (
      asset.volume !== undefined &&
      (!Number.isFinite(asset.volume) || asset.volume < 0 || asset.volume > 1)
    ) {
      add('error', `${path}.volume`, 'must be between 0 and 1');
    }
  };

  const music = spec.soundtrack?.music;
  if (music) {
    validateAudioAsset(music, 'soundtrack.music');
    if (
      music.startFrame !== undefined &&
      (!Number.isInteger(music.startFrame) ||
        music.startFrame < 0 ||
        music.startFrame >= totalFrames)
    ) {
      add(
        'error',
        'soundtrack.music.startFrame',
        'must be an integer inside the video timeline',
      );
    }
    for (const field of ['trimBefore', 'fadeInFrames', 'fadeOutFrames']) {
      if (
        music[field] !== undefined &&
        (!Number.isInteger(music[field]) || music[field] < 0)
      ) {
        add('error', `soundtrack.music.${field}`, 'must be a non-negative integer');
      }
    }
  }

  for (const [index, effect] of (spec.soundtrack?.effects ?? []).entries()) {
    const path = `soundtrack.effects[${index}]`;
    validateAudioAsset(effect, path);
    if (
      !Number.isInteger(effect.startFrame) ||
      effect.startFrame < 0 ||
      effect.startFrame >= totalFrames
    ) {
      add('error', `${path}.startFrame`, 'must be an integer inside the video timeline');
    }
    if (
      effect.durationInFrames !== undefined &&
      (!Number.isInteger(effect.durationInFrames) ||
        effect.durationInFrames <= 0 ||
        effect.startFrame + effect.durationInFrames > totalFrames)
    ) {
      add('error', `${path}.durationInFrames`, 'must fit inside the video timeline');
    }
    if (
      effect.trimBefore !== undefined &&
      (!Number.isInteger(effect.trimBefore) || effect.trimBefore < 0)
    ) {
      add('error', `${path}.trimBefore`, 'must be a non-negative integer');
    }
  }

  const ducking = spec.soundtrack?.ducking;
  if (ducking) {
    if (
      ducking.gain !== undefined &&
      (!Number.isFinite(ducking.gain) || ducking.gain < 0 || ducking.gain > 1)
    ) {
      add('error', 'soundtrack.ducking.gain', 'must be between 0 and 1');
    }
    for (const field of ['attackFrames', 'releaseFrames']) {
      if (
        ducking[field] !== undefined &&
        (!Number.isInteger(ducking[field]) || ducking[field] < 0)
      ) {
        add(
          'error',
          `soundtrack.ducking.${field}`,
          'must be a non-negative integer',
        );
      }
    }
  }

  return issues;
};

export const validateCollection = (entries) => {
  const results = [];
  const refs = new Set();
  for (const {spec, channel} of entries) {
    const ref = refOf(spec);
    const issues = validateSpec(spec, channel);
    if (refs.has(ref)) {
      issues.push(issue('error', 'slug', `duplicate video ref "${ref}"`));
    }
    refs.add(ref);
    results.push({ref, kind: spec.kind ?? 'video', issues});
  }
  return results;
};
