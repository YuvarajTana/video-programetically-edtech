import {useCurrentFrame} from 'remotion';
import {Frame} from '../components/Frame';
import {Card} from '../components/Card';
import {Body, H3} from '../components/Text';
import {accents, color, font, space, type} from '../design/tokens';
import {fadeUp, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import type {CompareScene} from '../types';

const Column: React.FC<{
  side: CompareScene['left'];
  fallback: 'coral' | 'teal';
  frame: number;
  at: number;
}> = ({side, fallback, frame, at}) => {
  const key = side.accent ?? fallback;
  const a = accents[key];
  return (
    <Card
      edge="top"
      accent={key}
      style={{flex: 1, ...fadeUp(frame, at, 26, 40)}}
    >
      <H3 style={{color: a, fontFamily: font.display, fontSize: type.h3}}>{side.heading}</H3>
      <div style={{marginTop: space.md, display: 'flex', flexDirection: 'column', gap: space.sm}}>
        {side.points.map((p, i) => (
          <div key={p} style={{display: 'flex', gap: space.sm, ...fadeUp(frame, at + 10 + i * 7, 20, 16)}}>
            <span style={{color: a, fontFamily: font.mono, fontSize: type.small}}>—</span>
            <Body style={{fontSize: type.small, color: color.textDim}}>{p}</Body>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const Compare: React.FC<{scene: CompareScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();

  return (
    <Frame kicker={scene.kicker} title={scene.title} accent={scene.accent ?? 'amber'}>
      <div
        style={{
          display: 'flex',
          flexDirection: layout.isLandscape ? 'row' : 'column',
          alignItems: 'stretch',
          gap: space.md,
          width: layout.isLandscape ? layout.contentW * 0.88 : layout.contentW,
        }}
      >
        <Column side={scene.left} fallback="coral" frame={frame} at={stagger(0, 12, 6)} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: font.mono,
            fontSize: type.micro,
            letterSpacing: 4,
            color: color.muted,
            padding: layout.isLandscape ? `0 ${space.xs}px` : `${space.xs}px 0`,
          }}
        >
          VS
        </div>
        <Column side={scene.right} fallback="teal" frame={frame} at={stagger(1, 12, 6)} />
      </div>
    </Frame>
  );
};
