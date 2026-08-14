import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chaptersFor, toChapterText} from '../scripts/chapters-lib.mjs';

const scene = (durationInFrames, extra = {}) => ({
  type: 'steps',
  durationInFrames,
  ...extra,
});

test('short videos produce no chapter list', () => {
  const spec = {scenes: [scene(300), scene(300)]}; // 20s < 3 × 10s minimum
  assert.deepEqual(chaptersFor(spec, 30), []);
});

test('three long scenes become three chapters starting at 00:00', () => {
  const spec = {
    scenes: [
      scene(300, {title: 'Intro'}),
      scene(300, {title: 'Middle'}),
      scene(300, {type: 'outro'}),
    ],
  };
  const chapters = chaptersFor(spec, 30);
  assert.equal(chapters.length, 3);
  assert.deepEqual(
    chapters.map((chapter) => chapter.timestamp),
    ['00:00', '00:10', '00:20'],
  );
  assert.deepEqual(
    chapters.map((chapter) => chapter.title),
    ['Intro', 'Middle', 'Recap'],
  );
});

test('scenes shorter than ten seconds merge into the previous chapter', () => {
  const spec = {
    scenes: [
      scene(300, {title: 'One'}),
      scene(60, {title: 'Blip'}), // starts 10s in, but the next boundary is too close
      scene(300, {title: 'Two'}),
      scene(300, {title: 'Three'}),
    ],
  };
  const chapters = chaptersFor(spec, 30);
  assert.deepEqual(
    chapters.map((chapter) => chapter.title),
    ['One', 'Blip', 'Three'],
  );
  // Every chapter keeps the 10s minimum spacing.
  for (let i = 1; i < chapters.length; i++) {
    assert.ok(chapters[i].startSeconds - chapters[i - 1].startSeconds >= 10);
  }
});

test('chapterTitle overrides the derived title', () => {
  const spec = {
    scenes: [
      scene(300, {title: 'Ignored', chapterTitle: 'Chosen'}),
      scene(300, {title: 'B'}),
      scene(300, {title: 'C'}),
    ],
  };
  assert.equal(chaptersFor(spec, 30)[0].title, 'Chosen');
});

test('toChapterText renders YouTube-ready lines', () => {
  const spec = {
    scenes: [scene(300, {title: 'A'}), scene(300, {title: 'B'}), scene(300, {title: 'C'})],
  };
  assert.equal(toChapterText(chaptersFor(spec, 30)), '00:00 A\n00:10 B\n00:20 C\n');
  assert.equal(toChapterText([]), '');
});
