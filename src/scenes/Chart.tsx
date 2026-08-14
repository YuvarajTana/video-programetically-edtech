import {interpolate, useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {EASE, fadeUp, pop, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '../design/tokens';
import {useTheme} from '../themes';
import type {ChartScene} from '../types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * A column chart for magnitude comparisons. Bars deliberately share one hue —
 * identity is carried by the label under each bar, never by color alone — and
 * `highlightIndex` mutes everything except the bar the narration is about.
 */
export const Chart: React.FC<{scene: ChartScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();

  const max = Math.max(...scene.bars.map((bar) => bar.value), 1);
  const plotH = layout.isLandscape ? 520 : 620;
  const plotW = layout.isLandscape ? layout.contentW * 0.86 : layout.contentW * 0.94;
  const sceneAccent = accents[scene.accent ?? 'primary'];

  return (
    <Frame
      kicker={scene.kicker}
      title={scene.title}
      accent={scene.accent ?? 'primary'}
      style={{paddingBottom: layout.isPortrait ? 210 : 0}}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: layout.isLandscape ? space.xl : space.md,
          width: plotW,
          height: plotH,
          borderBottom: `${stroke.hair}px solid ${color.line}`,
        }}
      >
        {scene.bars.map((bar, index) => {
          const at = stagger(index, 10, 12);
          const muted =
            scene.highlightIndex !== undefined && index !== scene.highlightIndex;
          const barColor = muted
            ? color.muted
            : accents[bar.accent ?? scene.accent ?? 'primary'];
          const fullH = Math.max((bar.value / max) * (plotH - 130), 14);
          const h = interpolate(frame, [at, at + 30], [0, fullH], {
            ...clamp,
            easing: EASE,
          });
          return (
            <div
              key={bar.label}
              style={{
                flex: 1,
                maxWidth: layout.isLandscape ? 240 : 220,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: space.sm,
                height: '100%',
              }}
            >
              <div
                style={{
                  fontFamily: font.mono,
                  fontWeight: 800,
                  fontSize: layout.isLandscape ? type.h3 : type.body,
                  color: muted ? color.textDim : color.text,
                  ...pop(frame, at + 22, 18, 0.85),
                }}
              >
                {bar.value}
                {scene.unit ?? ''}
              </div>
              <div
                style={{
                  width: '100%',
                  height: h,
                  borderRadius: `${radius.sm}px ${radius.sm}px 0 0`,
                  backgroundColor: muted ? tint(barColor, 'mid') : barColor,
                  border: `${stroke.hair}px solid ${
                    muted ? color.line : `${barColor}99`
                  }`,
                  borderBottom: 'none',
                  boxShadow: muted ? undefined : `0 10px 40px ${barColor}26`,
                  opacity: muted ? 0.7 : 1,
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: layout.isLandscape ? space.xl : space.md,
          width: plotW,
          marginTop: space.sm,
        }}
      >
        {scene.bars.map((bar, index) => {
          const muted =
            scene.highlightIndex !== undefined && index !== scene.highlightIndex;
          return (
            <div
              key={bar.label}
              style={{
                flex: 1,
                maxWidth: layout.isLandscape ? 240 : 220,
                fontFamily: font.body,
                fontWeight: muted ? 650 : 800,
                fontSize: layout.isLandscape ? type.small : type.micro,
                lineHeight: 1.2,
                color: muted ? color.textDim : color.text,
                textAlign: 'center',
                ...fadeUp(frame, stagger(index, 10, 18), 20, 20),
              }}
            >
              {bar.label}
            </div>
          );
        })}
      </div>

      {scene.footnote ? (
        <div
          style={{
            marginTop: space.lg,
            fontFamily: font.body,
            fontWeight: 650,
            fontSize: type.micro,
            color: color.textDim,
            textAlign: 'center',
            borderLeft: `${stroke.thin}px solid ${sceneAccent}`,
            paddingLeft: space.sm,
            ...fadeUp(frame, stagger(scene.bars.length, 10, 26), 20, 18),
          }}
        >
          {scene.footnote}
        </div>
      ) : null}
    </Frame>
  );
};
