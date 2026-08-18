import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {useLayout} from '../design/formats';
import type {
  MotionCanvasAction,
  MotionCanvasElement,
  MotionCanvasScene,
} from '@video-kit/core/spec';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type MotionPalette = {
  paper: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  positive: string;
  negative: string;
  neutral: string;
  mascot: string;
  shadow: string;
  dark: boolean;
};

const themes: Record<MotionCanvasScene['style'], MotionPalette> = {
  'whiteboard-light': {
    paper: '#fbf7ed',
    surface: '#fffdf8',
    ink: '#202a2d',
    muted: '#667174',
    line: '#aeb9b6',
    accent: '#ff6b4a',
    positive: '#1f9d79',
    negative: '#8b5cf6',
    neutral: '#2f80ed',
    mascot: '#b7ed45',
    shadow: 'rgba(32,42,45,.14)',
    dark: false,
  },
  'midnight-code': {
    paper: '#060912',
    surface: '#101827',
    ink: '#f5f8ff',
    muted: '#94a3ba',
    line: '#40516b',
    accent: '#ff7849',
    positive: '#39d99b',
    negative: '#b89aff',
    neutral: '#56a8ff',
    mascot: '#b7ed45',
    shadow: 'rgba(0,0,0,.55)',
    dark: true,
  },
  'electric-grid': {
    paper: '#031011',
    surface: '#092126',
    ink: '#efffff',
    muted: '#83b5ba',
    line: '#1e6269',
    accent: '#b7ed45',
    positive: '#42f5c5',
    negative: '#ff5ea8',
    neutral: '#4ed6ff',
    mascot: '#ff7849',
    shadow: 'rgba(0,0,0,.6)',
    dark: true,
  },
};

const toneColor = (
  tone: 'accent' | 'positive' | 'negative' | 'neutral' | undefined,
  palette: MotionPalette,
) =>
  tone === 'positive'
    ? palette.positive
    : tone === 'negative'
      ? palette.negative
      : tone === 'neutral'
        ? palette.neutral
        : palette.accent;

const actionFor = (
  actions: MotionCanvasAction[],
  target: string,
  type: MotionCanvasAction['type'],
) => actions.find((action) => action.target === target && action.type === type);

const actionProgress = (
  frame: number,
  action: MotionCanvasAction | undefined,
  fallback: number,
) => {
  if (!action) return fallback;
  const linear = interpolate(
    frame,
    [action.atFrame, action.atFrame + (action.durationFrames ?? 18)],
    [0, 1],
    clamp,
  );
  return 1 - (1 - linear) ** 3;
};

const actionWindow = (
  frame: number,
  action: MotionCanvasAction | undefined,
) => {
  if (!action) return {active: false, progress: 0, opacity: 0};
  const duration = action.durationFrames ?? 36;
  const elapsed = frame - action.atFrame;
  if (elapsed < 0 || elapsed > duration) {
    return {active: false, progress: elapsed > duration ? 1 : 0, opacity: 0};
  }
  const progress = elapsed / duration;
  return {
    active: true,
    progress,
    opacity: Math.sin(progress * Math.PI),
  };
};

