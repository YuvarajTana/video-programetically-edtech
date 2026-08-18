import {z} from 'zod';
import type {ChannelProfile} from './channels';
import type {VideoSpec} from './spec';
import {SupportedLocaleSchema, type LanguageDefinition} from './languages';

export {IdentifierSchema, LocaleSchema} from './identifiers';
import {IdentifierSchema} from './identifiers';
export const DeliverySchema = z.enum([
  'youtube-long',
  'youtube-short',
  'instagram-reel',
  'instagram-feed',
  'instagram-carousel',
]);
// Scene shapes, the accent enum, managed image paths and the motion-canvas
// element/action schemas all live with the spec now, so there is one definition
// of a scene rather than a strict one for the renderer and a loose one here.
export {
  AccentSchema,
  ManagedImagePathSchema,
  MotionCanvasActionSchema,
  MotionCanvasElementSchema,
  SceneSchema,
  SceneTypeSchema,
} from './spec';
import {SceneSchema, SceneTypeSchema} from './spec';
import {LocaleSchema} from './identifiers';

export const EditableVideoSpecSchema = z.object({
  channel: IdentifierSchema,
  slug: IdentifierSchema,
  title: z.string().min(1).max(180),
  template: IdentifierSchema,
  kind: z.enum(['video', 'style-guide']).optional(),
  summary: z.string().max(1_000).optional(),
  fps: z.number().int().min(12).max(60).default(30),
  deliveries: z.array(DeliverySchema).min(1).max(4),
  audience: z
    .object({
      ageBand: z.string().max(80).optional(),
      level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    })
    .optional(),
  editorial: z
    .object({
      language: LocaleSchema.default('en-US'),
      objective: z.string().max(1_000).optional(),
      sources: z
        .array(z.object({title: z.string().min(1), url: z.url().optional()}))
        .optional(),
      safetyStatus: z.enum(['draft', 'reviewed', 'approved']).optional(),
    })
    .optional(),
  audio: z.string().max(500).optional(),
  captionTimings: z.string().max(500).optional(),
  soundtrack: z
    .object({
      music: z
        .object({
          src: z
            .enum([
              'audio/music/quiet-circuit-ambient.m4a',
              'audio/music/momentum-grid.m4a',
              'audio/music/playful-orbit.m4a',
            ]),
          credit: z.string().trim().min(1).max(200),
          license: z.string().trim().min(1).max(200),
          sourceUrl: z.url().optional(),
          volume: z.number().min(0).max(1).optional(),
          startFrame: z.number().int().min(0).optional(),
          trimBefore: z.number().int().min(0).optional(),
          loop: z.boolean().optional(),
          fadeInFrames: z.number().int().min(0).optional(),
          fadeOutFrames: z.number().int().min(0).optional(),
        })
        .optional(),
      effects: z
        .array(
          z.object({
            src: z
              .string()
              .max(500)
              .regex(
                /^audio\/[a-z0-9][a-z0-9/._-]*\.(?:m4a|mp3|wav|ogg)$/,
                'Sound effects must reference a managed public audio asset.',
              ),
            credit: z.string().trim().min(1).max(200),
            license: z.string().trim().min(1).max(200),
            sourceUrl: z.url().optional(),
            volume: z.number().min(0).max(1).optional(),
            startFrame: z.number().int().min(0),
            trimBefore: z.number().int().min(0).optional(),
            durationInFrames: z.number().int().positive().optional(),
          }),
        )
        .max(100)
        .optional(),
      ducking: z
        .object({
          gain: z.number().min(0).max(1).optional(),
          attackFrames: z.number().int().min(0).optional(),
          releaseFrames: z.number().int().min(0).optional(),
        })
        .optional(),
    })
    .optional(),
  captions: z.boolean().default(true),
  scenes: z.array(SceneSchema).min(1).max(250),
});

export const ThemeDefinitionSchema = z.object({
  id: IdentifierSchema,
  color: z.object({
    bg: z.string(),
    bgDeep: z.string(),
    surface: z.string(),
    surfaceHi: z.string(),
    line: z.string(),
    lineHi: z.string(),
    text: z.string(),
    textDim: z.string(),
    muted: z.string(),
  }),
  accents: z.object({
    primary: z.string(),
    secondary: z.string(),
    success: z.string(),
    attention: z.string(),
    info: z.string(),
  }),
  font: z.object({
    display: z.string(),
    body: z.string(),
    mono: z.string(),
  }),
  frameBackground: z.string(),
  chrome: z.object({
    progressHeight: z.number().min(1).max(24),
    progressOpacity: z.number().min(0).max(1),
    captionRadius: z.number().min(0).max(999),
  }),
});

