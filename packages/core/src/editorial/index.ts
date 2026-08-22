/**
 * Editorial rules: "is this any good", as distinct from the scene schemas'
 * "is this well-formed".
 *
 * These lived in the CLI and so only ever ran on source-controlled specs.
 * Studio projects — the ones people actually make — got no editorial check at
 * all, and a 400-WPM narration or a twelve-bar chart rendered happily. The
 * rules are unchanged; only their reach is.
 *
 * This module is isomorphic so the studio can run it while you type. Its one
 * filesystem concern — do referenced assets exist, and do they stay inside
 * `public/` — is injected as an {@link AssetProbe}. Without one, asset rules
 * are *skipped* rather than passed: a browser cannot check the filesystem and
 * must not pretend it did. Node callers build one with `nodeAssetProbe()` from
 * `@video-kit/core/config`.
 */
import {DELIVERIES} from '../publishing/deliveries';
import type {ChannelProfile} from '../channels/types';
import type {Scene, VideoSpec} from '../spec';

export type IssueSeverity = 'error' | 'warning';

export type EditorialIssue = {
  severity: IssueSeverity;
  /** Dotted path into the spec, e.g. `scenes[3].bars[1].value`. */
  path: string;
  message: string;
};

/** The filesystem seam. See the module comment for why it is injected. */
export type AssetProbe = {
  /** Absolute path for a public-relative src, or null if it escapes the root. */
  resolve(src: string): string | null;
  exists(path: string): boolean;
};

/** The fields every licensed asset carries, visual or audio. */
type LicensedAssetLike = {
  src?: string;
  credit?: string;
  license?: string;
  volume?: number;
};

export type ValidateOptions = {
  /** Omit to skip every asset-existence and containment rule. */
  assets?: AssetProbe;
};

const words = (text = '') => text.trim().split(/\s+/).filter(Boolean).length;

/** Scenes with no moving mechanism — the retention-leak candidates. */
const TEXT_LED_SCENES = new Set(['title', 'callout', 'bigStat']);

/**
 * Roughly how long a labelled row needs to be on screen. One number rather
 * than ten guessed per type: it is the same order as the 0.35s floor the
 * kinetic-text rule already uses for a beat of a few words, scaled up because
 * these rows carry a label and often a value beside it.
 */
const MIN_ITEM_SECONDS = 0.8;

/**
 * Monospace lines wider than this wrap or shrink at the sizes Code.tsx and
 * Terminal.tsx render at. Not a new limit — it is the one the algorithm rule
 * already applies to `scene.code.lines`, applied to the same content in the
 * two scenes that are made of it.
 */
const MAX_MONO_LINE = 46;

/**
 * List-shaped scenes, where the schema caps the count structurally but only
 * the duration says whether anyone can follow it. Scenes with their own
 * pacing mechanism are deliberately absent: `code` is scanned as a block and
 * has focus steps, `arrayViz` has an explicit tempo, and `tokens`,
 * `kineticText` and `countdown` already carry bespoke rules above.
 */
const pacedItems = (scene: Scene): {field: string; count: number} | null => {
  switch (scene.type) {
    case 'steps':
      return {field: 'items', count: scene.items.length};
    case 'flow':
      return {field: 'steps', count: scene.steps.length};
    case 'stats':
      return {field: 'cards', count: scene.cards.length};
    case 'flashcards':
      return {field: 'items', count: scene.items.length};
    case 'colors':
      return {field: 'items', count: scene.items.length};
    case 'terminal':
      return {field: 'entries', count: scene.entries.length};
    case 'compare':
      return {
        field: 'points',
        count: scene.left.points.length + scene.right.points.length,
      };
    case 'outro':
      return {field: 'recap', count: scene.recap?.length ?? 0};
    default:
      return null;
  }
};

const issue = (
  severity: IssueSeverity,
  path: string,
  message: string,
): EditorialIssue => ({severity, path, message});

export const refOf = (spec: {channel: string; slug: string}) =>
  `${spec.channel}/${spec.slug}`;

