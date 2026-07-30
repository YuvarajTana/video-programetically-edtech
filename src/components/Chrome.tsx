import {useEffect, useState} from 'react';
import {
  AbsoluteFill,
  spring,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from 'remotion';
import {space, tint, type} from '../design/tokens';
import {useLayout} from '../design/formats';
import {useChannel} from '../channels';
import {useTheme} from '../themes';
import type {VideoSpec} from '../types';
import {sceneOffsets} from '../types';

/**
 * Channel furniture that persists across every scene: the handle watermark and
 * a hairline progress bar. Deliberately quiet — it should register without ever
 * competing with the content.
 */
export const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const channel = useChannel();
  const {accents, chrome, color, font} = useTheme();
  const pct = Math.min(1, frame / Math.max(1, durationInFrames - 1));

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {channel.handle ? (
        <div
          style={{
            position: 'absolute',
            top: layout.safe * 0.5,
            right: layout.safe * 0.6,
            fontFamily: font.mono,
            fontSize: type.nano,
            letterSpacing: 3,
            color: tint(color.muted, 'strong'),
            textTransform: 'uppercase',
          }}
        >
          {channel.handle}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: chrome.progressHeight,
          width: `${pct * 100}%`,
          backgroundColor: accents.primary,
          opacity: chrome.progressOpacity,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Burned-in caption bar. Most portrait social video is watched muted, so the narration line
 * doubles as the on-screen caption rather than being VO-only.
 */
type TimedWord = {text: string; start: number; end: number};
type TimedCue = {
  index: number;
  start: number;
  end: number;
  text: string;
  words: TimedWord[];
};
type WordTimingFile = {
  schemaVersion: 1;
  durationSeconds: number;
  cues: TimedCue[];
};

const timingCache = new Map<string, WordTimingFile>();
const timingRequests = new Map<string, Promise<WordTimingFile>>();

const loadTimings = (path: string) => {
  const cached = timingCache.get(path);
  if (cached) return Promise.resolve(cached);
  const pending = timingRequests.get(path);
  if (pending) return pending;

  const request = fetch(staticFile(path))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
      }
      return response.json() as Promise<WordTimingFile>;
    })
    .then((data) => {
      if (data.schemaVersion !== 1 || !Array.isArray(data.cues)) {
        throw new Error(`Invalid word timing file: ${path}`);
      }
      timingCache.set(path, data);
      timingRequests.delete(path);
      return data;
    });
  timingRequests.set(path, request);
  return request;
};

const useWordTimings = (path?: string) => {
  const {cancelRender, continueRender, delayRender} = useDelayRender();
  const [data, setData] = useState<WordTimingFile | null>(() =>
    path ? (timingCache.get(path) ?? null) : null,
  );
  const [handle] = useState(() =>
    path && !timingCache.has(path)
      ? delayRender(`Loading word captions: ${path}`)
      : null,
  );

  useEffect(() => {
    if (!path || data) return;
    loadTimings(path)
      .then((loaded) => {
        setData(loaded);
        if (handle !== null) continueRender(handle);
      })
      .catch(cancelRender);
  }, [cancelRender, continueRender, data, handle, path]);

  return data;
};

export const Captions: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const layout = useLayout();
  const {accents, chrome, color, font} = useTheme();
  const timings = useWordTimings(spec.captionTimings);
  const seconds = frame / fps;
  const cue = timings?.cues.find(
    (candidate) => seconds >= candidate.start && seconds < candidate.end,
  );
  const activeWordIndex = cue?.words.findIndex(
    (word) => seconds >= word.start && seconds < word.end,
  );
  const wordsPerPage = layout.isPortrait ? 5 : 8;
  const pageStart =
    activeWordIndex !== undefined && activeWordIndex >= 0
      ? Math.floor(activeWordIndex / wordsPerPage) * wordsPerPage
      : 0;
  const visibleWords = cue?.words.slice(
    pageStart,
    pageStart + wordsPerPage,
  );
  const fallbackScene = sceneOffsets(spec).find(
    ({start, end}) => frame >= start && frame < end,
  )?.scene;
  const text = timings ? cue?.text : fallbackScene?.narration;

  if (!text) return null;
  const isLongPortraitCaption =
    layout.isPortrait && !visibleWords && text.length > 140;

  return (
    <div
      style={{
        position: 'absolute',
        left: layout.safe,
        right: layout.safe,
        // Portrait platform controls occupy the lowest part of the frame.
        // Keep captions above that region instead of merely inside the
        // composition's structural safe area.
        bottom: layout.isPortrait ? layout.safe * 1.6 : layout.safe * 0.9,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: layout.isLandscape ? layout.contentW * 0.7 : layout.contentW,
          padding: `${space.sm}px ${space.lg}px`,
          borderRadius: chrome.captionRadius,
          backgroundColor: tint(color.bgDeep, 'strong'),
          border: `2px solid ${color.line}`,
          fontFamily: font.body,
          fontWeight: 600,
          fontSize: isLongPortraitCaption ? type.micro : type.small,
          lineHeight: 1.35,
          color: color.text,
          textAlign: 'center',
        }}
      >
        {visibleWords && activeWordIndex !== undefined ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: `${space.xs}px ${space.sm}px`,
            }}
          >
            {visibleWords.map((word, index) => {
              const absoluteIndex = pageStart + index;
              const active = absoluteIndex === activeWordIndex;
              const spoken = absoluteIndex < activeWordIndex;
              const wordFrame = Math.max(0, frame - Math.round(word.start * fps));
              const pop = active
                ? spring({
                    frame: wordFrame,
                    fps,
                    config: {damping: 18, stiffness: 260, mass: 0.7},
                  })
                : 0;
              return (
                <span
                  key={`${word.start}-${word.text}`}
                  style={{
                    display: 'inline-block',
                    padding: `${space.xs * 0.35}px ${space.xs}px`,
                    borderRadius: chrome.captionRadius * 0.45,
                    backgroundColor: active
                      ? tint(accents.primary, 'soft')
                      : 'transparent',
                    color: active
                      ? accents.primary
                      : spoken
                        ? color.text
                        : color.muted,
                    transform: `scale(${active ? 0.96 + pop * 0.08 : 1})`,
                  }}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        ) : (
          text
        )}
      </div>
    </div>
  );
};
