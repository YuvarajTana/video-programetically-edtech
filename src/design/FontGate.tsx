import {useEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender} from 'remotion';
import {FONT_FACE_CSS, FONT_SPECS} from './fontFaces';

/**
 * Holds the render until every brand face is rasterised, then releases it.
 *
 * The handle deliberately lives in useState rather than at module scope. A
 * module-scope delayRender() is created during bundle evaluation, outside the
 * component lifecycle — that renders stills correctly but times out on a video
 * render. Tying the handle to the component ties it to the page that actually
 * produces the frames.
 */
export const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [handle] = useState(() => delayRender('Loading brand fonts'));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec)))
      .then(() => document.fonts.ready)
      .then(() => {
        if (cancelled) return;
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err as Error));
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return (
    <>
      <style>{FONT_FACE_CSS}</style>
      {ready ? children : null}
    </>
  );
};