const stablePhase = (id: string) =>
  [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 19;

const SemanticShape: React.FC<{
  shape: Extract<MotionCanvasElement, {kind: 'shape'}>['shape'];
  fill: string;
  stroke: string;
  hasLabel?: boolean;
}> = ({shape, fill, stroke, hasLabel = false}) => {
  const shared = {fill, stroke, strokeWidth: 7, strokeLinejoin: 'round' as const};
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
      {shape === 'circle' ? <circle cx="60" cy="60" r="46" {...shared} /> : null}
      {shape === 'square' ? <rect x="15" y="15" width="90" height="90" {...shared} /> : null}
      {shape === 'rounded-square' ? (
        <rect x="13" y="13" width="94" height="94" rx="25" {...shared} />
      ) : null}
      {shape === 'diamond' ? (
        <polygon points="60,8 112,60 60,112 8,60" {...shared} />
      ) : null}
      {shape === 'triangle' ? (
        <polygon points="60,9 112,105 8,105" {...shared} />
      ) : null}
      {shape === 'hexagon' ? (
        <polygon points="31,10 89,10 116,60 89,110 31,110 4,60" {...shared} />
      ) : null}
      {shape === 'pill' ? (
        <rect x="5" y="25" width="110" height="70" rx="35" {...shared} />
      ) : null}
      {shape === 'ring' ? (
        <>
          <circle cx="60" cy="60" r="46" {...shared} fill="transparent" />
          <circle cx="60" cy="60" r="25" fill="none" stroke={fill} strokeWidth="10" />
        </>
      ) : null}
      {shape === 'database' ? (
        <>
          <path d="M14 31v58c0 14 21 25 46 25s46-11 46-25V31" {...shared} />
          <ellipse cx="60" cy="31" rx="46" ry="23" {...shared} />
          {!hasLabel ? (
            <path d="M14 58c0 13 21 24 46 24s46-11 46-24M14 82c0 13 21 24 46 24s46-11 46-24" fill="none" stroke={stroke} strokeWidth="6" />
          ) : null}
        </>
      ) : null}
      {shape === 'document' ? (
        <>
          <path d="M22 7h51l25 25v81H22z" {...shared} />
          <path d="M73 7v27h25" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {!hasLabel ? (
            <path d="M39 57h43M39 75h43M39 93h30" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
          ) : null}
        </>
      ) : null}
    </svg>
  );
};

