import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {drawWidth, fadeUp, pop, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '../design/tokens';
import {useTheme} from '../themes';
import type {DiagramLabel, LabeledDiagramScene} from '../types';

/**
 * One big illustration with callout labels connected to it — the Learn kit's
 * "parts of a thing" scene. Labels pop in one by one so narration can walk
 * through them.
 */
export const LabeledDiagram: React.FC<{scene: LabeledDiagramScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();

  const left = scene.labels.filter((label) => label.side === 'left');
  const right = scene.labels.filter((label) => label.side === 'right');
  const orderOf = (label: DiagramLabel) => scene.labels.indexOf(label);
  const emojiSize = layout.isLandscape ? 320 : 300;
  const connectorW = layout.isLandscape ? 90 : 44;

  const renderLabel = (label: DiagramLabel) => {
    const at = stagger(orderOf(label), 14, 20);
    const accent = accents[label.accent ?? scene.accent ?? 'primary'];
    const fromLeft = label.side === 'left';
    return (
      <div
        key={label.text}
        style={{
          display: 'flex',
          flexDirection: fromLeft ? 'row' : 'row-reverse',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 0,
        }}
      >
        <div
          style={{
            padding: `${space.sm}px ${space.md}px`,
            borderRadius: radius.lg,
            border: `${stroke.hair}px solid ${accent}99`,
            backgroundColor: tint(accent, 'ghost'),
            textAlign: fromLeft ? 'right' : 'left',
            maxWidth: layout.isLandscape ? 330 : 300,
            ...fadeUp(frame, at, 20, 20),
          }}
        >
          <div
            style={{
              fontFamily: font.display,
              fontWeight: 800,
              fontSize: layout.isLandscape ? type.h3 * 0.8 : type.body,
              lineHeight: 1.1,
              color: color.text,
            }}
          >
            {label.emoji ? `${label.emoji} ` : ''}
            {label.text}
          </div>
          {label.detail ? (
            <div
              style={{
                marginTop: 4,
                fontFamily: font.body,
                fontWeight: 650,
                fontSize: type.micro,
                lineHeight: 1.25,
                color: color.textDim,
              }}
            >
              {label.detail}
            </div>
          ) : null}
        </div>
        <div
          style={{
            height: stroke.hair,
            width: drawWidth(frame, at + 6, connectorW, 16),
            backgroundColor: accent,
          }}
        />
        <div
          style={{
            width: 14,
            height: 14,
            marginLeft: fromLeft ? -2 : 0,
            marginRight: fromLeft ? 0 : -2,
            borderRadius: radius.pill,
            backgroundColor: accent,
            ...pop(frame, at + 18, 14, 0.4),
          }}
        />
      </div>
    );
  };

  const column = (labels: DiagramLabel[], side: 'left' | 'right') => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'left' ? 'flex-end' : 'flex-start',
        justifyContent: 'center',
        gap: layout.isLandscape ? space.xl : space.lg,
      }}
    >
      {labels.map(renderLabel)}
    </div>
  );

  // Portrait stacks: labels above, illustration center, labels below would
  // fight the caption bar — instead keep two slim columns beside the emoji.
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
          alignItems: 'center',
          justifyContent: 'center',
          width: layout.contentW,
          gap: layout.isLandscape ? space.md : 0,
        }}
      >
        {column(left, 'left')}
        <div
          style={{
            flexShrink: 0,
            width: emojiSize,
            height: emojiSize,
            borderRadius: radius.pill,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: tint(accents[scene.accent ?? 'primary'], 'ghost'),
            border: `${stroke.hair}px solid ${color.line}`,
            fontSize: emojiSize * 0.62,
            lineHeight: 1,
            ...pop(frame, 6, 24, 0.7),
          }}
        >
          {scene.emoji}
        </div>
        {column(right, 'right')}
      </div>

      {scene.prompt ? (
        <div
          style={{
            marginTop: space.xl,
            fontFamily: font.body,
            fontWeight: 700,
            fontSize: layout.isLandscape ? type.body : type.small,
            color: color.textDim,
            textAlign: 'center',
            ...fadeUp(frame, stagger(scene.labels.length, 14, 28), 20, 22),
          }}
        >
          {scene.prompt}
        </div>
      ) : null}
    </Frame>
  );
};
