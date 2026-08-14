import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {drawWidth, fadeUp, pop, progress, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '../design/tokens';
import {useTheme} from '../themes';
import type {NumberLineScene} from '../types';

/**
 * A number line with ticks, highlighted values, and an optional animated hop —
 * the Learn kit's way of showing counting, addition, and distance.
 */
export const NumberLine: React.FC<{scene: NumberLineScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();

  const step = scene.step ?? 1;
  const lineW = layout.contentW * (layout.isLandscape ? 0.86 : 0.92);
  const x = (value: number) => ((value - scene.min) / (scene.max - scene.min)) * lineW;

  const ticks: number[] = [];
  for (let value = scene.min; value <= scene.max + 1e-9; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }

  // The hop starts once ticks and marks have settled.
  const jumpStart = stagger(scene.marks.length, 8, 34);
  const jumpP = scene.jump ? progress(frame, jumpStart, jumpStart + 34) : 0;
  const arcH = layout.isLandscape ? 150 : 130;

  return (
    <Frame
      kicker={scene.kicker}
      title={scene.title}
      accent={scene.accent ?? 'primary'}
      style={{paddingBottom: layout.isPortrait ? 210 : 0}}
    >
      <div style={{position: 'relative', width: lineW, height: arcH * 2 + 140}}>
        {/* Spine and ticks. */}
        <div
          style={{
            position: 'absolute',
            top: arcH + 40,
            left: 0,
            height: stroke.thin,
            width: drawWidth(frame, 6, lineW, 30),
            borderRadius: radius.pill,
            backgroundColor: color.line,
          }}
        />
        {ticks.map((value, index) => (
          <div key={value} style={{position: 'absolute', top: arcH + 40, left: x(value)}}>
            <div
              style={{
                position: 'absolute',
                top: -9,
                left: -stroke.hair / 2,
                width: stroke.hair,
                height: 18,
                backgroundColor: color.line,
                ...fadeUp(frame, stagger(index, 2, 10), 12, 6),
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 22,
                left: 0,
                transform: 'translateX(-50%)',
                fontFamily: font.mono,
                fontWeight: 700,
                fontSize: layout.isLandscape ? type.small : type.micro,
                color: color.textDim,
                ...fadeUp(frame, stagger(index, 2, 12), 12, 6),
              }}
            >
              {value}
            </div>
          </div>
        ))}

        {/* Highlighted values. */}
        {scene.marks.map((mark, index) => {
          const accent = accents[mark.accent ?? scene.accent ?? 'primary'];
          const at = stagger(index, 8, 34);
          return (
            <div
              key={`${mark.value}-${index}`}
              style={{position: 'absolute', top: arcH + 40, left: x(mark.value)}}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -13,
                  left: -13,
                  width: 26,
                  height: 26,
                  borderRadius: radius.pill,
                  backgroundColor: accent,
                  border: `${stroke.thin}px solid ${color.bg}`,
                  boxShadow: `0 0 0 ${stroke.hair}px ${accent}66`,
                  ...pop(frame, at, 18, 0.4),
                }}
              />
              {mark.label ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 52,
                    left: 0,
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    padding: `4px ${space.sm}px`,
                    borderRadius: radius.pill,
                    backgroundColor: tint(accent, 'faint'),
                    fontFamily: font.body,
                    fontWeight: 750,
                    fontSize: type.micro,
                    color: accent,
                    ...pop(frame, at + 6, 16, 0.7),
                  }}
                >
                  {mark.label}
                </div>
              ) : null}
            </div>
          );
        })}

        {/* The hop. */}
        {scene.jump ? (
          <>
            <svg
              style={{position: 'absolute', top: 0, left: 0, overflow: 'visible'}}
              width={lineW}
              height={arcH + 40}
            >
              <path
                d={`M ${x(scene.jump.from)} ${arcH + 40} Q ${
                  (x(scene.jump.from) + x(scene.jump.to)) / 2
                } ${arcH + 40 - arcH * 2} ${x(scene.jump.to)} ${arcH + 40}`}
                fill="none"
                stroke={accents[scene.jump.accent ?? scene.accent ?? 'primary']}
                strokeWidth={stroke.thin}
                strokeDasharray="2 22"
                strokeLinecap="round"
                opacity={jumpP > 0 ? 0.75 : 0}
              />
            </svg>
            {jumpP > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  top:
                    arcH +
                    40 -
                    arcH * 2 * jumpP * (1 - jumpP) * 2 -
                    17,
                  left:
                    x(scene.jump.from) +
                    (x(scene.jump.to) - x(scene.jump.from)) * jumpP -
                    17,
                  width: 34,
                  height: 34,
                  borderRadius: radius.pill,
                  backgroundColor: accents[scene.jump.accent ?? scene.accent ?? 'primary'],
                  border: `${stroke.thin}px solid ${color.bg}`,
                  boxShadow: `0 8px 30px ${
                    accents[scene.jump.accent ?? scene.accent ?? 'primary']
                  }55`,
                }}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </Frame>
  );
};
