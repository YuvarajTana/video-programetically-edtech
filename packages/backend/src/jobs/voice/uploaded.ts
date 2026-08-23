import {copyFileSync, writeFileSync} from 'node:fs';
import {captionsFor} from '../captions';
import {fitScenesToDuration} from '@video-kit/core/storyboard';
import type {VoiceProvider} from './types';

/**
 * A narration track the user recorded themselves.
 *
 * Nothing is synthesized: the file is copied in and the scenes are refitted to
 * its length. Word timings are estimated by dividing each scene evenly, which
 * is why the file records its alignment as estimated.
 */
export const uploadedVoiceProvider: VoiceProvider = {
  id: 'uploaded',
  async synthesize({spec, snapshot, repository, files}) {
    const narrationId = snapshot.variant.narrationAssetId;
    if (!narrationId) {
      throw new Error('The project has no uploaded narration track.');
    }
    const narration = await repository.getNarrationAsset(narrationId);
    const narrationPath = await repository.narrationAssetPath(narrationId);
    copyFileSync(narrationPath, files.finalAudio);

    const fps = spec.fps ?? 30;
    fitScenesToDuration(
      spec.scenes,
      Math.max(spec.scenes.length * 15, Math.round(narration.durationSeconds * fps)),
    );

    let cursorSeconds = 0;
    const cues = spec.scenes.flatMap((scene, sceneIndex) => {
      const sceneDuration = scene.durationInFrames / fps;
      const start = cursorSeconds;
      const end = cursorSeconds + sceneDuration;
      cursorSeconds = end;
      if (!scene.narration?.trim()) return [];
      const words = scene.narration.trim().split(/\s+/u);
      const wordDuration = sceneDuration / Math.max(1, words.length);
      return [
        {
          index: sceneIndex + 1,
          start,
          end,
          text: scene.narration,
          words: words.map((text, wordIndex) => ({
            text,
            start: start + wordIndex * wordDuration,
            end: start + (wordIndex + 1) * wordDuration,
          })),
        },
      ];
    });

    writeFileSync(
      files.timingsPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          locale: snapshot.variant.locale,
          durationSeconds: narration.durationSeconds,
          alignment: 'estimated-from-approved-script',
          cues,
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(files.captionsPath, captionsFor(spec));

    return {
      note: `Using uploaded narration “${narration.label}” without voice synthesis.`,
    };
  },
};
