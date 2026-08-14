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

  if (spec.fps !== undefined && (!Number.isInteger(spec.fps) || spec.fps < 1 || spec.fps > 120)) {
    add('error', 'fps', 'must be an integer between 1 and 120');
  }

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

    if (scene.type === 'quiz') {
      const optionCount = Array.isArray(scene.options) ? scene.options.length : 0;
      if (optionCount < 2 || optionCount > 4) {
        add('error', `${path}.options`, 'must contain two to four options');
      }
      if (
        !Number.isInteger(scene.answerIndex) ||
        scene.answerIndex < 0 ||
        scene.answerIndex >= optionCount
      ) {
        add('error', `${path}.answerIndex`, 'must point at one of the options');
      }
      // Keep the roadmap's "short pause before revealing quiz answers" honest.
      const reveal = scene.revealAtFrame ?? Math.round(scene.durationInFrames * 0.6);
      const minPauseFrames = Math.round(1.5 * fps);
      const minRevealHoldFrames = Math.round(1 * fps);
      if (!Number.isInteger(reveal) || reveal < minPauseFrames) {
        add(
          'warning',
          `${path}.revealAtFrame`,
          `answer reveals before a ${(minPauseFrames / fps).toFixed(1)}s thinking pause`,
        );
      }
      if (reveal > scene.durationInFrames - minRevealHoldFrames) {
        add(
          'warning',
          `${path}.revealAtFrame`,
          `leave at least ${(minRevealHoldFrames / fps).toFixed(1)}s to show the answer`,
        );
      }
    }

    if (scene.type === 'chart') {
      const barCount = Array.isArray(scene.bars) ? scene.bars.length : 0;
      if (barCount < 2) {
        add('error', `${path}.bars`, 'needs at least two bars; use bigStat for one number');
      } else if (barCount > 6) {
        add('warning', `${path}.bars`, `${barCount} bars will be cramped; keep it to six`);
      }
      for (const [barIndex, bar] of (scene.bars ?? []).entries()) {
        if (!Number.isFinite(bar.value) || bar.value < 0) {
          add('error', `${path}.bars[${barIndex}].value`, 'must be a non-negative number');
        }
        if (!bar.label?.trim()) {
          add('error', `${path}.bars[${barIndex}].label`, 'is required — bars are identified by label, not color');
        }
      }
      if (
        scene.highlightIndex !== undefined &&
        (!Number.isInteger(scene.highlightIndex) ||
          scene.highlightIndex < 0 ||
          scene.highlightIndex >= barCount)
      ) {
        add('error', `${path}.highlightIndex`, 'must point at one of the bars');
      }
    }

    if (scene.type === 'timeline') {
      const eventCount = Array.isArray(scene.events) ? scene.events.length : 0;
      if (eventCount < 2) {
        add('error', `${path}.events`, 'needs at least two events');
      } else if (eventCount > 6) {
        add('warning', `${path}.events`, `${eventCount} events will be cramped; keep it to six`);
      }
      for (const [eventIndex, event] of (scene.events ?? []).entries()) {
        if (!event.time?.trim()) {
          add('error', `${path}.events[${eventIndex}].time`, 'is required');
        }
        if (!event.label?.trim()) {
          add('error', `${path}.events[${eventIndex}].label`, 'is required');
        }
      }
    }

    if (scene.type === 'kineticText') {
      const beats = Array.isArray(scene.beats) ? scene.beats : [];
      if (beats.length === 0) {
        add('error', `${path}.beats`, 'needs at least one beat');
      }
      let explicit = 0;
      let flexible = 0;
      for (const [beatIndex, beat] of beats.entries()) {
        if (!beat.text?.trim()) {
          add('error', `${path}.beats[${beatIndex}].text`, 'is required');
        }
        if (beat.holdFrames === undefined) {
          flexible++;
        } else if (!Number.isInteger(beat.holdFrames) || beat.holdFrames <= 0) {
          add('error', `${path}.beats[${beatIndex}].holdFrames`, 'must be a positive integer');
        } else {
          explicit += beat.holdFrames;
        }
      }
      if (beats.length > 0 && explicit > scene.durationInFrames) {
        add('error', `${path}.beats`, 'explicit holdFrames exceed the scene duration');
      } else if (beats.length > 0) {
        // Mirrors beatWindows() in src/scenes/KineticText.tsx.
        const share = flexible
          ? (scene.durationInFrames - explicit) / flexible
          : Infinity;
        const minReadableFrames = Math.round(0.35 * fps);
        const shortest = Math.min(
          share,
          ...beats
            .filter((beat) => Number.isInteger(beat.holdFrames) && beat.holdFrames > 0)
            .map((beat) => beat.holdFrames),
        );
        if (shortest < minReadableFrames) {
          add(
            'warning',
            `${path}.beats`,
            `shortest beat is ${shortest.toFixed(0)} frames; keep beats at ${minReadableFrames}+ to stay readable`,
          );
        }
      }
    }

    if (scene.type === 'countdown') {
      if (!Number.isInteger(scene.from) || scene.from < 2 || scene.from > 10) {
        add('error', `${path}.from`, 'must count down from 2–10');
      }
      if (!scene.reveal?.trim()) {
        add('error', `${path}.reveal`, 'is required — a countdown needs a payoff');
      }
      // Mirrors countdownRevealFrames() in src/scenes/Countdown.tsx.
      const revealFrames =
        scene.revealFrames ?? Math.round(scene.durationInFrames * 0.4);
      if (
        scene.revealFrames !== undefined &&
        (!Number.isInteger(scene.revealFrames) ||
          scene.revealFrames <= 0 ||
          scene.revealFrames >= scene.durationInFrames)
      ) {
        add('error', `${path}.revealFrames`, 'must fit inside the scene');
      } else if (Number.isInteger(scene.from) && scene.from >= 2) {
        const perNumber = (scene.durationInFrames - revealFrames) / scene.from;
        const minBeatFrames = Math.round(0.3 * fps);
        if (perNumber < minBeatFrames) {
          add(
            'warning',
            `${path}.from`,
            `each number shows for ${perNumber.toFixed(0)} frames; give the countdown more time`,
          );
        }
      }
    }

    if (scene.type === 'numberLine') {
      const {min, max} = scene;
      const step = scene.step ?? 1;
      if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
        add('error', `${path}.min`, 'min must be less than max');
      }
      if (!Number.isFinite(step) || step <= 0) {
        add('error', `${path}.step`, 'must be a positive number');
      } else if (Number.isFinite(min) && Number.isFinite(max) && min < max) {
        const tickCount = Math.floor((max - min) / step) + 1;
        if (tickCount > 21) {
          add('warning', `${path}.step`, `${tickCount} ticks will be unreadable; keep it to 21`);
        }
      }
      const inRange = (value) => value >= min && value <= max;
      for (const [markIndex, mark] of (scene.marks ?? []).entries()) {
        if (!Number.isFinite(mark.value) || !inRange(mark.value)) {
          add('error', `${path}.marks[${markIndex}].value`, 'must sit on the line');
        }
      }
      if (scene.jump && (!inRange(scene.jump.from) || !inRange(scene.jump.to))) {
        add('error', `${path}.jump`, 'must start and land on the line');
      }
    }

    if (scene.type === 'labeledDiagram') {
      if (!scene.emoji?.trim()) {
        add('error', `${path}.emoji`, 'is required — the emoji is the illustration');
      }
      const labelCount = Array.isArray(scene.labels) ? scene.labels.length : 0;
      if (labelCount < 1) {
        add('error', `${path}.labels`, 'needs at least one label');
      } else if (labelCount > 6) {
        add('warning', `${path}.labels`, `${labelCount} labels will be cramped; keep it to six`);
      }
      for (const [labelIndex, label] of (scene.labels ?? []).entries()) {
        if (!label.text?.trim()) {
          add('error', `${path}.labels[${labelIndex}].text`, 'is required');
        }
        if (!['left', 'right'].includes(label.side)) {
          add('error', `${path}.labels[${labelIndex}].side`, 'must be "left" or "right"');
        }
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
  if (spec.audio) {
    const audioPath = resolve(publicRoot, spec.audio);
    if (!audioPath.startsWith(`${publicRoot}${sep}`)) {
      add('error', 'audio', 'must stay inside public/');
    }
  }
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