export const TemplateSlotSchema = z.object({
  id: IdentifierSchema,
  label: z.string().min(1).max(80),
  sceneType: SceneTypeSchema,
  durationSeconds: z.number().min(0.5).max(120),
  required: z.boolean().default(false),
  repeatable: z.boolean().default(false),
  defaultProps: z.record(z.string(), z.unknown()).default({}),
});

export const TemplateDefinitionSchema = z.object({
  id: IdentifierSchema,
  label: z.string().min(1).max(100),
  description: z.string().max(400),
  slots: z.array(TemplateSlotSchema).min(1).max(30),
});

export const VoiceProfileSchema = z
  .object({
    model: z.string().min(1),
    preset: z.string().min(1),
    speed: z.number().min(0.5).max(2),
    maxSpeed: z.number().min(0.5).max(2.5).optional(),
    language: z.string().min(1),
    targetLufs: z.number().min(-30).max(-5),
    truePeakDb: z.number().min(-10).max(0),
    loudnessRange: z.number().min(1).max(30),
  })
  .superRefine((voice, context) => {
    if (voice.maxSpeed !== undefined && voice.maxSpeed < voice.speed) {
      context.addIssue({
        code: 'custom',
        path: ['maxSpeed'],
        message: 'Maximum timing-fit speed cannot be lower than voice speed.',
      });
    }
  });

export const CategoryDefinitionSchema = z.object({
  id: IdentifierSchema,
  label: z.string().min(1).max(100),
  shortLabel: z.string().min(1).max(100),
  handle: z.string().min(1).max(100),
  defaultDeliveries: z.array(DeliverySchema).min(1),
  defaultTemplateId: IdentifierSchema,
  defaultThemeId: IdentifierSchema,
  defaultCta: z.string().max(160),
  defaultHashtags: z.object({
    youtube: z.array(z.string()),
    instagram: z.array(z.string()),
  }),
  voice: VoiceProfileSchema,
  editorial: z.object({
    minSeconds: z.number().min(1),
    maxSeconds: z.number().max(3_600),
    maxNarrationWpm: z.number().min(60).max(400),
    requiresAgeBand: z.boolean().optional(),
    requiresLearningObjective: z.boolean().optional(),
    requiresSafetyReview: z.boolean().optional(),
  }),
});

export const CreateProjectSchema = z.object({
  title: z.string().trim().min(1).max(180),
  categoryId: IdentifierSchema,
  templateId: IdentifierSchema,
  themeId: IdentifierSchema,
  locale: SupportedLocaleSchema.default('en-US'),
  deliveries: z.array(DeliverySchema).min(1).max(4),
  script: z.string().max(100_000).default(''),
  targetSeconds: z.number().int().min(10).max(1_800).optional(),
});

export const VideoFormatSchema = z.enum(['reel', 'full']);
export const AudioModeSchema = z.enum(['voiceover', 'music-only']);

export const ScriptGenerationInputSchema = z.object({
  topic: z.string().trim().min(3).max(500),
  format: VideoFormatSchema,
  targetSeconds: z.number().int().min(60).max(1_800).optional(),
  categoryId: IdentifierSchema,
  templateId: IdentifierSchema,
  locale: SupportedLocaleSchema.default('en-US'),
  audioMode: AudioModeSchema.default('voiceover'),
  audienceLevel: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .default('beginner'),
  direction: z.string().trim().max(2_000).default(''),
}).superRefine((input, context) => {
  if (input.targetSeconds === undefined) return;
  if (input.format === 'reel' && input.targetSeconds !== 60) {
    context.addIssue({
      code: 'custom',
      path: ['targetSeconds'],
      message: 'Reel scripts must target 60 seconds.',
    });
  }
  if (
    input.format === 'full' &&
    ![300, 600, 900, 1_200, 1_500, 1_800].includes(input.targetSeconds)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['targetSeconds'],
      message: 'Full videos must target 5, 10, 15, 20, 25, or 30 minutes.',
    });
  }
});

export const GeneratedScriptSceneSchema = z.object({
  sceneType: z.enum([
    'title',
    'steps',
    'code',
    'terminal',
    'architecture',
    'flow',
    'compare',
    'stats',
    'bigStat',
    'counting',
    'colors',
    'flashcards',
    'callout',
    'arrayViz',
    'outro',
  ]),
  purpose: z.string().trim().min(1).max(240),
  narration: z.string().trim().min(1).max(2_000),
  visualDirection: z.string().trim().min(1).max(500),
  onScreenText: z.string().trim().min(1).max(180),
  visualLabels: z.array(z.string().trim().min(1).max(80)).max(8),
  codeVisual: z.string().trim().max(2_000),
});

export const GeneratedScriptSchema = z.object({
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(500),
  scenes: z.array(GeneratedScriptSceneSchema).min(3).max(80),
  reviewChecklist: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
});

