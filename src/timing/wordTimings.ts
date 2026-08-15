import {useEffect, useMemo, useState} from 'react';
import {staticFile, useDelayRender} from 'remotion';
import type {VideoSpec} from '../types';
import {
  resolveMotionCanvasTiming,
  type WordTimingFile,
} from '../../shared/master-timeline.mjs';

export type {TimedCue, TimedWord, WordTimingFile} from '../../shared/master-timeline.mjs';
export {resolveMotionCanvasTiming} from '../../shared/master-timeline.mjs';

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

export const useWordTimings = (path?: string) => {
  const {cancelRender, continueRender, delayRender} = useDelayRender();
  const [data, setData] = useState<WordTimingFile | null>(() =>
    path ? (timingCache.get(path) ?? null) : null,
  );
  const [handle] = useState(() =>
    path && !timingCache.has(path)
      ? delayRender(`Loading word timings: ${path}`)
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

export const useResolvedMotionCanvasSpec = (
  spec: VideoSpec,
  timings: WordTimingFile | null,
) => useMemo(() => resolveMotionCanvasTiming(spec, timings), [spec, timings]);
