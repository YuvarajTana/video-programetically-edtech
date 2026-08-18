import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {fadeUp, pulse, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '@video-kit/core/design/tokens';
import {useTheme} from '../themes';
import type {AlgorithmScene, AlgorithmStep} from '@video-kit/core/spec';

/**
 * The synced-execution technique: array cells, pointer labels, a status
 * readout, and a code panel all advance on one step clock. The alignment of
 * those `atFrame` values IS the effect — the viewer watches the data move as
 * the highlighted line runs.
 */
export const Algorithm: React.FC<{scene: AlgorithmScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();

  const active: AlgorithmStep | undefined = [...scene.steps]
    .filter((step) => step.atFrame <= frame)
    .sort((a, b) => a.atFrame - b.atFrame)
    .at(-1);
  const stepStart = active?.atFrame ?? 0;

  const n = scene.values.length;
  const gap = n > 10 ? 6 : 10;
  const maxRow = layout.isLandscape ? layout.contentW * 0.8 : layout.contentW * 0.94;
  const cell = Math.min(layout.isLandscape ? 108 : 96, (maxRow - gap * (n - 1)) / n);

  const stateOf = (index: number) => active?.states[index] ?? '.';
  const cellStyle = (state: string) => {
    switch (state) {
      case 'c':
        return {border: accents.attention, bg: tint(accents.attention, 'soft'), ink: color.text, opacity: 1};
      case 'f':
        return {border: accents.info, bg: tint(accents.info, 'soft'), ink: color.text, opacity: 1};
      case 'g':
        return {border: accents.success, bg: accents.success, ink: '#FFFFFF', opacity: 1};
      case 'x':
        return {border: color.line, bg: color.surface, ink: color.textDim, opacity: 0.35};
      default:
        return {border: color.line, bg: color.surface, ink: color.text, opacity: 1};
    }
  };

  const pointerEntries = Object.entries(active?.pointers ?? {});

  return (
    <Frame
      kicker={scene.kicker}
      title={scene.title}
      accent={scene.accent ?? 'primary'}
      style={{paddingBottom: layout.isPortrait ? 210 : 0}}
    >
      {/* Pointer labels ride above the cells they mark. */}
      <div style={{position: 'relative', height: 44, width: n * cell + (n - 1) * gap}}>
        {pointerEntries.map(([name, index]) => (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: index * (cell + gap),
              width: cell,
              textAlign: 'center',
              fontFamily: font.mono,
              fontWeight: 800,
              fontSize: type.nano,
              letterSpacing: 1,
              color: accents.info,
              ...fadeUp(frame, stepStart, 10, 8),
            }}
          >
            {name} ↓
          </div>
        ))}
      </div>

      <div style={{display: 'flex', gap}}>
        {scene.values.map((value, index) => {
          const state = stateOf(index);
          const style = cellStyle(state);
          const changed =
            active && scene.steps.length > 1
              ? state !== previousStateOf(scene.steps, active, index)
              : false;
          const entry = fadeUp(frame, stagger(index, 3, 6), 16, 18);
          return (
            <div
              key={index}
              style={{
                width: cell,
                height: cell,
                borderRadius: radius.md,
                border: `${stroke.hair}px solid ${style.border}`,
                backgroundColor: style.bg,
                color: style.ink,
                opacity: entry.opacity * style.opacity,
                translate: entry.translate,
                display: 'grid',
                placeItems: 'center',
                fontFamily: font.mono,
                fontWeight: 800,
                fontSize: n > 10 ? type.small : type.body,
                scale: String(changed ? pulse(frame, stepStart, 12, 1.08) : 1),
              }}
            >
              {value}
            </div>
          );
        })}
      </div>

      {active?.status ? (
        <div
          key={`status-${stepStart}`}
          style={{
            marginTop: space.md,
            padding: `${space.xs}px ${space.md}px`,
            borderRadius: radius.pill,
            backgroundColor: tint(accents[scene.accent ?? 'primary'], 'faint'),
            fontFamily: font.mono,
            fontWeight: 700,
            fontSize: layout.isLandscape ? type.small : type.micro,
            color: color.text,
            ...fadeUp(frame, stepStart, 10, 10),
          }}
        >
          {active.status}
        </div>
      ) : null}

      {scene.code ? (
        <div
          style={{
            marginTop: space.lg,
            width: layout.isLandscape ? layout.contentW * 0.56 : layout.contentW * 0.94,
            borderRadius: radius.lg,
            border: `${stroke.hair}px solid ${color.line}`,
            backgroundColor: color.bgDeep,
            padding: `${space.sm}px 0`,
            ...fadeUp(frame, 14, 20, 24),
          }}
        >
          {scene.code.lines.map((line, index) => {
            const isActive = active?.codeLine === index + 1;
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: space.md,
                  padding: `3px ${space.md}px`,
                  backgroundColor: isActive ? tint(accents.attention, 'faint') : 'transparent',
                  borderLeft: `${stroke.thin}px solid ${
                    isActive ? accents.attention : 'transparent'
                  }`,
                  fontFamily: font.mono,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: layout.isLandscape ? type.micro : type.nano + 2,
                  lineHeight: 1.5,
                  color: isActive ? color.text : color.textDim,
                  whiteSpace: 'pre',
                }}
              >
                <span style={{color: tint(color.muted, 'strong'), userSelect: 'none'}}>
                  {String(index + 1).padStart(2, ' ')}
                </span>
                {line || ' '}
              </div>
            );
          })}
        </div>
      ) : null}
    </Frame>
  );
};

/** The cell's state in the step before `current`, for change-pulse detection. */
const previousStateOf = (
  steps: AlgorithmStep[],
  current: AlgorithmStep,
  index: number,
) => {
  const ordered = [...steps].sort((a, b) => a.atFrame - b.atFrame);
  const at = ordered.indexOf(current);
  return at > 0 ? ordered[at - 1].states[index] ?? '.' : '.';
};
