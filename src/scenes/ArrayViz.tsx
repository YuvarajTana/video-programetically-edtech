import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Frame} from '../components/Frame';
import {radius, space, tint, type} from '../design/tokens';
import {EASE, EASE_IO} from '../design/anim';
import {useLayout} from '../design/formats';
import {useTheme} from '../themes';
import {DEFAULT_TEMPO, buildTrace, stepAt} from '../lib/sortTrace';
import type {ArrayVizScene} from '../types';

const INTRO = 26;
const HOLD = 34;

/**
 * Algorithm visualisation.
 *
 * The scene time-scales the generated trace to whatever duration the spec asks
 * for, so you change `durationInFrames` and the animation re-paces itself rather
 * than running off the end. Colour is doing the teaching here: coral is what the
 * algorithm is looking at right now, amber is what it is holding on to, teal is
 * what it will never touch again.
 */
export const ArrayViz: React.FC<{scene: ArrayVizScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const {accents, color, font} = useTheme();

  const trace = buildTrace(scene.algorithm, scene.values, scene.tempo ?? DEFAULT_TEMPO);

  // Fit the trace to the scene window instead of hoping the tempo happens to fit.
  const window = Math.max(1, durationInFrames - INTRO - HOLD);
  const scale = window / trace.total;
  const traceFrame = (frame - INTRO) / scale;
  const inTrace = traceFrame >= 0 && traceFrame < trace.total;
  const done = traceFrame >= trace.total;

  const step = stepAt(trace, Math.max(0, Math.min(traceFrame, trace.total - 1)));
  const sub = Math.max(0, traceFrame - step.start);

  const n = scene.values.length;
  const boxW = layout.isLandscape ? layout.contentW * 0.62 : layout.contentW;
  const boxH = layout.isLandscape ? layout.contentH * 0.46 : layout.contentH * 0.4;
  const gapRatio = 0.36;
  const barW = boxW / (n + (n - 1) * gapRatio);
  const gap = barW * gapRatio;
  const maxV = Math.max(...scene.values);
  const slotX = (k: number) => k * (barW + gap);
  const barH = (v: number) => boxH * 0.2 + (v / maxV) * boxH * 0.8;

  const arr = traceFrame < 0 ? scene.values : done ? trace.sorted : step.arr;
  const nextArr = traceFrame < 0 || done ? arr : step.next;

  // On a compare the "held" value flips partway through, so the decision reads
  // as a decision rather than appearing to have been made already.
  const keep =
    inTrace && step.kind === 'compare' && step.keep !== null
      ? sub < step.duration * 0.45
        ? step.keep
        : step.check.some((c) => arr[c] < arr[step.keep as number])
          ? step.check[0]
          : step.keep
      : step.keep;

  const swapT =
    step.kind === 'swap' && inTrace
      ? interpolate(sub, [0, step.duration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_IO,
        })
      : 0;

  const roleOf = (slot: number) => {
    if (!inTrace) return done ? 'locked' : 'idle';
    if (slot < step.lockedLeft) return 'locked';
    if (step.lockedRight > 0 && slot >= n - step.lockedRight) return 'locked';
    if (step.kind === 'lock' && slot === step.lockSlot) return 'locked';
    if (slot === keep) return 'keep';
    if (step.check.includes(slot)) return 'check';
    return 'idle';
  };

  const roleColor: Record<string, string> = {
    locked: accents.success,
    keep: accents.primary,
    check: accents.attention,
    idle: color.muted,
  };

  const note = traceFrame < 0
    ? `${n} values, in no particular order.`
    : done
      ? 'Sorted — every slot settled.'
      : step.note;
  const noteColor = traceFrame < 0
    ? color.muted
    : done
      ? accents.success
      : step.kind === 'lock'
        ? accents.success
        : step.kind === 'swap'
          ? accents.primary
          : color.text;

  return (
    <Frame
      kicker={`${scene.algorithm} sort`}
      title={scene.title ?? `Pass ${inTrace ? step.pass : done ? trace.passes : 1} of ${trace.passes}`}
      accent="primary"
    >
      <div
        style={{
          fontFamily: font.mono,
          fontWeight: 700,
          fontSize: layout.isLandscape ? 44 : 50,
          color: noteColor,
          textAlign: 'center',
          minHeight: 70,
          marginBottom: space.lg,
        }}
      >
        {note}
      </div>

      <div style={{position: 'relative', width: boxW, height: boxH + 76}}>
        {arr.map((v) => {
          const from = arr.indexOf(v);
          const to = nextArr.indexOf(v);
          const moving = from !== to;
          const x = interpolate(swapT, [0, 1], [slotX(from), slotX(to)]);
          const lift = moving && from > to ? -Math.sin(swapT * Math.PI) * boxH * 0.26 : 0;
          const role = roleOf(from);
          const col = roleColor[role];

          const rise = interpolate(frame, [from * 4, from * 4 + 22], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EASE,
          });
          const h = barH(v) * rise;

          const pop =
            role === 'check'
              ? interpolate(sub, [0, 4, 10], [1, 1.06, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  output: 'perceptual-scale',
                })
              : 1;

          return (
            <div
              key={v}
              style={{
                position: 'absolute',
                left: x,
                top: boxH - h + lift,
                width: barW,
                height: h,
                scale: pop,
                borderRadius: radius.md,
                border: `3px solid ${col}`,
                backgroundColor: role === 'idle' ? color.surface : tint(col, 'soft'),
                boxShadow: role === 'idle' ? 'none' : `0 0 42px ${tint(col, 'faint')}`,
                display: 'flex',
                justifyContent: 'center',
                paddingTop: space.sm,
              }}
            >
              <span
                style={{
                  fontFamily: font.mono,
                  fontWeight: 700,
                  fontSize: Math.min(barW * 0.42, 48),
                  color: role === 'idle' ? color.text : col,
                }}
              >
                {v}
              </span>
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: -12,
            top: boxH + 4,
            width: boxW + 24,
            height: 3,
            backgroundColor: color.line,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: space.md,
          marginTop: space.lg,
          width: layout.isLandscape ? boxW : layout.contentW,
        }}
      >
        {[
          {k: 'comparisons', v: done ? trace.comparisons : inTrace ? step.comparisons : 0},
          {k: 'swaps', v: done ? trace.swaps : inTrace ? step.swaps : 0},
        ].map((s) => (
          <div
            key={s.k}
            style={{
              flex: 1,
              padding: `${space.md}px ${space.lg}px`,
              borderRadius: radius.lg,
              border: `2px solid ${color.line}`,
              backgroundColor: color.surface,
            }}
          >
            <div
              style={{
                fontFamily: font.mono,
                fontSize: type.nano,
                letterSpacing: 3,
                color: color.muted,
                textTransform: 'uppercase',
              }}
            >
              {s.k}
            </div>
            <div style={{fontFamily: font.display, fontWeight: 700, fontSize: 58, color: color.text}}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <div style={{display: 'flex', gap: space.lg, marginTop: space.md}}>
        {[
          {c: accents.attention, t: 'looking at'},
          {c: accents.primary, t: 'holding'},
          {c: accents.success, t: 'settled'},
        ].map((l) => (
          <div key={l.t} style={{display: 'flex', alignItems: 'center', gap: space.xs}}>
            <div style={{width: 18, height: 18, borderRadius: 6, backgroundColor: l.c}} />
            <span style={{fontFamily: font.body, fontWeight: 600, fontSize: type.micro, color: color.muted}}>
              {l.t}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
};
