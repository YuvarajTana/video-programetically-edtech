import {createHash} from 'node:crypto';
import type {EditableVideoSpec} from './contracts';

export type TranslatableField = {
  sceneId: string;
  fieldPath: string;
  sourceText: string;
};

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const protectedKeys = new Set([
  'id',
  'type',
  'accent',
  'durationInFrames',
  'lang',
  'cmd',
  'code',
  'hex',
  'url',
  'from',
  'to',
  'value',
  'number',
  'algorithm',
]);

const walk = (
  value: unknown,
  path: string[],
  sceneId: string,
  output: TranslatableField[],
) => {
  if (isText(value)) {
    const key = path.at(-1) ?? '';
    if (!protectedKeys.has(key)) {
      output.push({
        sceneId,
        fieldPath: path.join('.'),
        sourceText: value,
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      walk(entry, [...path, String(index)], sceneId, output),
    );
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (!protectedKeys.has(key)) walk(entry, [...path, key], sceneId, output);
    }
  }
};

export const extractTranslatableFields = (
  spec: EditableVideoSpec,
): TranslatableField[] => {
  const output: TranslatableField[] = [];
  spec.scenes.forEach((scene, index) => {
    const sceneId = scene.id ?? `scene-${index + 1}`;
    walk(scene, [], sceneId, output);
  });
  return output;
};

export const sourceTextHash = (value: string) =>
  createHash('sha256').update(value.normalize('NFC').trim()).digest('hex');

export const setFieldAtPath = (
  target: Record<string, unknown>,
  fieldPath: string,
  value: string,
) => {
  const segments = fieldPath.split('.');
  let cursor: Record<string, unknown> | unknown[] = target;
  for (const [index, segment] of segments.entries()) {
    if (index === segments.length - 1) {
      if (Array.isArray(cursor)) cursor[Number(segment)] = value;
      else cursor[segment] = value;
      return;
    }
    const next = Array.isArray(cursor)
      ? cursor[Number(segment)]
      : cursor[segment];
    if (!next || typeof next !== 'object') {
      throw new Error(`Translation field "${fieldPath}" no longer exists.`);
    }
    cursor = next as Record<string, unknown> | unknown[];
  }
};

export const protectTerms = (
  text: string,
  terms: string[],
): {text: string; restore: (translated: string) => string} => {
  const replacements = new Map<string, string>();
  const protectedText = [...new Set(terms)]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .reduce((value, term, index) => {
      const token = `__VK_TERM_${index}__`;
      const pattern = new RegExp(
        term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'gi',
      );
      if (!pattern.test(value)) return value;
      replacements.set(token, term);
      return value.replace(pattern, token);
    }, text);
  return {
    text: protectedText,
    restore: (translated) => {
      let value = translated;
      for (const [token, term] of replacements) {
        value = value.replaceAll(token, term);
      }
      return value;
    },
  };
};

