import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {Body, Kicker, Small} from '../components/Text';
import {accents, color, font, space} from '../design/tokens';
import {fadeUp, pop} from '../design/anim';
import {useLayout} from '../design/formats';
import type {BigStatScene} from '../types';

export const BigStat: React.FC<{scene: BigStatScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const a = accents[scene.accent ?? 'amber'];

  return (
    <Frame>
      <div style={{textAlign: 'center', maxWidth: layout.contentW}}>
        {scene.kicker ? (
          <div style={fadeUp(frame, 0, 18, 20)}>
            <Kicker>{scene.kicker}</Kicker>
          </div>
        ) : null}

        <div
          style={{
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 186,
            lineHeight: 1,
            color: a,
            margin: `${space.md}px 0`,
            ...pop(frame, 4, 34, 0.86),
          }}
        >
          {scene.value}
        </div>

        {scene.label ? (
          <Body style={{fontSize: 48, color: color.text, ...fadeUp(frame, 20, 22, 24)}}>
            {scene.label}
          </Body>
        ) : null}
        {scene.note ? (
          <Small style={{marginTop: space.md, ...fadeUp(frame, 30, 22, 20)}}>
            {scene.note}
          </Small>
        ) : null}
      </div>
    </Frame>
  );
};
