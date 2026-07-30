import {interpolate, useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {Card} from '../components/Card';
import {space, type} from '../design/tokens';
import {fadeUp} from '../design/anim';
import {useLayout} from '../design/formats';
import {useTheme} from '../themes';
import type {TerminalScene} from '../types';

const CPS = 1.6; // characters per frame while "typing"

export const Terminal: React.FC<{scene: TerminalScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const a = accents[scene.accent ?? 'success'];
  const fontSize = layout.isLandscape ? type.small : 32;

  // Walk the entries and give each a start frame based on how long the one
  // before it took to type and print.
  let cursor = 12;
  const timed = scene.entries.map((e) => {
    const start = cursor;
    const typeFrames = e.cmd ? Math.ceil(e.cmd.length / CPS) : 0;
    const outFrames = (e.out?.length ?? 0) * 6;
    cursor += typeFrames + outFrames + 10;
    return {...e, start, typeFrames};
  });

  return (
    <Frame kicker="terminal" title={scene.title} accent={scene.accent ?? 'success'}>
      <Card
        style={{
          width: layout.isLandscape ? layout.contentW * 0.8 : layout.contentW,
          padding: 0,
          overflow: 'hidden',
          ...fadeUp(frame, 0, 20, 30),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space.xs,
            padding: `${space.sm}px ${space.lg}px`,
            borderBottom: `2px solid ${color.line}`,
            backgroundColor: color.surfaceHi,
          }}
        >
          {[accents.attention, accents.primary, accents.success].map((c) => (
            <div key={c} style={{width: 12, height: 12, borderRadius: 999, backgroundColor: c}} />
          ))}
          <span
            style={{
              marginLeft: space.sm,
              fontFamily: font.mono,
              fontSize: type.nano,
              color: color.muted,
            }}
          >
            {scene.host ?? 'zsh'}
          </span>
        </div>

        <div style={{padding: space.lg, minHeight: 320}}>
          {timed.map((e, i) => {
            if (frame < e.start) return null;
            const typed = e.cmd
              ? e.cmd.slice(0, Math.floor((frame - e.start) * CPS))
              : '';
            const outStart = e.start + e.typeFrames + 4;
            return (
              <div key={i} style={{marginBottom: space.sm}}>
                {e.cmd ? (
                  <div style={{fontFamily: font.mono, fontSize, lineHeight: 1.6}}>
                    <span style={{color: a}}>$ </span>
                    <span style={{color: color.text}}>{typed}</span>
                    {typed.length < e.cmd.length ? (
                      <span style={{color: a, opacity: frame % 16 < 8 ? 1 : 0}}>▌</span>
                    ) : null}
                  </div>
                ) : null}
                {e.out?.map((line, k) => (
                  <div
                    key={k}
                    style={{
                      fontFamily: font.mono,
                      fontSize,
                      lineHeight: 1.6,
                      color: color.muted,
                      whiteSpace: 'pre',
                      opacity: interpolate(
                        frame,
                        [outStart + k * 6, outStart + k * 6 + 8],
                        [0, 1],
                        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                      ),
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>
    </Frame>
  );
};
