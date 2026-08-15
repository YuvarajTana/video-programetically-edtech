import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {z} from 'zod';

const FormatContextSchema = z.object({
  seconds: z.number().int().positive(),
  sceneCount: z.number().int().min(3).max(80),
  wordRange: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  structure: z.array(z.string().min(1)).min(2),
});

const ScriptContextSchema = z.object({
  version: z.string().min(1),
  product: z.object({
    mission: z.string().min(1),
    curriculum: z.array(z.string().min(1)).min(1),
    teachingSequence: z.array(z.string().min(1)).min(1),
  }),
  globalRules: z.array(z.string().min(1)).min(1),
  categories: z.record(
    z.string(),
    z.object({
      audience: z.string().min(1),
      tone: z.string().min(1),
      requirements: z.array(z.string().min(1)).min(1),
    }),
  ),
  formats: z.object({
    reel: FormatContextSchema,
    full: FormatContextSchema,
  }),
  examples: z.array(
    z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      format: z.enum(['reel', 'full']),
      topic: z.string().min(1),
      whyItWorks: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).min(1),
    }),
  ),
});

const contextPath = resolve('content', 'script-generation', 'context.json');

export const loadScriptContext = () =>
  ScriptContextSchema.parse(JSON.parse(readFileSync(contextPath, 'utf8')));

export type ScriptContext = z.infer<typeof ScriptContextSchema>;

export const contextForGeneration = (
  context: ScriptContext,
  categoryId: string,
  format: 'reel' | 'full',
) => ({
  contextVersion: context.version,
  mission: context.product.mission,
  curriculum: context.product.curriculum,
  teachingSequence: context.product.teachingSequence,
  globalRules: context.globalRules,
  category: context.categories[categoryId] ?? context.categories.tech,
  format: context.formats[format],
  examples: context.examples
    .filter((example) => example.category === categoryId && example.format === format)
    .slice(0, 1),
});
