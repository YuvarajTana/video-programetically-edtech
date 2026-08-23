import {createContext, useContext, useMemo} from 'react';
import type {ReactNode} from 'react';
import {useVideoConfig} from 'remotion';
import {ASPECTS, inferAspect, type AspectId} from '@video-kit/core/output';
import {SAFE} from '@video-kit/core/design/tokens';

// The aspect table lives in @video-kit/core so the studio and the Node tooling
// can read dimensions without pulling the renderer in. Re-exported here under
// the older names so composition code keeps one import site.
export {
  ASPECTS as FORMATS,
  ASPECT_IDS as FORMAT_IDS,
  inferAspect,
} from '@video-kit/core/output';
export type {AspectDef as FormatDef, AspectId as FormatId} from '@video-kit/core/output';

export type Layout = {
  /** The aspect this composition was registered for. */
  aspect: AspectId;
  /** @deprecated Use `aspect`. Kept while call sites migrate. */
  format: AspectId;
  width: number;
  height: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isSquare: boolean;
  /** Usable content box after the safe area. */
  contentW: number;
  contentH: number;
  safe: number;
  /** Stack children vertically? True for portrait and square, false for landscape. */
  stack: boolean;
  /** How many cards fit comfortably side by side. */
  columns: number;
};

export const layoutFor = (aspect: AspectId): Layout => {
  const {width, height} = ASPECTS[aspect];
  const isPortrait = height > width;
  const isSquare = height === width;
  const isLandscape = width > height;

  return {
    aspect,
    format: aspect,
    width,
    height,
    isPortrait,
    isLandscape,
    isSquare,
    contentW: width - SAFE * 2,
    contentH: height - SAFE * 2,
    safe: SAFE,
    stack: !isLandscape,
    columns: isLandscape ? 3 : 2,
  };
};

const LayoutContext = createContext<Layout | null>(null);

export const LayoutProvider: React.FC<{aspect: AspectId; children: ReactNode}> = ({
  aspect,
  children,
}) => {
  const value = useMemo(() => layoutFor(aspect), [aspect]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

/**
 * The aspect comes from the composition's input props via LayoutProvider.
 *
 * It used to be reverse-inferred from the rendered width and height, which
 * cannot tell two aspects of the same size apart and reported the 1080x1350
 * carousel as `portrait` to all 28 scene components. Dimension inference
 * remains only as a fallback for a composition mounted outside the provider.
 */
export const useLayout = (): Layout => {
  const provided = useContext(LayoutContext);
  const {width, height} = useVideoConfig();
  return provided ?? layoutFor(inferAspect(width, height));
};
