import type {VideoSpec} from '@video-kit/core/spec';

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

const timecode = (frames: number, fps: number) => {
  const total = frames / fps;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  const milliseconds = Math.round((total - Math.floor(total)) * 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
};

/** The SRT cue sheet, which is both a deliverable and the input Kokoro reads. */
export const captionsFor = (spec: VideoSpec) => {
  const fps = spec.fps ?? 30;
  let cursor = 0;
  const cues: string[] = [];
  for (const scene of spec.scenes) {
    const start = cursor;
    cursor += scene.durationInFrames;
    if (!scene.narration) continue;
    cues.push(
      [
        cues.length + 1,
        `${timecode(start, fps)} --> ${timecode(cursor, fps)}`,
        scene.narration,
        '',
      ].join('\n'),
    );
  }
  return `${cues.join('\n')}\n`;
};

/**
 * Strip everything spoken. A music-only production communicates through
 * titles, diagrams and motion, so narration must not leak into captions or
 * the audio mix. Mutates in place, as the caller relies on.
 */
export const configureMusicOnlySpec = (spec: VideoSpec) => {
  if (!spec.soundtrack?.music) {
    throw new Error('Music-only production requires a selected music track.');
  }
  spec.audio = undefined;
  spec.captionTimings = undefined;
  spec.captions = false;
  // Spreading a union member widens it, so map each scene as its own type.
  spec.scenes = spec.scenes.map((scene) => ({...scene, narration: undefined}));
  return spec;
};
