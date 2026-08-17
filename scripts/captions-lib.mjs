/**
 * Derives subtitles and a voiceover script from the same narration lines that
 * are burned into the frame, so the three can never drift apart.
 */

const pad = (n, w = 2) => String(n).padStart(w, '0');

const timecode = (frames, fps) => {
  const total = frames / fps;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
};

const offsets = (spec) => {
  let at = 0;
  return spec.scenes.map((scene, index) => {
    const start = at;
    at += scene.durationInFrames;
    return {index, start, end: at, scene};
  });
};

export const toSrt = (spec, fps = 30) => {
  const cues = offsets(spec).filter((o) => o.scene.narration);
  return (
    cues
      .map((o, i) =>
        [
          i + 1,
          `${timecode(o.start, fps)} --> ${timecode(o.end, fps)}`,
          o.scene.narration,
          '',
        ].join('\n'),
      )
      .join('\n') + '\n'
  );
};

const countWords = (text = '') => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Per-scene reading pace, flagged against the channel's WPM band. "fast" lines
 * need rewriting before recording; "slow" is only a problem on scenes where
 * nothing else moves.
 */
const paceCell = (scene, fps, band) => {
  if (!scene.narration?.trim()) return '—';
  const seconds = scene.durationInFrames / fps;
  if (seconds <= 0) return '—';
  const wps = countWords(scene.narration) / seconds;
  const wpm = wps * 60;
  let flag = '';
  if (band?.max && wpm > band.max) flag = ' ⚠ fast';
  else if (band?.min && wpm < band.min) flag = ' · slow';
  return `${wps.toFixed(1)} w/s${flag}`;
};

export const toVoScript = (
  spec,
  fps = 30,
  renderPath = `out/${spec.channel}/${spec.slug}/renders/portrait.mp4`,
  paceBand = undefined,
) => {
  const rows = offsets(spec).map((o) => {
    const secs = (o.scene.durationInFrames / fps).toFixed(1);
    const at = (o.start / fps).toFixed(1);
    return `| ${o.index + 1} | ${o.scene.type} | ${at}s | ${secs}s | ${paceCell(o.scene, fps, paceBand)} | ${o.scene.narration ?? '—'} |`;
  });

  return [
    `# ${spec.title} — voiceover script`,
    '',
    spec.summary ? `> ${spec.summary}` : '',
    '',
    paceBand
      ? `Target pace: ${(paceBand.min ?? 0) / 60 > 0 ? `${(paceBand.min / 60).toFixed(1)}–` : 'up to '}${(paceBand.max / 60).toFixed(1)} words/second. Fix every ⚠ before recording.`
      : '',
    '',
    '| # | scene | starts | length | pace | line |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Mux a recorded voiceover',
    '',
    '```bash',
    `ffmpeg -i ${renderPath} -i vo.mp3 \\`,
    '  -c:v copy -c:a aac -b:a 192k -shortest \\',
    `  out/${spec.channel}/${spec.slug}/renders/portrait.vo.mp4`,
    '```',
    '',
  ].join('\n');
};