const pythonTokenPattern =
  /(#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@[A-Za-z_]\w*|\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b|\b\d+(?:\.\d+)?\b)/g;

const highlightedCode = (line: string, palette: MotionPalette) =>
  line.split(pythonTokenPattern).map((token, index) => {
    if (!token) return null;
    const color = token.startsWith('#')
      ? palette.muted
      : token.startsWith('@')
        ? palette.negative
        : token.startsWith('"') || token.startsWith("'")
          ? palette.positive
          : /^\d/.test(token)
            ? palette.neutral
            : pythonTokenPattern.test(token)
              ? palette.accent
              : palette.ink;
    pythonTokenPattern.lastIndex = 0;
    return (
      <span key={`${token}-${index}`} style={{color}}>
        {token}
      </span>
    );
  });

const OrbitMascot: React.FC<{
  expression: Extract<MotionCanvasElement, {kind: 'mascot'}>['expression'];
  label?: string;
  palette: MotionPalette;
}> = ({expression, label, palette}) => {
  const surprised = expression === 'surprised';
  const thinking = expression === 'thinking';
  const happy = expression === 'happy';
  return (
    <div style={{display: 'grid', justifyItems: 'center', gap: 10}}>
      <div
        style={{
          position: 'relative',
          width: 116,
          height: 116,
          borderRadius: '44% 56% 52% 48% / 48% 44% 56% 52%',
          border: `5px solid ${palette.ink}`,
          background: palette.mascot,
          rotate: thinking ? '-8deg' : happy ? '4deg' : '0deg',
          boxShadow: '8px 9px 0 rgba(32,42,45,.13)',
        }}
      >
        {[34, 72].map((left, index) => (
          <span
            key={left}
            style={{
              position: 'absolute',
              left,
              top: surprised ? 31 : index === 0 && thinking ? 39 : 35,
              width: 13,
              height: surprised ? 19 : 14,
              borderRadius: 99,
              background: palette.ink,
            }}
          />
        ))}
        <span
          style={{
            position: 'absolute',
            left: 45,
            top: surprised ? 66 : 70,
            width: 28,
            height: surprised ? 25 : 13,
            border: `4px solid ${palette.ink}`,
            borderTop: happy ? 'none' : undefined,
            borderLeftColor: happy ? 'transparent' : palette.ink,
            borderRightColor: happy ? 'transparent' : palette.ink,
            borderRadius: surprised ? 99 : '0 0 30px 30px',
            background: surprised ? palette.paper : 'transparent',
          }}
        />
        {thinking ? (
          <span
            style={{
              position: 'absolute',
              right: -28,
              top: 0,
              color: palette.accent,
              fontSize: 44,
              fontWeight: 900,
              rotate: '10deg',
            }}
          >
            ?
          </span>
        ) : null}
      </div>
      {label ? (
        <div
          style={{
            color: palette.muted,
            fontSize: 22,
            fontWeight: 750,
            letterSpacing: 1,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

export const MotionCanvas: React.FC<{scene: MotionCanvasScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width: compositionWidth} = useVideoConfig();
  const layout = useLayout();
  const palette = themes[scene.style];
  const effects = scene.effects ?? {};
  const sceneProgress = interpolate(
    frame,
    [0, Math.max(1, scene.durationInFrames - 1)],
    [0, 1],
    clamp,
  );
  const cameraTransform = (() => {
    if (effects.camera === 'push-in') {
      return `translate3d(0, ${-sceneProgress * 8}px, 0) scale(${1 + sceneProgress * 0.028})`;
    }
    if (effects.camera === 'drift') {
      const x = Math.sin(sceneProgress * Math.PI * 1.35) * 9;
      const y = Math.cos(sceneProgress * Math.PI * 1.1) * 6;
      return `translate3d(${x}px, ${y}px, 0) scale(1.018)`;
    }
    return 'none';
  })();
  const glowStrength = effects.glow === 'strong' ? 1 : effects.glow === 'soft' ? 0.55 : 0;
  const canvas = {
    left: layout.safe,
    top: layout.safe * 0.65,
    width: layout.contentW,
    height: layout.height - layout.safe * 2.25,
  };
  const point = (element: {x: number; y: number}) => ({
    x: (element.x / 100) * canvas.width,
    y: (element.y / 100) * canvas.height,
  });
  const byId = new Map(scene.elements.map((element) => [element.id, element]));
  const intensity = scene.motion?.intensity ?? 'calm';
  const tailStart = scene.durationInFrames * 0.9;
  const ambientTail = interpolate(
    frame,
    [tailStart, scene.durationInFrames],
    [1, 0],
    clamp,
  );

  const visibility = (element: MotionCanvasElement) => {
    const reveal = actionFor(scene.actions, element.id, 'reveal');
    const draw = actionFor(scene.actions, element.id, 'draw');
    const hide = actionFor(scene.actions, element.id, 'hide');
    const enter = actionProgress(frame, reveal ?? draw, 1);
    const leave = hide ? 1 - actionProgress(frame, hide, 0) : 1;
    return Math.min(enter, leave);
  };

  const emphasis = (element: MotionCanvasElement) => {
    const highlight = actionFor(scene.actions, element.id, 'highlight');
    if (!highlight || frame < highlight.atFrame) return 0;
    return spring({
      fps,
      frame: frame - highlight.atFrame,
      config: {damping: 13, stiffness: 180, mass: 0.7},
      durationInFrames: highlight.durationFrames ?? 24,
    });
  };

  const renderPositioned = (element: Exclude<MotionCanvasElement, {kind: 'connector'}>) => {
    const {x, y} = point(element);
    const appear = visibility(element);
    const pop = emphasis(element);
    const reveal = actionFor(scene.actions, element.id, 'reveal');
    const pulse = actionWindow(
      frame,
      actionFor(scene.actions, element.id, 'pulse'),
    );
    const spin = actionProgress(
      frame,
      actionFor(scene.actions, element.id, 'spin'),
      0,
    );
    const bounce = actionWindow(
      frame,
      actionFor(scene.actions, element.id, 'bounce'),
    );
    // Keep network nodes locked to their connector geometry. Ambient motion is
    // reserved for the mascot so the diagram stays precise and readable.
    const canDrift = element.kind === 'mascot';
    const drift =
      scene.motion?.ambient && canDrift && appear > 0.98
        ? Math.sin(frame / (fps * 0.52) + stablePhase(element.id)) *
          (intensity === 'dynamic' ? 2.2 : 1.2) *
          ambientTail
        : 0;
    const rise = (1 - appear) * (intensity === 'dynamic' ? 24 : 14);
    const shapeAnimation = element.kind === 'shape' ? element.animation ?? 'none' : 'none';
    const phase = frame / fps + stablePhase(element.id) * 0.19;
    const idleY =
      shapeAnimation === 'float'
        ? Math.sin(phase * 2.2) * 7 * ambientTail
        : 0;
    const idleRotation =
      shapeAnimation === 'rotate'
        ? (frame / Math.max(1, fps * 8)) * 360 * ambientTail
        : shapeAnimation === 'wobble'
          ? Math.sin(phase * 3.1) * 5 * ambientTail
          : 0;
    const idleScale =
      shapeAnimation === 'breathe'
        ? 1 + Math.sin(phase * 2.4) * 0.035 * ambientTail
        : 1;
    const bounceY = bounce.active ? -Math.sin(bounce.progress * Math.PI) * 24 : 0;
    const common: React.CSSProperties = {
      position: 'absolute',
      left: x,
      top: y,
      opacity: appear,
      transform: `translate(-50%, -50%) translateY(${rise + drift + idleY + bounceY}px) rotate(${spin * 360 + idleRotation}deg) scale(${(0.86 + appear * 0.14 + pop * 0.035) * idleScale})`,
      transformOrigin: 'center',
      filter:
        pop > 0.02 || glowStrength > 0
          ? `drop-shadow(0 0 ${8 + pop * 15 + glowStrength * 7}px ${palette.accent}${pop > 0.02 ? '52' : '24'})`
          : undefined,
      willChange: 'transform, opacity',
    };

    if (element.kind === 'search') {
      const typingProgress = element.typewriter
        ? actionProgress(frame, reveal, 1)
        : 1;
      const visibleCharacters = Math.max(
        typingProgress > 0 ? 1 : 0,
        Math.floor(element.query.length * typingProgress),
      );
      const typedQuery = element.query.slice(0, visibleCharacters);
      const showCursor =
        element.typewriter &&
        typingProgress < 1 &&
        Math.floor(Math.max(0, frame - (reveal?.atFrame ?? 0)) / 6) % 2 === 0;
      return (
        <div
          key={element.id}
          style={{
            ...common,
            width: `${element.width ?? 72}%`,
            minHeight: layout.isPortrait ? 104 : 82,
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            padding: '18px 28px',
            border: `5px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.dark ? `${palette.surface}e8` : palette.surface,
            boxShadow: palette.dark
              ? `0 18px 55px ${palette.shadow}, inset 0 1px 0 rgba(255,255,255,.08)`
              : `9px 10px 0 ${palette.shadow}`,
            backdropFilter: palette.dark ? 'blur(16px)' : undefined,
            color: palette.ink,
            fontSize: layout.isPortrait ? 37 : 31,
            fontWeight: 750,
          }}
        >
          <span style={{fontSize: 42}}>⌕</span>
          <span>
            {typedQuery}
            {showCursor ? <span style={{color: palette.accent}}>▌</span> : null}
          </span>
          <span style={{marginLeft: 'auto', color: palette.accent}}>↵</span>
        </div>
      );
    }

    if (element.kind === 'code') {
      const typingProgress = element.typewriter
        ? actionProgress(frame, reveal, 1)
        : 1;
      const visibleCharacters = Math.max(
        typingProgress > 0 ? 1 : 0,
        Math.floor(element.code.length * typingProgress),
      );
      const typedCode = element.code.slice(0, visibleCharacters);
      const showCursor =
        element.typewriter &&
        typingProgress < 1 &&
        Math.floor(Math.max(0, frame - (reveal?.atFrame ?? 0)) / 6) % 2 === 0;
      const visibleLines = typedCode.split(/\r?\n/);
      const lineActions = scene.actions
        .filter(
          (action) =>
            action.target === element.id &&
            (action.type === 'focus-line' || action.type === 'execute-line') &&
            action.atFrame <= frame,
        )
        .sort((left, right) => left.atFrame - right.atFrame);
      const activeLineAction = lineActions.at(-1);
      const lineCue = actionWindow(frame, activeLineAction);
      const showLineNumbers = element.lineNumbers ?? element.code.includes('\n');
      return (
        <div
          key={element.id}
          style={{
            ...common,
            width: `${element.width ?? 88}%`,
            overflow: 'hidden',
            border: `5px solid ${palette.ink}`,
            borderRadius: 24,
            background: palette.dark ? `${palette.surface}e8` : palette.surface,
            boxShadow: palette.dark
              ? `0 18px 55px ${palette.shadow}, inset 0 1px 0 rgba(255,255,255,.08)`
              : `9px 10px 0 ${palette.shadow}`,
            backdropFilter: palette.dark ? 'blur(16px)' : undefined,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              minHeight: 34,
              padding: '7px 16px',
              borderBottom: `3px solid ${palette.ink}`,
              color: palette.muted,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: layout.isPortrait ? 18 : 15,
              fontWeight: 750,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            <span style={{color: palette.accent}}>●</span>
            {element.label ?? 'python'}
          </div>
          <div
            style={{
              minHeight: layout.isPortrait ? 72 : 58,
              padding: layout.isPortrait ? '16px 20px' : '13px 18px',
              color: palette.ink,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: layout.isPortrait ? 29 : 24,
              fontWeight: 750,
              lineHeight: 1.28,
            }}
          >
            {visibleLines.map((line, index) => {
              const lineNumber = index + 1;
              const isActive = activeLineAction?.line === lineNumber;
              return (
                <div
                  key={`${element.id}-line-${lineNumber}`}
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: showLineNumbers ? '44px minmax(0, 1fr)' : '1fr',
                    gap: 12,
                    minHeight: layout.isPortrait ? 39 : 32,
                    alignItems: 'center',
                    margin: '2px 0',
                    padding: '3px 8px',
                    borderRadius: 9,
                    background: isActive ? `${palette.accent}${palette.dark ? '22' : '18'}` : 'transparent',
                    boxShadow: isActive && lineCue.active ? `inset 4px 0 0 ${palette.accent}, 0 0 ${12 * lineCue.opacity}px ${palette.accent}35` : undefined,
                  }}
                >
                  {showLineNumbers ? (
                    <span style={{color: isActive ? palette.accent : palette.muted, textAlign: 'right', opacity: 0.78}}>
                      {isActive ? '▶' : lineNumber}
                    </span>
                  ) : null}
                  <code style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>
                    {highlightedCode(line, palette)}
                    {showCursor && index === visibleLines.length - 1 ? (
                      <span style={{color: palette.accent}}>▌</span>
                    ) : null}
                  </code>
                </div>
              );
            })}
            {activeLineAction?.note || activeLineAction?.output ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: activeLineAction.note && activeLineAction.output ? '1fr auto' : '1fr',
                  gap: 14,
                  marginTop: 12,
                  padding: '10px 13px',
                  border: `2px solid ${palette.line}`,
                  borderRadius: 12,
                  background: palette.dark ? `${palette.paper}70` : `${palette.neutral}0d`,
                  color: palette.muted,
                  fontSize: layout.isPortrait ? 20 : 17,
                  lineHeight: 1.2,
                }}
              >
                {activeLineAction.note ? <span>{activeLineAction.note}</span> : null}
                {activeLineAction.output ? (
                  <strong style={{color: palette.positive, whiteSpace: 'pre-wrap'}}>
                    output → {activeLineAction.output}
                  </strong>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (element.kind === 'dot') {
      const color = toneColor(element.tone, palette);
      const size = (element.size ?? 1) * (layout.isPortrait ? 40 : 32);
      return (
        <div key={element.id} style={{...common, display: 'grid', justifyItems: 'center', gap: 10}}>
          {pulse.active ? (
            <span
              style={{
                position: 'absolute',
                top: size / 2,
                left: '50%',
                width: size * (1 + pulse.progress * 1.9),
                height: size * (1 + pulse.progress * 1.9),
                borderRadius: 999,
                border: `5px solid ${color}`,
                opacity: pulse.opacity * 0.7,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ) : null}
          <span
            style={{
              width: size,
              height: size,
              borderRadius: 999,
              border: `4px solid ${palette.ink}`,
              background: color,
              boxShadow: pop ? `0 0 0 ${12 + pop * 12}px ${color}2e` : undefined,
            }}
          />
          <strong
            style={{
              maxWidth: 190,
              color: palette.ink,
              fontSize: layout.isPortrait ? 28 : 23,
              lineHeight: 1.05,
              textAlign: 'center',
            }}
          >
            {element.label}
          </strong>
        </div>
      );
    }

    if (element.kind === 'cluster') {
      return (
        <div
          key={element.id}
          style={{
            ...common,
            width: `${element.width ?? 62}%`,
            height: `${element.height ?? 34}%`,
            border: `4px dashed ${palette.line}`,
            borderRadius: '50%',
            background: `${palette.positive}${palette.dark ? '12' : '0d'}`,
            boxShadow: palette.dark && glowStrength > 0
              ? `inset 0 0 55px ${palette.positive}0d, 0 0 45px ${palette.positive}0d`
              : undefined,
            clipPath: `inset(0 ${(1 - appear) * 100}% 0 0 round 50%)`,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              bottom: -42,
              translate: '-50% 0',
              color: palette.positive,
              fontSize: 24,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 2,
              whiteSpace: 'nowrap',
            }}
          >
            {element.label}
          </span>
        </div>
      );
    }

    if (element.kind === 'shape') {
      const color = toneColor(element.tone, palette);
      const width = element.width ?? (element.shape === 'pill' ? 18 : 12);
      const height = element.height ?? (element.shape === 'pill' ? 10 : 15);
      return (
        <div
          key={element.id}
          style={{
            ...common,
            width: `${width}%`,
            height: `${height}%`,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {pulse.active ? (
            <span
              style={{
                position: 'absolute',
                inset: `${-10 - pulse.progress * 22}%`,
                border: `5px solid ${color}`,
                borderRadius: element.shape === 'circle' || element.shape === 'ring' ? '50%' : 28,
                opacity: pulse.opacity * 0.65,
              }}
            />
          ) : null}
          <SemanticShape
            shape={element.shape}
            fill={color}
            stroke={palette.ink}
            hasLabel={Boolean(element.label)}
          />
          {element.label ? (
            <strong
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                translate: '-50% -50%',
                width: element.shape === 'triangle' ? '62%' : '78%',
                color: palette.ink,
                fontSize:
                  element.label.length > 9
                    ? layout.isPortrait ? 17 : 14
                    : element.label.length > 6
                      ? layout.isPortrait ? 20 : 16
                      : layout.isPortrait ? 24 : 19,
                lineHeight: 1,
                textAlign: 'center',
                overflowWrap: 'anywhere',
              }}
            >
              {element.label}
            </strong>
          ) : null}
          {element.sublabel ? (
            <span
              style={{
                position: 'absolute',
                left: '50%',
                top: '104%',
                translate: '-50% 0',
                width: '180%',
                color: palette.muted,
                fontSize: layout.isPortrait ? 20 : 16,
                fontWeight: 750,
                lineHeight: 1.05,
                textAlign: 'center',
              }}
            >
              {element.sublabel}
            </span>
          ) : null}
        </div>
      );
    }

    if (element.kind === 'image') {
      const motion = element.motion ?? 'ken-burns-in';
      const motionStart = reveal?.atFrame ?? 0;
      const rawMotionProgress = interpolate(
        frame,
        [motionStart, Math.max(motionStart + 1, scene.durationInFrames - 1)],
        [0, 1],
        clamp,
      );
      const motionProgress =
        rawMotionProgress * rawMotionProgress * (3 - 2 * rawMotionProgress);
      const imageScale =
        motion === 'ken-burns-in'
          ? 1.02 + motionProgress * 0.1
          : motion === 'ken-burns-out'
            ? 1.12 - motionProgress * 0.1
            : motion === 'pan-left' || motion === 'pan-right'
              ? 1.1
              : 1;
      const panX =
        motion === 'pan-left'
          ? 4 - motionProgress * 8
          : motion === 'pan-right'
            ? -4 + motionProgress * 8
            : 0;
      const captionSize = layout.isPortrait ? 25 : 20;
      return (
        <figure
          key={element.id}
          style={{
            ...common,
            width: `${element.width ?? 76}%`,
            height: `${element.height ?? 55}%`,
            margin: 0,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              border: `5px solid ${palette.ink}`,
              borderRadius: element.radius ?? 28,
              background: palette.surface,
              boxShadow: palette.dark
                ? `0 24px 65px ${palette.shadow}, 0 0 ${28 * glowStrength}px ${palette.accent}20`
                : `12px 14px 0 ${palette.shadow}`,
            }}
          >
            <Img
              src={staticFile(element.src)}
              alt={element.alt}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: element.fit ?? 'cover',
                objectPosition: `${element.focalX ?? 50}% ${element.focalY ?? 50}%`,
                transform: `translate3d(${panX}%, 0, 0) scale(${imageScale})`,
                transformOrigin: `${element.focalX ?? 50}% ${element.focalY ?? 50}%`,
                willChange: 'transform',
              }}
            />
          </div>
          {element.caption ? (
            <figcaption
              style={{
                marginTop: 13,
                color: palette.ink,
                fontSize: captionSize,
                fontWeight: 750,
                lineHeight: 1.15,
                textAlign: 'center',
              }}
            >
              {element.caption}
              {element.credit ? (
                <small
                  style={{
                    display: 'block',
                    marginTop: 5,
                    color: palette.muted,
                    fontSize: captionSize * 0.72,
                    fontWeight: 600,
                  }}
                >
                  {element.credit}
                </small>
              ) : null}
            </figcaption>
          ) : element.credit ? (
            <figcaption
              style={{
                marginTop: 8,
                color: palette.muted,
                fontSize: captionSize * 0.72,
                textAlign: 'right',
              }}
            >
              {element.credit}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    if (element.kind === 'mascot') {
      return (
        <div key={element.id} style={common}>
          <OrbitMascot expression={element.expression} label={element.label} palette={palette} />
        </div>
      );
    }

    const sizes = {
      headline: layout.isPortrait ? 58 : 46,
      label: layout.isPortrait ? 30 : 25,
      payoff: layout.isPortrait ? 45 : 36,
      cta: layout.isPortrait ? 34 : 29,
    };
    const role = element.role ?? 'label';
    return (
      <div
        key={element.id}
        style={{
          ...common,
          width: `${element.width ?? (role === 'headline' ? 92 : 72)}%`,
          padding: role === 'payoff' || role === 'cta' ? '14px 22px' : undefined,
          borderRadius: 22,
          background: role === 'payoff'
            ? `${palette.accent}18`
            : role === 'cta'
              ? palette.ink
              : 'transparent',
          color: role === 'cta' ? palette.paper : role === 'payoff' ? palette.accent : palette.ink,
          fontSize: sizes[role],
          fontWeight: role === 'label' ? 750 : 900,
          lineHeight: 1.05,
          textAlign: 'center',
          letterSpacing: role === 'headline' ? -1.5 : 0,
        }}
      >
        {element.text}
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        backgroundColor: palette.paper,
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -80,
          backgroundImage: palette.dark
            ? `linear-gradient(${palette.line}2e 1px, transparent 1px), linear-gradient(90deg, ${palette.line}2e 1px, transparent 1px)`
            : `radial-gradient(circle at center, ${palette.ink}1f 1.4px, transparent 1.5px)`,
          backgroundSize: palette.dark ? '68px 68px' : '28px 28px',
          backgroundPosition: palette.dark
            ? `${(frame * 0.16) % 68}px ${(frame * 0.1) % 68}px`
            : '0 0',
          opacity: palette.dark ? 0.82 : 1,
          transform: palette.dark ? 'perspective(900px) rotateX(0.4deg) scale(1.04)' : undefined,
        }}
      />
      {palette.dark ? (
        <>
          <div
            style={{
              position: 'absolute',
              width: compositionWidth * 0.88,
              height: compositionWidth * 0.88,
              left: -compositionWidth * 0.3 + Math.sin(sceneProgress * Math.PI) * 30,
              top: -compositionWidth * 0.25,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${palette.neutral}${Math.round(20 + 22 * glowStrength).toString(16).padStart(2, '0')} 0%, transparent 66%)`,
              filter: `blur(${20 + glowStrength * 22}px)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: compositionWidth * 0.95,
              height: compositionWidth * 0.95,
              right: -compositionWidth * 0.42,
              bottom: -compositionWidth * 0.22 + Math.cos(sceneProgress * Math.PI) * 24,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${palette.accent}${Math.round(16 + 20 * glowStrength).toString(16).padStart(2, '0')} 0%, transparent 68%)`,
              filter: `blur(${24 + glowStrength * 25}px)`,
            }}
          />
        </>
      ) : null}
      {effects.particles === 'data-stream'
        ? Array.from({length: 24}, (_, index) => {
            const speed = 0.065 + (index % 5) * 0.018;
            const baseY = (index * 43) % 118;
            const y = ((baseY + frame * speed) % 118) - 9;
            const x = 4 + ((index * 37) % 93);
            const length = 8 + (index % 4) * 8;
            const pulse = 0.28 + 0.34 * (0.5 + 0.5 * Math.sin(frame / 18 + index));
            return (
              <span
                key={index}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  width: index % 3 === 0 ? 3 : 2,
                  height: length,
                  borderRadius: 99,
                  background: index % 4 === 0 ? palette.accent : palette.neutral,
                  boxShadow: `0 0 ${8 + glowStrength * 10}px currentColor`,
                  opacity: pulse * (palette.dark ? 1 : 0.3),
                }}
              />
            );
          })
        : null}
      {effects.scanlines ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0, transparent 5px, rgba(255,255,255,.035) 6px)',
            backgroundPositionY: `${(frame * 0.35) % 6}px`,
            mixBlendMode: palette.dark ? 'screen' : 'multiply',
            opacity: palette.dark ? 0.62 : 0.18,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: canvas.left,
          top: canvas.top,
          width: canvas.width,
          height: canvas.height,
          transform: cameraTransform,
          transformOrigin: '50% 48%',
          willChange: effects.camera && effects.camera !== 'none' ? 'transform' : undefined,
        }}
      >
        {scene.elements
          .filter((element): element is Extract<MotionCanvasElement, {kind: 'connector'}> =>
            element.kind === 'connector')
          .map((element) => {
            const from = byId.get(element.from);
            const to = byId.get(element.to);
            if (!from || !to || !('x' in from) || !('x' in to)) return null;
            const start = point(from);
            const end = point(to);
            const appear = visibility(element);
            const pop = emphasis(element);
            const travel = actionWindow(
              frame,
              actionFor(scene.actions, element.id, 'travel'),
            );
            const currentEnd = {
              x: start.x + (end.x - start.x) * appear,
              y: start.y + (end.y - start.y) * appear,
            };
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const arrowSize = layout.isPortrait ? 18 : 14;
            const arrowPoints = [
              [currentEnd.x, currentEnd.y],
              [
                currentEnd.x - arrowSize * Math.cos(angle - Math.PI / 6),
                currentEnd.y - arrowSize * Math.sin(angle - Math.PI / 6),
              ],
              [
                currentEnd.x - arrowSize * Math.cos(angle + Math.PI / 6),
                currentEnd.y - arrowSize * Math.sin(angle + Math.PI / 6),
              ],
            ]
              .map((point) => point.join(','))
              .join(' ');
            return (
              <svg
                key={element.id}
                width={canvas.width}
                height={canvas.height}
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'visible',
                  opacity: appear,
                }}
              >
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={start.x + (end.x - start.x) * appear}
                  y2={start.y + (end.y - start.y) * appear}
                  stroke={pop ? palette.accent : palette.ink}
                  strokeWidth={pop ? 8 : 5}
                  strokeLinecap="round"
                  strokeDasharray={element.dashed ? '13 13' : undefined}
                  style={{filter: glowStrength > 0 ? `drop-shadow(0 0 ${6 + glowStrength * 8}px ${palette.accent}75)` : undefined}}
                />
                {element.arrow && appear > 0.08 ? (
                  <polygon
                    points={arrowPoints}
                    fill={pop ? palette.accent : palette.ink}
                    opacity={appear}
                  />
                ) : null}
                {element.label ? (
                  <text
                    x={(start.x + end.x) / 2}
                    y={(start.y + end.y) / 2 - 18}
                    textAnchor="middle"
                    fill={palette.muted}
                    style={{fontSize: 22, fontWeight: 800, opacity: appear}}
                  >
                    {element.label}
                  </text>
                ) : null}
                {travel.active ? (
                  <circle
                    cx={start.x + (end.x - start.x) * travel.progress}
                    cy={start.y + (end.y - start.y) * travel.progress}
                    r={layout.isPortrait ? 14 : 11}
                    fill={palette.accent}
                    stroke={palette.paper}
                    strokeWidth={5}
                    opacity={travel.opacity}
                  />
                ) : null}
              </svg>
            );
          })}
        {scene.elements
          .filter((element): element is Exclude<MotionCanvasElement, {kind: 'connector'}> =>
            element.kind !== 'connector')
          .map(renderPositioned)}
      </div>
      {effects.vignette ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: palette.dark
              ? 'radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,.68) 100%)'
              : 'radial-gradient(ellipse at center, transparent 58%, rgba(32,42,45,.15) 100%)',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
