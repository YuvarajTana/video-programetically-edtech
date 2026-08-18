import {z} from 'zod';
import {ManagedImagePathSchema} from '../assets';
import {IdentifierSchema} from '../../identifiers';
import {sceneSchema} from '../base';

const MotionCanvasPositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const MotionCanvasElementSchema = z.discriminatedUnion('kind', [
  MotionCanvasPositionSchema.extend({
    id: IdentifierSchema,
    kind: z.literal('text'),
    text: z.string().trim().min(1).max(240),
    role: z.enum(['headline', 'label', 'payoff', 'cta']).optional(),
    width: z.number().min(5).max(100).optional(),
  }),
  MotionCanvasPositionSchema.extend({
    id: IdentifierSchema,
    kind: z.literal('search'),
    query: z.string().trim().min(1).max(120),
    width: z.number().min(20).max(100).optional(),
    typewriter: z.boolean().optional(),
  }),
  MotionCanvasPositionSchema.extend({
    id: IdentifierSchema,
    kind: z.literal('code'),
    code: z.string().trim().min(1).max(1_200),
    label: z.string().trim().min(1).max(80).optional(),
    width: z.number().min(20).max(100).optional(),
    typewriter: z.boolean().optional(),
    lineNumbers: z.boolean().optional(),
  }),
  MotionCanvasPositionSchema.extend({
    id: IdentifierSchema,
    kind: z.literal('dot'),
    label: z.string().trim().min(1).max(80),
    size: z.number().min(0.5).max(3).optional(),
    tone: z.enum(['accent', 'positive', 'negative', 'neutral']).optional(),
  }),
  MotionCanvasPositionSchema.extend({
    id: IdentifierSchema,
    kind: z.literal('cluster'),
    label: z.string().trim().min(1).max(80),
    width: z.number().min(10).max(100).optional(),
    height: z.number().min(8).max(100).optional(),
  }),
  MotionCanvasPositionSchema.extend({
    id: IdentifierSchema,
    kind: z.literal('shape'),
    shape: z.enum([
      'circle',
      'square',
      'rounded-square',
      'diamond',
      'triangle',
      'hexagon',
      'pill',
      'ring',
      'database',
      'document',
    ]),
    label: z.string().trim().min(1).max(80).optional(),
    sublabel: z.string().trim().min(1).max(100).optional(),
    width: z.number().min(4).max(60).optional(),
    height: z.number().min(4).max(60).optional(),
    tone: z.enum(['accent', 'positive', 'negative', 'neutral']).optional(),
    animation: z.enum(['none', 'float', 'rotate', 'wobble', 'breathe']).optional(),
  }),
  z.object({
    id: IdentifierSchema,
    kind: z.literal('connector'),
    from: IdentifierSchema,
    to: IdentifierSchema,
    label: z.string().trim().min(1).max(80).optional(),
    dashed: z.boolean().optional(),
    arrow: z.boolean().optional(),
  }),
  MotionCanvasPositionSchema.extend({
    id: IdentifierSchema,
    kind: z.literal('mascot'),
    expression: z.enum(['curious', 'surprised', 'thinking', 'happy']),
    label: z.string().trim().min(1).max(80).optional(),
  }),
  MotionCanvasPositionSchema.extend({
    id: IdentifierSchema,
    kind: z.literal('image'),
    src: ManagedImagePathSchema,
    alt: z.string().trim().min(1).max(240),
    width: z.number().min(10).max(100).optional(),
    height: z.number().min(10).max(100).optional(),
    fit: z.enum(['cover', 'contain']).optional(),
    radius: z.number().min(0).max(80).optional(),
    caption: z.string().trim().min(1).max(240).optional(),
    credit: z.string().trim().min(1).max(240).optional(),
    motion: z
      .enum(['none', 'ken-burns-in', 'ken-burns-out', 'pan-left', 'pan-right'])
      .optional(),
    focalX: z.number().min(0).max(100).optional(),
    focalY: z.number().min(0).max(100).optional(),
  }),
]);


export const MotionCanvasActionSchema = z.object({
  target: IdentifierSchema,
  type: z.enum([
    'reveal',
    'draw',
    'highlight',
    'hide',
    'pulse',
    'travel',
    'spin',
    'bounce',
    'focus-line',
    'execute-line',
  ]),
  line: z.number().int().min(1).max(100).optional(),
  note: z.string().trim().min(1).max(160).optional(),
  output: z.string().trim().min(1).max(240).optional(),
  atFrame: z.number().int().min(0).max(18_000),
  durationFrames: z.number().int().min(1).max(600).optional(),
  anchor: z
    .object({
      phrase: z.string().trim().min(1).max(160),
      occurrence: z.number().int().min(1).max(20).optional(),
      offsetFrames: z.number().int().min(-600).max(600).optional(),
    })
    .optional(),
});


