import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Frame} from '../components/Frame';
import {radius, space, tint, type} from '../design/tokens';
import {EASE, EASE_IO, fadeUp} from '../design/anim';
import {useLayout} from '../design/formats';
import {useTheme} from '../themes';
import type {ArchitectureScene, ArchNode} from '../types';

type Placed = ArchNode & {x: number; y: number; w: number; h: number; group: number};

/**
 * System / infra diagrams.
 *
 * Nodes are placed on a coarse grid rather than by pixel, so the same spec lays
 * out correctly at 16:9 and 9:16 — the grid simply gets taller cells in one and
 * wider cells in the other. Edges are computed between rectangle borders, and an
 * optional packet is animated along a named path so you can literally trace a
 * request through the system while narrating it.
 */
export const Architecture: React.FC<{scene: ArchitectureScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const accent = accents[scene.accent ?? 'success'];

  const boxW = layout.isLandscape ? layout.contentW * 0.88 : layout.contentW;
  const boxH = layout.isLandscape ? layout.contentH * 0.62 : layout.contentH * 0.56;

  const cols = Math.max(...scene.nodes.map((n) => n.col + (n.span ?? 1)));
  const rows = Math.max(...scene.nodes.map((n) => n.row)) + 1;
  const cellW = boxW / cols;
  const cellH = boxH / rows;

  const groupOf = (id: string) => {
    if (!scene.reveal) return 0;
    const g = scene.reveal.findIndex((set) => set.includes(id));
    return g === -1 ? 0 : g;
  };

  const placed: Placed[] = scene.nodes.map((n) => {
    const span = n.span ?? 1;
    const w = Math.min(cellW * span - 24, 420);
    const h = Math.min(cellH - 26, 168);
    return {
      ...n,
      w,
      h,
      x: (n.col + span / 2) * cellW,
      y: (n.row + 0.5) * cellH,
      group: groupOf(n.id),
    };
  });

  const byId = new Map(placed.map((p) => [p.id, p]));

  const groups = scene.reveal?.length ?? 1;
  const revealEnd = groups * 12 + 16;
  const traceStart = Math.max(revealEnd + 6, Math.floor(durationInFrames * 0.42));
  const traceEnd = durationInFrames - 14;

  const nodeAppear = (p: Placed) =>
    interpolate(frame, [p.group * 12, p.group * 12 + 20], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE,
    });

  /** Shorten a segment so it stops at the rectangle border, not the centre. */
  const border = (from: Placed, to: Placed) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const shrink = (p: Placed) => {
      const sx = dx === 0 ? Infinity : p.w / 2 / Math.abs(dx);
      const sy = dy === 0 ? Infinity : p.h / 2 / Math.abs(dy);
      const s = Math.min(sx, sy);
      return {x: dx * s, y: dy * s};
    };
    const a = shrink(from);
    const b = shrink(to);
    return {
      x1: from.x + a.x,
      y1: from.y + a.y,
      x2: to.x - b.x,
      y2: to.y - b.y,
    };
  };

  // Packet position along the trace path.
  const path = scene.trace?.path.map((id) => byId.get(id)).filter(Boolean) as Placed[] | undefined;
  let packet: {x: number; y: number; leg: number} | null = null;
  if (path && path.length > 1 && frame >= traceStart) {
    const t = interpolate(frame, [traceStart, traceEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_IO,
    });
    const legs = path.length - 1;
    const scaled = Math.min(t * legs, legs - 0.0001);
    const leg = Math.floor(scaled);
    const local = scaled - leg;
    const seg = border(path[leg], path[leg + 1]);
    packet = {
      x: seg.x1 + (seg.x2 - seg.x1) * local,
      y: seg.y1 + (seg.y2 - seg.y1) * local,
      leg,
    };
  }

  const litIds = new Set<string>();
  if (path && packet) {
    for (let k = 0; k <= packet.leg; k++) litIds.add(path[k].id);
    litIds.add(path[packet.leg + 1].id);
  }

  return (
    <Frame kicker={scene.kicker} title={scene.title} accent={scene.accent ?? 'success'}>
      <div style={{position: 'relative', width: boxW, height: boxH}}>
        <svg
          width={boxW}
          height={boxH}
          style={{position: 'absolute', inset: 0, overflow: 'visible'}}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color.lineHi} />
            </marker>
          </defs>

          {scene.edges.map((e, i) => {
            const from = byId.get(e.from);
            const to = byId.get(e.to);
            if (!from || !to) return null;
            const at = Math.max(from.group, to.group) * 12 + 14;
            const draw = interpolate(frame, [at, at + 18], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: EASE,
            });
            const s = border(from, to);
            const active = litIds.has(e.from) && litIds.has(e.to);
            return (
              <g key={`${e.from}-${e.to}-${i}`} opacity={draw}>
                <line
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x1 + (s.x2 - s.x1) * draw}
                  y2={s.y1 + (s.y2 - s.y1) * draw}
                  stroke={active ? accent : color.lineHi}
                  strokeWidth={active ? 4 : 3}
                  strokeDasharray={e.dashed ? '10 10' : undefined}
                  markerEnd="url(#arrow)"
                />
                {e.label ? (
                  <text
                    x={(s.x1 + s.x2) / 2}
                    y={(s.y1 + s.y2) / 2 - 12}
                    textAnchor="middle"
                    fill={color.muted}
                    style={{fontFamily: font.mono, fontSize: type.nano}}
                  >
                    {e.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {packet ? (
            <>
              <circle cx={packet.x} cy={packet.y} r={20} fill={accent} opacity={0.22} />
              <circle cx={packet.x} cy={packet.y} r={9} fill={accent} />
            </>
          ) : null}
        </svg>

        {placed.map((p) => {
          const a = p.accent ? accents[p.accent] : color.lineHi;
          const lit = litIds.has(p.id);
          const appear = nodeAppear(p);
          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x - p.w / 2,
                top: p.y - p.h / 2,
                width: p.w,
                height: p.h,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: radius.lg,
                border: `3px solid ${lit ? accent : a}`,
                backgroundColor: lit ? tint(accent, 'faint') : color.surface,
                boxShadow: lit ? `0 0 48px ${tint(accent, 'soft')}` : 'none',
                opacity: appear,
                scale: interpolate(appear, [0, 1], [0.9, 1]),
                padding: space.sm,
              }}
            >
              <div
                style={{
                  fontFamily: font.body,
                  fontWeight: 700,
                  fontSize: 36,
                  color: color.text,
                  textAlign: 'center',
                  lineHeight: 1.15,
                }}
              >
                {p.label}
              </div>
              {p.sub ? (
                <div
                  style={{
                    fontFamily: font.mono,
                    fontSize: type.nano,
                    letterSpacing: 2,
                    color: lit ? accent : color.muted,
                    textTransform: 'uppercase',
                  }}
                >
                  {p.sub}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {scene.trace?.label ? (
        <div
          style={{
            marginTop: space.xl,
            display: 'flex',
            alignItems: 'center',
            gap: space.sm,
            ...fadeUp(frame, traceStart - 10, 20, 16),
          }}
        >
          <div style={{width: 14, height: 14, borderRadius: 999, backgroundColor: accent}} />
          <span
            style={{
              fontFamily: font.mono,
              fontSize: type.micro,
              letterSpacing: 3,
              color: color.textDim,
              textTransform: 'uppercase',
            }}
          >
            {scene.trace.label}
          </span>
        </div>
      ) : null}
    </Frame>
  );
};
