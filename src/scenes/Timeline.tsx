import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {drawWidth, fadeUp, pop, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '../design/tokens';
import {useTheme} from '../themes';
import type {TimelineScene} from '../types';

/**
 * Ordered events on a line. Landscape runs left to right; portrait and square
 * run top to bottom. The spine draws first, then markers pop in order, so the
 * eye follows the sequence the narration describes.
 */
export const Timeline: React.FC<{scene: TimelineScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const events = scene.events;

  if (layout.isLandscape) {
    const lineW = layout.contentW * 0.88;
    const slot = lineW / events.length;
    return (
      <Frame kicker={scene.kicker} title={scene.title} accent={scene.accent ?? 'primary'}>
        <div style={{position: 'relative', width: lineW, height: 460}}>
          <div
            style={{
              position: 'absolute',
              top: 210,
              left: 0,
              height: stroke.thin,
              width: drawWidth(frame, 8, lineW, 34),
              backgroundColor: color.line,
            }}
          />
          {events.map((event, index) => {
            const at = stagger(index, 12, 16);
            const accent = accents[event.accent ?? scene.accent ?? 'primary'];
            const x = slot * index + slot / 2;
            return (
              <div
                key={`${event.time}-${event.label}`}
                style={{
                  position: 'absolute',
                  left: x - slot / 2,
                  width: slot,
                  top: 0,
                  height: '100%',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 150,
                    left: 0,
                    width: '100%',
                    textAlign: 'center',
                    fontFamily: font.mono,
                    fontWeight: 800,
                    fontSize: type.micro,
                    letterSpacing: 2,
                    color: accent,
                    ...fadeUp(frame, at, 18, 16),
                  }}
                >
                  {event.time}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: 210 - 13,
                    left: '50%',
                    marginLeft: -13,
                    width: 26,
                    height: 26,
                    borderRadius: radius.pill,
                    backgroundColor: accent,
                    border: `${stroke.thin}px solid ${color.bg}`,
                    boxShadow: `0 0 0 ${stroke.hair}px ${accent}66, 0 8px 26px ${accent}33`,
                    ...pop(frame, at + 4, 20, 0.5),
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 250,
                    left: '4%',
                    width: '92%',
                    textAlign: 'center',
                    ...fadeUp(frame, at + 8, 20, 22),
                  }}
                >
                  <div
                    style={{
                      fontFamily: font.display,
                      fontWeight: 750,
                      fontSize: type.h3 * 0.82,
                      lineHeight: 1.15,
                      color: color.text,
                    }}
                  >
                    {event.label}
                  </div>
                  {event.detail ? (
                    <div
                      style={{
                        marginTop: space.xs,
                        fontFamily: font.body,
                        fontWeight: 650,
                        fontSize: type.micro,
                        lineHeight: 1.3,
                        color: color.textDim,
                      }}
                    >
                      {event.detail}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Frame>
    );
  }

  // Vertical: spine on the left, entries stacked beside it.
  const rowH = Math.min(190, 1080 / events.length);
  return (
    <Frame
      kicker={scene.kicker}
      title={scene.title}
      accent={scene.accent ?? 'primary'}
      style={{paddingBottom: layout.isPortrait ? 210 : 0}}
    >
      <div style={{position: 'relative', width: layout.contentW * 0.92}}>
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: rowH * 0.28,
            width: stroke.thin,
            height: drawWidth(frame, 8, rowH * (events.length - 1), 34),
            backgroundColor: color.line,
          }}
        />
        {events.map((event, index) => {
          const at = stagger(index, 12, 16);
          const accent = accents[event.accent ?? scene.accent ?? 'primary'];
          return (
            <div
              key={`${event.time}-${event.label}`}
              style={{
                position: 'relative',
                height: rowH,
                display: 'flex',
                alignItems: 'flex-start',
                gap: space.lg,
              }}
            >
              <div
                style={{
                  marginTop: rowH * 0.28 - 13,
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  borderRadius: radius.pill,
                  backgroundColor: accent,
                  border: `${stroke.thin}px solid ${color.bg}`,
                  boxShadow: `0 0 0 ${stroke.hair}px ${accent}66, 0 8px 26px ${accent}33`,
                  ...pop(frame, at + 4, 20, 0.5),
                }}
              />
              <div style={{...fadeUp(frame, at + 8, 20, 22), minWidth: 0}}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: `4px ${space.sm}px`,
                    borderRadius: radius.pill,
                    backgroundColor: tint(accent, 'faint'),
                    fontFamily: font.mono,
                    fontWeight: 800,
                    fontSize: type.nano,
                    letterSpacing: 2,
                    color: accent,
                  }}
                >
                  {event.time}
                </div>
                <div
                  style={{
                    marginTop: space.xs,
                    fontFamily: font.display,
                    fontWeight: 750,
                    fontSize: type.h3 * 0.86,
                    lineHeight: 1.12,
                    color: color.text,
                  }}
                >
                  {event.label}
                </div>
                {event.detail ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: font.body,
                      fontWeight: 650,
                      fontSize: type.small,
                      lineHeight: 1.3,
                      color: color.textDim,
                    }}
                  >
                    {event.detail}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};