export const UpdateProjectSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  locale: LocaleSchema.optional(),
  spec: EditableVideoSpecSchema.optional(),
  themeId: IdentifierSchema.optional(),
  templateId: IdentifierSchema.optional(),
});

export const TranslationStatusSchema = z.enum([
  'draft',
  'in_review',
  'approved',
  'stale',
]);
export const TranslationUnitStatusSchema = z.enum([
  'draft',
  'approved',
  'stale',
]);
export const VoiceProviderSchema = z.enum([
  'kokoro',
  'chatterbox',
  'f5tts',
  'indicf5',
  'elevenlabs',
  'uploaded',
]);
export const VoiceProfileStatusSchema = z.enum([
  'draft',
  'ready',
  'revoked',
]);
export const JobKindSchema = z.enum([
  'production',
  'translation',
  'voice-validation',
]);

export const CreateProductionJobSchema = z.object({
  kind: z.literal('production').default('production'),
  projectId: z.uuid(),
  variantId: z.uuid(),
  generateVoice: z.boolean().default(true),
  provider: VoiceProviderSchema.optional(),
  voiceProfileVersionId: z.uuid().optional(),
  cloudConfirmed: z.boolean().default(false),
});

export const CreateTranslationJobSchema = z.object({
  kind: z.literal('translation'),
  projectId: z.uuid(),
  variantId: z.uuid(),
});

export const CreateVoiceValidationJobSchema = z.object({
  kind: z.literal('voice-validation'),
  voiceProfileVersionId: z.uuid(),
});

export const CreateJobSchema = z.union([
  CreateProductionJobSchema,
  CreateTranslationJobSchema,
  CreateVoiceValidationJobSchema,
]);

export const CreateVariantSchema = z.object({
  locale: SupportedLocaleSchema,
});

export const UpdateTranslationUnitSchema = z.object({
  translatedText: z.string().trim().min(1).max(8_000).optional(),
  reviewerNote: z.string().trim().max(1_000).nullable().optional(),
  status: TranslationUnitStatusSchema.optional(),
});

export const GlossaryEntrySchema = z.object({
  sourceTerm: z.string().trim().min(1).max(160),
  translatedTerm: z.string().trim().max(160).nullable().optional(),
  mode: z.enum(['preserve', 'translate']).default('preserve'),
});

export const CreateVoiceProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    ownerName: z.string().trim().min(1).max(100),
    adultAttested: z.literal(true),
    ownershipAttested: z.literal(true),
    consentPhrase: z.string().trim().min(20).max(1_000),
    provider: VoiceProviderSchema.default('indicf5'),
    model: z.string().trim().min(1).max(200).default('ai4bharat/IndicF5'),
    enabledLocales: z.array(SupportedLocaleSchema).min(1).max(7),
    cloudAllowed: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (/^(?:sk_|sk-|xi-|api[_-]?)/iu.test(value.model)) {
      context.addIssue({
        code: 'custom',
        path: ['model'],
        message: 'Enter a public model or voice identifier, never an API key.',
      });
    }
    if (
      value.provider === 'indicf5' &&
      value.enabledLocales.includes('en-US')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['enabledLocales'],
        message: 'IndicF5 supports Indian languages only. Use Local F5 for English.',
      });
    }
    if (value.provider === 'elevenlabs' && !value.cloudAllowed) {
      context.addIssue({
        code: 'custom',
        path: ['cloudAllowed'],
        message: 'ElevenLabs requires explicit permission to upload voice data.',
      });
    }
    if (
      value.provider === 'elevenlabs' &&
      value.enabledLocales.some(
        (locale) => !['en-US', 'hi-IN', 'ta-IN'].includes(locale),
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['enabledLocales'],
        message:
          'The configured ElevenLabs multilingual route supports English, Hindi, and Tamil only.',
      });
    }
  });

export const VoiceSampleMetadataSchema = z.object({
  purpose: z.enum(['consent', 'reference']),
  locale: SupportedLocaleSchema,
  transcript: z.string().trim().min(1).max(8_000),
});

export const JobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'interrupted',
]);
export const JobStageSchema = z.enum([
  'queued',
  'translation',
  'voice-validation',
  'validate',
  'topic',
  'script',
  'scene-breakdown',
  'tts',
  'timestamps',
  'timeline',
  'composition',
  'audio',
  'captions',
  'voice',
  'render',
  'qa',
  'package',
  'completed',
]);

