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

export const toVoScript = (spec, fps = 30) => {
  const rows = offsets(spec).map((o) => {
    const secs = (o.scene.durationInFrames / fps).toFixed(1);
    const at = (o.start / fps).toFixed(1);
    return `| ${o.index + 1} | ${o.scene.type} | ${at}s | ${secs}s | ${o.scene.narration ?? '—'} |`;
  });

  return [
    `# ${spec.title} — voiceover script`,
    '',
    spec.summary ? `> ${spec.summary}` : '',
    '',
    '| # | scene | starts | length | line |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Mux a recorded voiceover',
    '',
    '```bash',
    `ffmpeg -i out/${spec.slug}.reel.mp4 -i vo.mp3 \\`,
    '  -c:v copy -c:a aac -b:a 192k -shortest \\',
    `  out/${spec.slug}.reel.vo.mp4`,
    '```',
    '',
  ].join('\n');
};
