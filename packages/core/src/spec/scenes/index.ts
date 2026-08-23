import {z} from 'zod';
import {
  CalloutSceneSchema,
  CompareSceneSchema,
  FlowSceneSchema,
  KineticTextSceneSchema,
  OutroSceneSchema,
  StepsSceneSchema,
  TitleSceneSchema,
} from './text';
import {
  AlgorithmSceneSchema,
  ArchitectureSceneSchema,
  ArrayVizSceneSchema,
  CodeSceneSchema,
  TerminalSceneSchema,
  TokensSceneSchema,
} from './technical';
import {
  BigStatSceneSchema,
  ChartSceneSchema,
  MeterSceneSchema,
  NumberLineSceneSchema,
  StatsSceneSchema,
  TimelineSceneSchema,
} from './data';
import {
  ColorsSceneSchema,
  CountdownSceneSchema,
  CountingSceneSchema,
  FlashcardsSceneSchema,
  LabeledDiagramSceneSchema,
  QuizSceneSchema,
} from './learning';
import {ImageSceneSchema, VideoClipSceneSchema} from './media';
import {MotionCanvasSceneSchema, refineMotionCanvasScene} from './motion-canvas';

/**
 * Every scene type, bound to the schema that defines its shape.
 *
 * This is the single declaration. The TypeScript `Scene` union, the validation
 * the studio applies, and the list the renderer's component registry is checked
 * against are all derived from it, so a scene type cannot exist in one place
 * and be missing from another.
 *
 * Adding a scene type: write the schema in one of the sibling modules, add it
 * here, and add the component to the render kit's registry.
 */
export const SCENE_SCHEMAS = {
  title: TitleSceneSchema,
  steps: StepsSceneSchema,
  code: CodeSceneSchema,
  terminal: TerminalSceneSchema,
  architecture: ArchitectureSceneSchema,
  flow: FlowSceneSchema,
  compare: CompareSceneSchema,
  stats: StatsSceneSchema,
  bigStat: BigStatSceneSchema,
  counting: CountingSceneSchema,
  colors: ColorsSceneSchema,
  flashcards: FlashcardsSceneSchema,
  chart: ChartSceneSchema,
  timeline: TimelineSceneSchema,
  kineticText: KineticTextSceneSchema,
  image: ImageSceneSchema,
  videoClip: VideoClipSceneSchema,
  countdown: CountdownSceneSchema,
  numberLine: NumberLineSceneSchema,
  labeledDiagram: LabeledDiagramSceneSchema,
  quiz: QuizSceneSchema,
  callout: CalloutSceneSchema,
  arrayViz: ArrayVizSceneSchema,
  algorithm: AlgorithmSceneSchema,
  tokens: TokensSceneSchema,
  meter: MeterSceneSchema,
  motionCanvas: MotionCanvasSceneSchema,
  outro: OutroSceneSchema,
} as const;

export const SCENE_TYPES = Object.keys(SCENE_SCHEMAS) as SceneType[];

/**
 * Discriminated on `type`, so a bad `code` scene reports what a code scene
 * needs rather than the failure of all twenty-eight alternatives. Every member
 * is a plain strict object for that reason; the cross-field rules that cannot
 * be expressed structurally are applied once, below.
 */
const SceneUnion = z.discriminatedUnion(
  'type',
  Object.values(SCENE_SCHEMAS) as unknown as [
    (typeof SCENE_SCHEMAS)[SceneType],
    ...(typeof SCENE_SCHEMAS)[SceneType][],
  ],
);

export const SceneSchema = SceneUnion.superRefine((scene, context) => {
  if (scene.type === 'quiz' && scene.answerIndex >= scene.options.length) {
    context.addIssue({
      code: 'custom',
      path: ['answerIndex'],
      message: 'The answer must point at one of the options.',
    });
  }
  if (scene.type === 'motionCanvas') refineMotionCanvasScene(scene, context);
});

export type SceneType = keyof typeof SCENE_SCHEMAS;
export type Scene = z.infer<typeof SceneSchema>;

/** Narrow a scene to one type, for code that handles a single kind. */
export type SceneOfType<T extends SceneType> = Extract<Scene, {type: T}>;

export const SceneTypeSchema = z.enum(
  Object.keys(SCENE_SCHEMAS) as [SceneType, ...SceneType[]],
);

// --------------------------------------------------------------- named shapes
//
// One alias per scene type, derived from the union rather than declared beside
// it, so a scene component's props and the schema that validates its data can
// never disagree.

export type TitleScene = SceneOfType<'title'>;
export type StepsScene = SceneOfType<'steps'>;
export type CodeScene = SceneOfType<'code'>;
export type TerminalScene = SceneOfType<'terminal'>;
export type ArchitectureScene = SceneOfType<'architecture'>;
export type FlowScene = SceneOfType<'flow'>;
export type CompareScene = SceneOfType<'compare'>;
export type StatsScene = SceneOfType<'stats'>;
export type BigStatScene = SceneOfType<'bigStat'>;
export type CountingScene = SceneOfType<'counting'>;
export type ColorsScene = SceneOfType<'colors'>;
export type FlashcardsScene = SceneOfType<'flashcards'>;
export type ChartScene = SceneOfType<'chart'>;
export type TimelineScene = SceneOfType<'timeline'>;
export type KineticTextScene = SceneOfType<'kineticText'>;
export type ImageScene = SceneOfType<'image'>;
export type VideoClipScene = SceneOfType<'videoClip'>;
export type CountdownScene = SceneOfType<'countdown'>;
export type NumberLineScene = SceneOfType<'numberLine'>;
export type LabeledDiagramScene = SceneOfType<'labeledDiagram'>;
export type QuizScene = SceneOfType<'quiz'>;
export type CalloutScene = SceneOfType<'callout'>;
export type ArrayVizScene = SceneOfType<'arrayViz'>;
export type AlgorithmScene = SceneOfType<'algorithm'>;
export type TokensScene = SceneOfType<'tokens'>;
export type MeterScene = SceneOfType<'meter'>;
export type MotionCanvasScene = SceneOfType<'motionCanvas'>;
export type OutroScene = SceneOfType<'outro'>;

// Row and item shapes, likewise derived from their parent scene.
export type ArchNode = ArchitectureScene['nodes'][number];
export type ArchEdge = ArchitectureScene['edges'][number];
export type AlgorithmStep = AlgorithmScene['steps'][number];
export type ChartBar = ChartScene['bars'][number];
export type ColorSwatch = ColorsScene['items'][number];
export type DiagramLabel = LabeledDiagramScene['labels'][number];
export type FlashcardItem = FlashcardsScene['items'][number];
export type KineticBeat = KineticTextScene['beats'][number];
export type NumberLineMark = NumberLineScene['marks'][number];
export type QuizOption = QuizScene['options'][number];
export type TimelineEvent = TimelineScene['events'][number];
export type TokenItem = TokensScene['items'][number];
export type MotionCanvasElement = MotionCanvasScene['elements'][number];
export type MotionCanvasAction = MotionCanvasScene['actions'][number];
export type MotionCanvasPosition = {x: number; y: number};
export type LicensedVisualAsset = ImageScene['image'];