export type EditableVideoSpec = z.infer<typeof EditableVideoSpecSchema>;
export type ThemeDefinition = z.infer<typeof ThemeDefinitionSchema>;
export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;
export type CategoryDefinition = z.infer<typeof CategoryDefinitionSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type VideoFormat = z.infer<typeof VideoFormatSchema>;
export type AudioMode = z.infer<typeof AudioModeSchema>;
export type ScriptGenerationInput = z.infer<typeof ScriptGenerationInputSchema>;
export type GeneratedScript = z.infer<typeof GeneratedScriptSchema>;
export type GeneratedScriptScene = z.infer<typeof GeneratedScriptSceneSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobStage = z.infer<typeof JobStageSchema>;
export type JobKind = z.infer<typeof JobKindSchema>;
export type TranslationStatus = z.infer<typeof TranslationStatusSchema>;
export type VoiceProvider = z.infer<typeof VoiceProviderSchema>;

export type CatalogTheme = {
  id: string;
  label: string;
  versionId: string;
  version: number;
  definition: ThemeDefinition;
};

export type CatalogTemplate = {
  id: string;
  label: string;
  versionId: string;
  version: number;
  definition: TemplateDefinition;
};

export type ProjectRecord = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'ready' | 'archived';
  categoryId: string;
  templateId: string;
  themeId: string;
  defaultLocale: string;
  masterVariantId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VariantRecord = {
  id: string;
  projectId: string;
  locale: string;
  spec: EditableVideoSpec;
  sourceVariantId: string | null;
  translationStatus: TranslationStatus;
  sourceRevisionHash: string | null;
  approvedAt: string | null;
  voiceProfileVersionId: string | null;
  narrationAssetId: string | null;
  updatedAt: string;
};

export type NarrationAssetRecord = {
  id: string;
  label: string;
  locale: string;
  originalFilename: string;
  mimeType: string;
  durationSeconds: number;
  checksum: string;
  sizeBytes: number;
  usage: 'reference' | 'finished';
  createdAt: string;
};

export type ProjectImageAsset = {
  id: string;
  projectId: string;
  src: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type ResolvedProject = {
  project: ProjectRecord;
  variant: VariantRecord;
  category: CategoryDefinition;
  theme: CatalogTheme;
  template: CatalogTemplate;
  channel: ChannelProfile;
  variants: VariantRecord[];
};

export type RenderSnapshot = {
  schemaVersion: 1;
  project: ProjectRecord;
  variant: VariantRecord;
  spec: VideoSpec;
  channel: ChannelProfile;
  themeVersionId: string;
  templateVersionId: string;
  createdAt: string;
};

export type JobRecord = {
  id: string;
  projectId: string;
  variantId: string;
  revisionId: string;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  generateVoice: boolean;
  kind: JobKind;
  provider: VoiceProvider | null;
  cloudConfirmed: boolean;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type ArtifactRecord = {
  id: string;
  jobId: string;
  kind: string;
  deliveryId: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
};

export type JobDetail = JobRecord & {
  events: Array<{
    id: number;
    stage: JobStage;
    level: 'info' | 'error';
    message: string;
    progress: number;
    createdAt: string;
  }>;
  artifacts: ArtifactRecord[];
};

export type TranslationUnitRecord = {
  id: string;
  variantId: string;
  sceneId: string;
  fieldPath: string;
  sourceText: string;
  sourceHash: string;
  pivotText: string | null;
  translatedText: string;
  status: z.infer<typeof TranslationUnitStatusSchema>;
  reviewerNote: string | null;
  approvedAt: string | null;
  updatedAt: string;
};

export type GlossaryEntryRecord = z.infer<typeof GlossaryEntrySchema> & {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
};

export type VoiceProfileVersionRecord = {
  id: string;
  profileId: string;
  version: number;
  provider: VoiceProvider;
  model: string;
  primarySampleId: string | null;
  consentId: string;
  enabledLocales: string[];
  cloudAllowedAt: string | null;
  createdAt: string;
};

export type VoiceProfileRecord = {
  id: string;
  name: string;
  ownerName: string;
  status: z.infer<typeof VoiceProfileStatusSchema>;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  activeVersion: VoiceProfileVersionRecord | null;
};

export type VoiceSampleRecord = {
  id: string;
  profileId: string;
  purpose: 'consent' | 'reference';
  locale: string;
  transcript: string;
  mimeType: string;
  durationSeconds: number | null;
  checksum: string;
  quality: {
    valid: boolean;
    issues: string[];
    sizeBytes: number;
  };
  createdAt: string;
};

export type ModelStatus = {
  id: 'indictrans2' | 'f5tts' | 'indicf5' | 'chatterbox';
  label: string;
  installed: boolean;
  device: 'mps' | 'cpu' | 'unavailable';
  detail: string;
};

export type LanguageCatalog = {
  languages: LanguageDefinition[];
  models: ModelStatus[];
};

export type ScriptGenerationStatus = {
  configured: boolean;
  provider: 'openai';
  model: string;
  detail: string;
};

export type GeneratedScriptResult = GeneratedScript & {
  paragraphs: string[];
  script: string;
  wordCount: number;
  targetSeconds: number;
  model: string;
  contextVersion: string;
};
