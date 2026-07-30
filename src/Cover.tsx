import {AbsoluteFill} from 'remotion';
import {ChannelProvider} from './channels';
import type {ChannelProfile} from './channels';
import {FontGate} from './design/FontGate';
import {useLayout} from './design/formats';
import {radius, space, tint, type} from './design/tokens';
import type {DeliveryTarget} from './publishing/types';
import {useTheme} from './themes';
import type {VideoSpec} from './types';

type CoverProps = {
  spec: VideoSpec;
  channel: ChannelProfile;
  delivery: DeliveryTarget;
};

const CoverBody: React.FC<CoverProps> = ({spec, channel, delivery}) => {
  const layout = useLayout();
  const {accents, color, font, frameBackground} = useTheme();
  const titleSize = layout.isLandscape ? 112 : layout.isSquare ? 96 : 106;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: color.bg,
        color: color.text,
        fontFamily: font.body,
        padding: layout.safe,
      }}
    >
      <AbsoluteFill style={{background: frameBackground}} />

      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div
            style={{
              borderRadius: radius.pill,
              padding: `${space.sm}px ${space.lg}px`,
              backgroundColor: tint(accents.primary, 'faint'),
              border: `2px solid ${tint(accents.primary, 'mid')}`,
              color: accents.primary,
              fontFamily: font.mono,
              fontSize: type.micro,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            {channel.shortLabel}
          </div>
          <div
            style={{
              color: color.muted,
              fontFamily: font.mono,
              fontSize: type.nano,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            {delivery.platform}
          </div>
        </div>

        <div
          style={{
            maxWidth: layout.isLandscape ? layout.contentW * 0.82 : layout.contentW,
            alignSelf: layout.isLandscape ? 'flex-start' : 'center',
            textAlign: layout.isLandscape ? 'left' : 'center',
          }}
        >
          <div
            style={{
              fontFamily: font.display,
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -2,
              textWrap: 'balance',
            }}
          >
            {spec.title}
          </div>
          <div
            style={{
              width: layout.isLandscape ? 260 : 180,
              height: 8,
              borderRadius: radius.pill,
              backgroundColor: accents.primary,
              margin: layout.isLandscape
                ? `${space.xl}px 0`
                : `${space.xl}px auto`,
            }}
          />
          {spec.summary ? (
            <div
              style={{
                maxWidth: layout.isLandscape ? layout.contentW * 0.68 : layout.contentW * 0.92,
                fontSize: type.body,
                fontWeight: 600,
                lineHeight: 1.35,
                color: color.textDim,
                textWrap: 'balance',
              }}
            >
              {spec.summary}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontFamily: font.mono,
            fontSize: type.micro,
            fontWeight: 700,
            color: accents.primary,
          }}
        >
          <span>{channel.handle}</span>
          <span style={{color: color.muted, fontSize: type.nano}}>{delivery.label}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Cover: React.FC<CoverProps> = (props) => (
  <ChannelProvider channel={props.channel}>
    <FontGate>
      <CoverBody {...props} />
    </FontGate>
  </ChannelProvider>
);