export const validateSpec = (
  spec: VideoSpec,
  channel: ChannelProfile | undefined,
  options: ValidateOptions = {},
): EditorialIssue[] => {
  const issues: EditorialIssue[] = [];
  const add = (severity: IssueSeverity, path: string, message: string) =>
    issues.push(issue(severity, path, message));
  if (!channel) {
    add('error', 'channel', `unknown channel "${spec.channel ?? ''}"`);
    return issues;
  }
  const fps = spec.fps ?? 30;
  const assets = options.assets;

  /** Containment, then existence. Both skipped when no probe was supplied. */
  const checkAsset = (src: string, path: string) => {
    if (!assets) return;
    const resolved = assets.resolve(src);
    if (resolved === null) add('error', path, 'must stay inside public/');
    else if (!assets.exists(resolved)) add('error', path, `missing public/${src}`);
  };

  /** Containment only, for paths written by the pipeline rather than read. */
  const checkInsidePublic = (src: string, path: string) => {
    if (!assets) return;
    if (assets.resolve(src) === null) {
      add('error', path, 'must stay inside public/');
    }
  };

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
  const hasStillsDelivery = deliveries.some((id) => DELIVERIES[id]?.stills);
  if (hasStillsDelivery && Array.isArray(spec.scenes) && spec.scenes.length > 10) {
    add(
      'warning',
      'scenes',
      `${spec.scenes.length} scenes make ${spec.scenes.length} carousel slides; Instagram carousels cap at 10`,
    );
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
      // The floor applies only to text-led scenes: a slow line over a static
      // frame is dead air, while a mechanism scene's visuals carry the pause.
      const minWpm = channel.editorial.minNarrationWpm;
      if (minWpm && TEXT_LED_SCENES.has(scene.type) && wpm < minWpm) {
        add(
          'warning',
          `${path}.narration`,
          `${Math.round(wpm)} WPM is below the ${minWpm} WPM floor for a text-led ${scene.type} scene; tighten the scene or move the line onto a visual`,
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

    if (scene.type === 'algorithm') {
      const valueCount = Array.isArray(scene.values) ? scene.values.length : 0;
      if (valueCount < 2 || valueCount > 16) {
        add('error', `${path}.values`, 'needs two to sixteen values');
      }
      const steps = Array.isArray(scene.steps) ? scene.steps : [];
      if (steps.length === 0) {
        add('error', `${path}.steps`, 'needs at least one step');
      }
      let lastAt = -1;
      for (const [stepIndex, step] of steps.entries()) {
        const stepPath = `${path}.steps[${stepIndex}]`;
        if (
          !Number.isInteger(step.atFrame) ||
          step.atFrame < 0 ||
          step.atFrame >= scene.durationInFrames
        ) {
          add('error', `${stepPath}.atFrame`, 'must be a frame inside the scene');
        } else if (step.atFrame <= lastAt) {
          add('error', `${stepPath}.atFrame`, 'steps must be in strictly ascending order');
        } else {
          lastAt = step.atFrame;
        }
        if (typeof step.states !== 'string' || step.states.length !== valueCount) {
          add(
            'error',
            `${stepPath}.states`,
            `must be one state character per value (${valueCount})`,
          );
        } else if (!/^[.cfgx]*$/.test(step.states)) {
          add('error', `${stepPath}.states`, 'characters must be . c f g or x');
        }
        if (
          step.codeLine !== undefined &&
          (!Number.isInteger(step.codeLine) ||
            step.codeLine < 1 ||
            step.codeLine > (scene.code?.lines?.length ?? 0))
        ) {
          add('error', `${stepPath}.codeLine`, 'must point at a line of scene.code');
        }
        for (const [name, pointer] of Object.entries(step.pointers ?? {})) {
          if (!Number.isInteger(pointer) || pointer < 0 || pointer >= valueCount) {
            add('error', `${stepPath}.pointers.${name}`, 'must point at one of the values');
          }
        }
      }
      for (const [lineIndex, line] of (scene.code?.lines ?? []).entries()) {
        if (line.length > 46) {
          add(
            'warning',
            `${path}.code.lines[${lineIndex}]`,
            `${line.length} chars will wrap or shrink; keep code lines to 46`,
          );
        }
      }
    }

    if (scene.type === 'tokens') {
      const itemCount = Array.isArray(scene.items) ? scene.items.length : 0;
      if (itemCount < 2 || itemCount > 12) {
        add('error', `${path}.items`, 'needs two to twelve items');
      }
      for (const [itemIndex, item] of (scene.items ?? []).entries()) {
        if (!item.text?.trim()) {
          add('error', `${path}.items[${itemIndex}].text`, 'is required');
        }
        if (item.id === undefined || item.id === null || item.id === '') {
          add('error', `${path}.items[${itemIndex}].id`, 'is required — the flip needs a target');
        }
      }
      // Mirrors tokensFlipFrame() in src/scenes/Tokens.tsx.
      const flip = scene.flipAtFrame ?? Math.round(scene.durationInFrames * 0.45);
      if (!Number.isInteger(flip) || flip < 0 || flip >= scene.durationInFrames) {
        add('error', `${path}.flipAtFrame`, 'must be a frame inside the scene');
      } else if (scene.durationInFrames - flip < itemCount * 5 + Math.round(fps)) {
        add(
          'warning',
          `${path}.flipAtFrame`,
          'leaves too little time for every chip to flip and settle',
        );
      }
    }

    if (scene.type === 'meter') {
      if (!Number.isFinite(scene.max) || scene.max <= 0) {
        add('error', `${path}.max`, 'must be a positive number');
      } else {
        const from = scene.from ?? 0;
        if (!Number.isFinite(from) || from < 0 || from > scene.max) {
          add('error', `${path}.from`, 'must sit between 0 and max');
        }
        if (!Number.isFinite(scene.to) || scene.to < 0 || scene.to > scene.max) {
          add('error', `${path}.to`, 'must sit between 0 and max');
        }
        if (
          scene.marker &&
          (!Number.isFinite(scene.marker.value) ||
            scene.marker.value < 0 ||
            scene.marker.value > scene.max)
        ) {
          add('error', `${path}.marker.value`, 'must sit between 0 and max');
        }
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
            .map((beat) => beat.holdFrames)
            .filter(
              (hold): hold is number =>
                typeof hold === 'number' && Number.isInteger(hold) && hold > 0,
            ),
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
      const inRange = (value: number) => value >= min && value <= max;
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

    if (scene.type === 'motionCanvas') {
      for (const [elementIndex, element] of (scene.elements ?? []).entries()) {
        if (element.kind !== 'image') continue;
        checkAsset(element.src ?? '', `${path}.elements[${elementIndex}].src`);
      }
    }

    const paced = pacedItems(scene);
    if (paced && paced.count > 0) {
      const perItem = scene.durationInFrames / fps / paced.count;
      if (perItem < MIN_ITEM_SECONDS) {
        add(
          'warning',
          `${path}.${paced.field}`,
          `${paced.count} items get ${perItem.toFixed(1)}s each; ` +
            `give each row ${MIN_ITEM_SECONDS}s or cut the list`,
        );
      }
    }

    if (scene.type === 'code') {
      scene.lines.forEach((line, lineIndex) => {
        if (line.length > MAX_MONO_LINE) {
          add(
            'warning',
            `${path}.lines[${lineIndex}]`,
            `${line.length} chars will wrap or shrink; keep code lines to ${MAX_MONO_LINE}`,
          );
        }
      });
    }

    if (scene.type === 'terminal') {
      scene.entries.forEach((entry, entryIndex) => {
        const command = entry.cmd ?? '';
        if (command.length > MAX_MONO_LINE) {
          add(
            'warning',
            `${path}.entries[${entryIndex}].cmd`,
            `${command.length} chars will wrap or shrink; keep commands to ${MAX_MONO_LINE}`,
          );
        }
      });
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

    const firstScene = spec.scenes[0];
    const hookEnd =
      firstScene.type === 'motionCanvas' ? firstScene.hookEndFrame : undefined;
    const hookFrames =
      typeof hookEnd === 'number' && Number.isInteger(hookEnd)
        ? hookEnd
        : firstScene.durationInFrames;
    const hookSeconds = hookFrames / fps;
    if (hookSeconds > 3.2) {
      add('warning', 'scenes[0]', `hook lasts ${hookSeconds.toFixed(1)}s; target 3.2s or less`);
    }

    // The first frame is a hook, not a label: the channel chrome already
    // identifies the video, so an opening title that just repeats the topic
    // wastes the strongest three seconds.
    if (
      firstScene.type === 'title' &&
      firstScene.title?.trim().toLowerCase() === spec.title?.trim().toLowerCase()
    ) {
      add(
        'warning',
        'scenes[0].title',
        'opening title repeats the video title; make the first frame a claim or question and keep the topic in metadata',
      );
    }

    // Rotate explicitly chosen accents so adjacent scenes read as a sequence,
    // not one long scene. Scenes leaving accent to its default are exempt.
    for (let index = 1; index < spec.scenes.length; index++) {
      const previous = spec.scenes[index - 1].accent;
      const current = spec.scenes[index].accent;
      if (previous && current && previous === current) {
        add(
          'warning',
          `scenes[${index}].accent`,
          `repeats "${current}" from the previous scene; rotate accents between adjacent scenes`,
        );
      }
    }

    // A long text-led scene mid-video is the classic static-frame retention
    // leak: nothing moves while the clock runs.
    spec.scenes.forEach((scene, index) => {
      if (index === 0 || index === spec.scenes.length - 1) return;
      if (!TEXT_LED_SCENES.has(scene.type)) return;
      const staticSeconds = scene.durationInFrames / fps;
      if (staticSeconds > 6) {
        add(
          'warning',
          `scenes[${index}]`,
          `${scene.type} scene holds a static frame for ${staticSeconds.toFixed(1)}s; add a mechanism scene or shorten it`,
        );
      }
    });

    if (channel.editorial.requiresAgeBand && !spec.audience?.ageBand) {
      add('error', 'audience.ageBand', 'is required for Learn videos');
    }
    if (channel.editorial.requiresLearningObjective && !spec.editorial?.objective) {
      add('error', 'editorial.objective', 'is required for Learn videos');
    }
    if (
      channel.editorial.requiresSafetyReview &&
      !['reviewed', 'approved'].includes(spec.editorial?.safetyStatus ?? '')
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

  // The rail is one journey: stages bounded, every railStage on it, and the
  // active stage never moving backwards.
  const railStages = spec.rail?.stages;
  if (railStages !== undefined) {
    if (!Array.isArray(railStages) || railStages.length < 2 || railStages.length > 8) {
      add('error', 'rail.stages', 'needs two to eight stages');
    }
    for (const [stageIndex, stage] of (railStages ?? []).entries()) {
      if (!stage?.trim()) {
        add('error', `rail.stages[${stageIndex}]`, 'is required');
      } else if (stage.length > 16) {
        add('warning', `rail.stages[${stageIndex}]`, 'longer than 16 characters will crowd the rail');
      }
    }
  }
  let lastRailStage = -1;
  spec.scenes.forEach((scene, index) => {
    if (scene.railStage === undefined) return;
    const railPath = `scenes[${index}].railStage`;
    if (!railStages) {
      add('error', railPath, 'is set but the spec declares no rail');
      return;
    }
    if (
      !Number.isInteger(scene.railStage) ||
      scene.railStage < 0 ||
      scene.railStage >= railStages.length
    ) {
      add('error', railPath, 'must point at one of the rail stages');
      return;
    }
    if (scene.railStage < lastRailStage) {
      add('warning', railPath, 'moves the rail backwards; the journey should only advance');
    }
    lastRailStage = scene.railStage;
  });

  /**
   * Structural, so the same rules cover visual and audio assets without either
   * scene module having to know about this one.
   */
  const validateLicensedAsset = (asset: LicensedAssetLike | undefined, path: string) => {
    if (!asset?.src?.trim()) {
      add('error', `${path}.src`, 'is required');
      return;
    }
    checkAsset(asset.src, `${path}.src`);
    if (!asset.credit?.trim()) {
      add('error', `${path}.credit`, 'is required for media traceability');
    }
    if (!asset.license?.trim()) {
      add('error', `${path}.license`, 'is required for media traceability');
    }
  };

  spec.scenes.forEach((scene, index) => {
    const path = `scenes[${index}]`;
    if (scene.type === 'image') {
      validateLicensedAsset(scene.image, `${path}.image`);
      if (scene.image?.fit !== undefined && !['cover', 'contain'].includes(scene.image.fit)) {
        add('error', `${path}.image.fit`, 'must be "cover" or "contain"');
      }
    }
    if (scene.type === 'videoClip') {
      validateLicensedAsset(scene.clip, `${path}.clip`);
      if (scene.clip?.fit !== undefined && !['cover', 'contain'].includes(scene.clip.fit)) {
        add('error', `${path}.clip.fit`, 'must be "cover" or "contain"');
      }
      if (
        scene.clip?.trimBefore !== undefined &&
        (!Number.isInteger(scene.clip.trimBefore) || scene.clip.trimBefore < 0)
      ) {
        add('error', `${path}.clip.trimBefore`, 'must be a non-negative integer');
      }
      if (
        scene.clip?.volume !== undefined &&
        (!Number.isFinite(scene.clip.volume) ||
          scene.clip.volume < 0 ||
          scene.clip.volume > 1)
      ) {
        add('error', `${path}.clip.volume`, 'must be between 0 and 1');
      }
    }
  });

  if (spec.audio) checkInsidePublic(spec.audio, 'audio');
  if (spec.captionTimings) {
    checkInsidePublic(spec.captionTimings, 'captionTimings');
  }
  const validateAudioAsset = (asset: LicensedAssetLike | undefined, path: string) => {
    validateLicensedAsset(asset, path);
    if (
      asset?.volume !== undefined &&
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
    for (const field of ['trimBefore', 'fadeInFrames', 'fadeOutFrames'] as const) {
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
    for (const field of ['attackFrames', 'releaseFrames'] as const) {
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

export type CollectionEntry = {
  spec: VideoSpec;
  channel: ChannelProfile | undefined;
};

export type CollectionResult = {
  ref: string;
  kind: 'video' | 'style-guide';
  issues: EditorialIssue[];
};

export const validateCollection = (
  entries: CollectionEntry[],
  options: ValidateOptions = {},
): CollectionResult[] => {
  const results: CollectionResult[] = [];
  const refs = new Set<string>();
  for (const {spec, channel} of entries) {
    const ref = refOf(spec);
    const issues = validateSpec(spec, channel, options);
    if (refs.has(ref)) {
      issues.push(issue('error', 'slug', `duplicate video ref "${ref}"`));
    }
    refs.add(ref);
    results.push({ref, kind: spec.kind ?? 'video', issues});
  }
  return results;
};
