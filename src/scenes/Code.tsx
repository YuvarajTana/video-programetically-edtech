import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Frame} from '../components/Frame';
import {Card} from '../components/Card';
import {Small} from '../components/Text';
import {radius, space, tint, type} from '../design/tokens';
import {EASE, fadeUp} from '../design/anim';
import {useLayout} from '../design/formats';
import {useTheme} from '../themes';
import type {CodeScene} from '../types';

const LINE_H = 1.72;

/**
 * Code with a spotlight. Lines type in, then each `focus` group dims everything
 * else and pins a note beside it — which is how you explain a snippet on video
 * without the viewer having to hunt for the line you are talking about.
 */
export const Code: React.FC<{scene: CodeScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const a = accents[scene.accent ?? 'success'];

  const revealPer = 3;
  const revealEnd = scene.lines.length * revealPer + 10;
  const focus = scene.focus ?? [];
  const focusSpan = focus.length
    ? Math.max(24, Math.floor((durationInFrames - revealEnd - 8) / focus.length))
    : 0;

  const activeFocus = focus.length
    ? Math.min(focus.length - 1, Math.floor((frame - revealEnd) / focusSpan))
    : -1;
  const current = frame >= revealEnd && activeFocus >= 0 ? focus[activeFocus] : null;

  const fontSize = layout.isLandscape ? type.small : 34;

  return (
    <Frame kicker={scene.kicker ?? scene.lang ?? 'code'} title={scene.title} accent={scene.accent ?? 'success'}>
      <Card
        style={{
          width: layout.isLandscape ? layout.contentW * 0.82 : layout.contentW,
          padding: 0,
          overflow: 'hidden',
          ...fadeUp(frame, 0, 22, 30),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space.sm,
            padding: `${space.sm}px ${space.lg}px`,
            borderBottom: `2px solid ${color.line}`,
            backgroundColor: color.surfaceHi,
          }}
        >
          <div style={{width: 12, height: 12, borderRadius: 999, backgroundColor: a}} />
          <span
            style={{
              fontFamily: font.mono,
              fontSize: type.nano,
              letterSpacing: 2,
              color: color.muted,
            }}
          >
            {scene.filename ?? scene.lang ?? 'snippet'}
          </span>
        </div>

        <div style={{padding: `${space.lg}px ${space.md}px`}}>
          {scene.lines.map((line, i) => {
            const n = i + 1;
            const lit = current ? current.lines.includes(n) : true;
            const appear = interpolate(frame, [i * revealPer, i * revealPer + 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: EASE,
            });
            return (
              <div
                key={`${n}-${line}`}
                style={{
                  display: 'flex',
                  gap: space.md,
                  padding: `2px ${space.md}px`,
                  borderRadius: radius.sm,
                  backgroundColor: current && lit ? tint(a, 'faint') : 'transparent',
                  borderLeft: `4px solid ${current && lit ? a : 'transparent'}`,
                  opacity: appear * (current ? (lit ? 1 : 0.28) : 1),
                }}
              >
                <span
                  style={{
                    fontFamily: font.mono,
                    fontSize,
                    lineHeight: LINE_H,
                    color: color.line,
                    minWidth: 46,
                    textAlign: 'right',
                  }}
                >
                  {n}
                </span>
                <span
                  style={{
                    fontFamily: font.mono,
                    fontSize,
                    lineHeight: LINE_H,
                    color: current && lit ? color.text : color.textDim,
                    whiteSpace: 'pre',
                  }}
                >
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {current?.note ? (
        <div
          style={{
            marginTop: space.lg,
            display: 'flex',
            alignItems: 'center',
            gap: space.sm,
            maxWidth: layout.isLandscape ? layout.contentW * 0.7 : layout.contentW,
          }}
        >
          <div style={{width: 6, height: 34, borderRadius: 3, backgroundColor: a}} />
          <Small style={{color: color.text, fontSize: type.small}}>{current.note}</Small>
        </div>
      ) : null}
    </Frame>
  );
};
