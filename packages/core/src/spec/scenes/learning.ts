import {z} from 'zod';
import {accented, sceneSchema} from '../base';

export const CountingSceneSchema = sceneSchema('counting', {
  kicker: z.string().max(120).optional(),
  /** The numeral and the quantity of countable dots shown on screen. */
  number: z.number().int().min(0).max(100),
  /** Written form, for example "Seven". */
  word: z.string().min(1).max(60),
  prompt: z.string().max(300).optional(),
});

export const ColorsSceneSchema = sceneSchema('colors', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  items: z
    .array(
      z.strictObject({
        name: z.string().min(1).max(60),
        hex: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Use a hex colour like #ff8800.'),
        example: z.string().max(120).optional(),
        emoji: z.string().max(16).optional(),
      }),
    )
    .min(1)
    .max(12),
  prompt: z.string().max(300).optional(),
});

export const FlashcardsSceneSchema = sceneSchema('flashcards', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  items: z
    .array(
      z.strictObject({
        label: z.string().min(1).max(120),
        emoji: z.string().min(1).max(16),
        clue: z.string().max(200).optional(),
        color: z.string().max(40).optional(),
        rank: z.number().int().optional(),
      }),
    )
    .min(1)
    .max(24),
  prompt: z.string().max(300).optional(),
  showCluesInCompact: z.boolean().optional(),
});

export const QuizSceneSchema = sceneSchema('quiz', {
  kicker: z.string().max(120).optional(),
  question: z.string().min(1).max(400),
  /** Two to four choices. */
  options: z
    .array(
      z.strictObject({
        label: z.string().min(1).max(200),
        emoji: z.string().max(16).optional(),
      }),
    )
    .min(2)
    .max(4),
  /** Index into options of the correct answer. */
  answerIndex: z.number().int().min(0).max(3),
  /** One line shown with the reveal, e.g. the reason the answer is right. */
  explanation: z.string().max(400).optional(),
  /**
   * Frame at which the answer is revealed. Defaults to 60% of the scene so
   * viewers get a thinking pause. Validation enforces a minimum pause.
   */
  revealAtFrame: z.number().int().min(0).max(18_000).optional(),
});

export const CountdownSceneSchema = sceneSchema('countdown', {
  kicker: z.string().max(120).optional(),
  /** Counts down from this number to 1. Keep it between 2 and 10. */
  from: z.number().int().min(2).max(10),
  /** Shown when the countdown lands. */
  reveal: z.string().min(1).max(200),
  revealEmoji: z.string().max(16).optional(),
  /**
   * Frames reserved for the reveal. Defaults to 40% of the scene; the
   * numbers split the rest evenly.
   */
  revealFrames: z.number().int().min(1).max(18_000).optional(),
});

export const LabeledDiagramSceneSchema = sceneSchema('labeledDiagram', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  /** The illustration: one large emoji (or a short emoji cluster). */
  emoji: z.string().min(1).max(24),
  labels: z
    .array(
      accented({
        text: z.string().min(1).max(200),
        detail: z.string().max(300).optional(),
        /** Which side of the illustration the label sits on. */
        side: z.enum(['left', 'right']),
        emoji: z.string().max(16).optional(),
      }),
    )
    .min(1)
    .max(8),
  prompt: z.string().max(300).optional(),
});
