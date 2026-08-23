import {z} from 'zod';
import {AccentSchema, accented, sceneSchema} from '../base';

export const CodeSceneSchema = sceneSchema('code', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  lang: z.string().max(40).optional(),
  filename: z.string().max(200).optional(),
  lines: z.array(z.string().max(400)).min(1).max(60),
  /** Line numbers (1-based) to spotlight, revealed in order over the scene. */
  focus: z
    .array(
      z.strictObject({
        lines: z.array(z.number().int().min(1)).min(1).max(60),
        note: z.string().max(300).optional(),
      }),
    )
    .max(20)
    .optional(),
});

export const TerminalSceneSchema = sceneSchema('terminal', {
  title: z.string().max(300).optional(),
  host: z.string().max(120).optional(),
  entries: z
    .array(
      accented({
        cmd: z.string().max(400).optional(),
        out: z.array(z.string().max(400)).max(40).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const ArchitectureSceneSchema = sceneSchema('architecture', {
  title: z.string().max(300).optional(),
  kicker: z.string().max(120).optional(),
  nodes: z
    .array(
      accented({
        id: z.string().min(1).max(80),
        label: z.string().min(1).max(200),
        sub: z.string().max(200).optional(),
        /** Grid position. Columns run left→right, rows top→bottom. */
        col: z.number().int().min(0).max(20),
        row: z.number().int().min(0).max(20),
        /** Spans this many grid columns. */
        span: z.number().int().min(1).max(20).optional(),
      }),
    )
    .min(1)
    .max(30),
  edges: z
    .array(
      z.strictObject({
        from: z.string().min(1).max(80),
        to: z.string().min(1).max(80),
        label: z.string().max(200).optional(),
        dashed: z.boolean().optional(),
      }),
    )
    .max(60),
  /** Node ids revealed together, group by group, before any packet travels. */
  reveal: z.array(z.array(z.string().min(1).max(80)).max(30)).max(20).optional(),
  /** A packet animated along a path of node ids, to trace a request. */
  trace: accented({
    path: z.array(z.string().min(1).max(80)).min(2).max(30),
    label: z.string().max(200).optional(),
  }).optional(),
});

export const AlgorithmSceneSchema = sceneSchema('algorithm', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  values: z.array(z.union([z.number(), z.string().max(40)])).min(1).max(60),
  /**
   * The signature technique: the array, the status line, and the code all
   * advance on this one step clock, so the data and the executing line move
   * together.
   */
  steps: z
    .array(
      z.strictObject({
        /** Frame within the scene when this step becomes active. */
        atFrame: z.number().int().min(0).max(18_000),
        /**
         * One state character per value:
         * `.` idle · `c` comparing · `f` focus · `g` locked/found · `x` eliminated.
         */
        states: z.string().min(1).max(60),
        /** Status readout under the array, e.g. "lo=5 hi=6 mid=5". */
        status: z.string().max(200).optional(),
        /** 1-based line of `code` highlighted during this step. */
        codeLine: z.number().int().min(1).max(200).optional(),
        /** Pointer labels over cells, e.g. {lo: 0, mid: 4, hi: 9}. */
        pointers: z.record(z.string().max(40), z.number().int()).optional(),
      }),
    )
    .min(1)
    .max(200),
  code: z
    .strictObject({
      lines: z.array(z.string().max(400)).min(1).max(60),
      lang: z.string().max(40).optional(),
    })
    .optional(),
});

export const ArrayVizSceneSchema = sceneSchema('arrayViz', {
  title: z.string().max(300).optional(),
  algorithm: z.enum(['selection', 'bubble']),
  values: z.array(z.number()).min(2).max(60),
  /** Frames per comparison / swap / lock. Tune to fit the scene duration. */
  tempo: z
    .strictObject({
      compare: z.number().int().min(1).max(600),
      swap: z.number().int().min(1).max(600),
      lock: z.number().int().min(1).max(600),
    })
    .optional(),
});

export const TokensSceneSchema = sceneSchema('tokens', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  items: z
    .array(
      z.strictObject({
        text: z.string().min(1).max(120),
        id: z.union([z.number(), z.string().max(60)]),
      }),
    )
    .min(1)
    .max(60),
  /** Frame when chips begin flipping text → id. Defaults to 45% of the scene. */
  flipAtFrame: z.number().int().min(0).max(18_000).optional(),
  footnote: z.string().max(300).optional(),
});

export const AccentEnum = AccentSchema;