export const MotionCanvasSceneSchema = sceneSchema('motionCanvas', {
  /** Complete art-direction preset for the canvas, panels, type, and connectors. */
  style: z.enum(['whiteboard-light', 'midnight-code', 'electric-grid']),
  motion: z
    .strictObject({
      intensity: z.enum(['calm', 'dynamic']),
      ambient: z.boolean().optional(),
    })
    .optional(),
  /** Seek-safe effects. Every value is derived from the current Remotion frame. */
  effects: z
    .strictObject({
      camera: z.enum(['none', 'push-in', 'drift']).optional(),
      particles: z.enum(['none', 'data-stream']).optional(),
      glow: z.enum(['none', 'soft', 'strong']).optional(),
      scanlines: z.boolean().optional(),
      vignette: z.boolean().optional(),
    })
    .optional(),
  headline: z.string().trim().min(1).max(180).optional(),
  /** End of the opening hook inside a continuous motion canvas. */
  hookEndFrame: z.number().int().min(1).max(600).optional(),
  elements: z.array(MotionCanvasElementSchema).min(1).max(80),
  actions: z.array(MotionCanvasActionSchema).min(1).max(240),
});

const normalizePhrase = (value: string) =>
  value
    .toLocaleLowerCase('en-US')
    .match(/[\p{L}\p{N}]+/gu)
    ?.join(' ') ?? '';

/**
 * The cross-field rules a motion canvas needs: ids are unique, connectors and
 * actions point at elements that exist, line actions target a code element and
 * a line it actually has, cues land inside the scene, and narration anchors
 * match text the narration really contains.
 */
export const refineMotionCanvasScene = (
  scene: z.infer<typeof MotionCanvasSceneSchema>,
  context: z.RefinementCtx,
) => {
    const ids = new Set(scene.elements.map((element) => element.id));
    if (ids.size !== scene.elements.length) {
      context.addIssue({
        code: 'custom',
        path: ['elements'],
        message: 'Motion canvas element ids must be unique.',
      });
    }

    scene.elements.forEach((element, index) => {
      if (
        element.kind === 'connector' &&
        (!ids.has(element.from) || !ids.has(element.to))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['elements', index],
          message: 'Motion canvas connectors must reference existing elements.',
        });
      }
    });

    scene.actions.forEach((action, index) => {
      if (!ids.has(action.target)) {
        context.addIssue({
          code: 'custom',
          path: ['actions', index, 'target'],
          message: 'Motion canvas actions must reference an existing element.',
        });
      }
      if (action.atFrame >= scene.durationInFrames) {
        context.addIssue({
          code: 'custom',
          path: ['actions', index, 'atFrame'],
          message: 'Motion canvas actions must occur inside the scene timeline.',
        });
      }
      if (action.type === 'focus-line' || action.type === 'execute-line') {
        const target = scene.elements.find((element) => element.id === action.target);
        if (!target || target.kind !== 'code') {
          context.addIssue({
            code: 'custom',
            path: ['actions', index, 'target'],
            message: 'Line actions must target a code element.',
          });
        } else if (
          action.line === undefined ||
          action.line > target.code.split(/\r?\n/).length
        ) {
          context.addIssue({
            code: 'custom',
            path: ['actions', index, 'line'],
            message: 'Line actions require a valid one-based code line.',
          });
        }
      }
      if (action.anchor && typeof scene.narration === 'string') {
        const narration = normalizePhrase(scene.narration);
        const phrase = normalizePhrase(action.anchor.phrase);
        if (!phrase || !narration.includes(phrase)) {
          context.addIssue({
            code: 'custom',
            path: ['actions', index, 'anchor', 'phrase'],
            message: 'Motion canvas anchors must match a phrase in narration.',
          });
        }
      }
    });

    if (
      scene.hookEndFrame !== undefined &&
      scene.hookEndFrame >= scene.durationInFrames
    ) {
      context.addIssue({
        code: 'custom',
        path: ['hookEndFrame'],
        message: 'Motion canvas hook must end inside the scene timeline.',
      });
    }
};
