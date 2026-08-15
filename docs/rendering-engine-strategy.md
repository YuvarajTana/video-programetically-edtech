# Rendering engine strategy

## Decision

Remotion remains the primary production renderer for Video Kit. HyperFrames is an
optional experimental sidecar for self-contained, effect-heavy HTML scenes. A
single delivery must have one timeline owner; the two engines are not mixed
inside the same live timeline.

## Why Remotion stays primary

- The Studio preview, `VideoSpec`, themes, caption timing, narration mix,
  deliveries, QA, packaging, and job executor already share one React/Remotion
  composition.
- Typed React components suit reusable educational primitives such as semantic
  shapes, code-line execution, charts, captions, and locale-aware typography.
- Preview and final render receive the same immutable input props, which keeps
  browser review aligned with the packaged MP4.
- Existing registered videos and CLI workflows continue without conversion.

## Where HyperFrames can help

HyperFrames is a good fit for isolated HTML-native motion experiments, especially
when an animation needs GSAP, Lottie, Three.js, Anime.js, WAAPI, or another of its
seekable adapters. Those experiments should cross into the main pipeline at a
clear asset boundary:

1. Render the HyperFrames scene as a deterministic local video asset.
2. Record its source, duration, dimensions, frame rate, and checksum in the
   artifact manifest.
3. Import the asset into a Remotion scene as normal media.
4. Let Remotion remain responsible for narration, captions, soundtrack,
   deliveries, QA, and packaging.

This keeps one audio clock and one delivery timeline. It also avoids maintaining
duplicate implementations of captions, locale fonts, render progress, retries,
and packaging.

## Future adapter boundary

If HyperFrames scenes become common, add a job-level `CompositionRenderer`
interface with `remotion` and `hyperframes` implementations. Renderer selection
belongs to an immutable revision or self-contained scene asset, never to an
arbitrary request path or shell command. Both implementations must return the
same artifact metadata and pass the same FFmpeg QA stage.

## Motion vocabulary now supported in Remotion

- Shapes: circle, square, rounded square, diamond, triangle, hexagon, pill,
  ring, database, and document.
- Deterministic idle motion: float, rotate, wobble, and breathe.
- Timed actions: reveal, draw, highlight, hide, pulse, travel, spin, and bounce.
- Code tracing: narration-anchored `focus-line` and `execute-line` actions with
  optional notes and runtime output.

All motion is derived from the current frame. No wall clock, random number, or
mutable playback state is used, so seeking and rendering remain reproducible.
