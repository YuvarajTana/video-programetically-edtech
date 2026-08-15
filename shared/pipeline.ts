/**
 * The canonical production path used by the Studio, the job runner, and CLI
 * reports. Topic, script, and scene breakdown are pre-production gates; every
 * stage after them is derived from an immutable project revision.
 */
export const PRODUCTION_PIPELINE = [
  {id: 'topic', label: 'Topic'},
  {id: 'script', label: 'Script'},
  {id: 'scene-breakdown', label: 'Scene breakdown'},
  {id: 'tts', label: 'TTS generation'},
  {id: 'timestamps', label: 'Word / sentence timestamps'},
  {id: 'timeline', label: 'Master timeline'},
  {
    id: 'composition',
    label: 'Synchronized tracks',
    tracks: ['Visuals', 'Motion', 'Captions'],
  },
  {id: 'audio', label: 'Audio + SFX'},
  {id: 'render', label: 'Final render'},
  {id: 'qa', label: 'QA'},
] as const;

export type ProductionStageId = (typeof PRODUCTION_PIPELINE)[number]['id'];

const legacyStageAliases: Record<string, ProductionStageId> = {
  queued: 'topic',
  validate: 'topic',
  captions: 'timestamps',
  voice: 'tts',
  package: 'qa',
  completed: 'qa',
};

export const canonicalProductionStage = (stage: string): ProductionStageId | null => {
  const direct = PRODUCTION_PIPELINE.find((item) => item.id === stage);
  return direct?.id ?? legacyStageAliases[stage] ?? null;
};

export const productionStageLabel = (stage: string) => {
  const canonical = canonicalProductionStage(stage);
  return canonical
    ? PRODUCTION_PIPELINE.find((item) => item.id === canonical)?.label ?? stage
    : stage.replaceAll('-', ' ');
};

export const productionStageIndex = (stage: string) => {
  const canonical = canonicalProductionStage(stage);
  return canonical
    ? PRODUCTION_PIPELINE.findIndex((item) => item.id === canonical)
    : -1;
};
