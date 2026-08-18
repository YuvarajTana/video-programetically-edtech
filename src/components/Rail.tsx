import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {fadeIn} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '@video-kit/core/design/tokens';
import {useTheme} from '../themes';
import type {VideoSpec} from '@video-kit/core/spec';
import {sceneOffsets} from '@video-kit/core/spec';

/**
 * The persistent stage pipeline. Rendered outside the scene series so it
 * survives every cut; scenes advance it with `railStage`, and scenes that
 * omit it inherit the previous stage. Continuity is the point — six cuts
 * read as one journey.
 */
export const Rail: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const rail = spec.rail;
  if (!rail || rail.stages.length === 0) return null;

  // Resolve the active stage: the last railStage declared at or before the
  // scene currently on screen.
  let active = 0;
  for (const offset of sceneOffsets(spec)) {
    if (offset.start > frame) break;
    if (offset.scene.railStage !== undefined) active = offset.scene.railStage;
  }
  active = Math.max(0, Math.min(active, rail.stages.length - 1));

  const accent = accents.primary;
  const compact = !layout.isLandscape;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: layout.safe * (compact ? 1.05 : 0.42),
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 6 : 10,
          maxWidth: layout.contentW,
          ...fadeIn(frame, 0, 12),
        }}
      >
        {rail.stages.map((stage, index) => {
          const isActive = index === active;
          const isDone = index < active;
          return (
            <div key={stage} style={{display: 'flex', alignItems: 'center', gap: compact ? 6 : 10}}>
              {index > 0 ? (
                <div
                  style={{
                    width: compact ? 10 : 18,
                    height: stroke.hair,
                    backgroundColor: isDone || isActive ? tint(accent, 'strong') : color.line,
                  }}
                />
              ) : null}
              <div
                style={{
                  padding: compact ? `4px ${space.xs + 2}px` : `5px ${space.sm}px`,
                  borderRadius: radius.pill,
                  border: `${stroke.hair}px solid ${
                    isActive ? accent : isDone ? tint(accent, 'mid') : color.line
                  }`,
                  backgroundColor: isActive ? tint(accent, 'faint') : 'transparent',
                  fontFamily: font.mono,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: compact ? 15 : type.nano,
                  letterSpacing: compact ? 1 : 2,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  color: isActive ? accent : isDone ? color.textDim : tint(color.muted, 'strong'),
                }}
              >
                {isDone ? '✓ ' : ''}
                {stage}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
