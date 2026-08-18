const humanize = (value = '') =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const sceneTitle = (scene, index) =>
  scene.chapterTitle?.trim() ||
  scene.title?.trim() ||
  scene.kicker?.trim() ||
  (scene.type === 'outro' ? 'Recap' : humanize(scene.id ?? scene.type)) ||
  `Chapter ${index + 1}`;

const timestamp = (seconds) => {
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = whole % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export const chaptersFor = (spec, fps = spec.fps ?? 30) => {
  const minimumSeconds = 10;
  const minimumFrames = minimumSeconds * fps;
  const totalFrames = spec.scenes.reduce(
    (total, scene) => total + scene.durationInFrames,
    0,
  );
  if (totalFrames < minimumFrames * 3) return [];

  let frame = 0;
  const candidates = spec.scenes.map((scene, index) => {
    const startFrame = frame;
    frame += scene.durationInFrames;
    return {
      startFrame,
      title: sceneTitle(scene, index),
    };
  });

  const selected = [candidates[0]];
  for (const candidate of candidates.slice(1)) {
    const previous = selected.at(-1);
    const farEnoughFromPrevious =
      candidate.startFrame - previous.startFrame >= minimumFrames;
    const leavesCompleteFinalChapter =
      totalFrames - candidate.startFrame >= minimumFrames;
    if (farEnoughFromPrevious && leavesCompleteFinalChapter) {
      selected.push(candidate);
    }
  }

  if (selected.length < 3) return [];
  return selected.map((chapter) => ({
    startFrame: chapter.startFrame,
    startSeconds: chapter.startFrame / fps,
    timestamp: timestamp(chapter.startFrame / fps),
    title: chapter.title,
  }));
};

export const toChapterText = (chapters) =>
  chapters.length
    ? `${chapters
        .map((chapter) => `${chapter.timestamp} ${chapter.title}`)
        .join('\n')}\n`
    : '';
