import {DELIVERIES, refOf} from './deliveries.mjs';

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
