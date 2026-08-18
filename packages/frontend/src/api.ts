import type {
  ArtifactRecord,
  CatalogTemplate,
  CatalogTheme,
  CategoryDefinition,
  CreateProjectInput,
  JobDetail,
  JobRecord,
  LanguageCatalog,
  NarrationAssetRecord,
  ProjectRecord,
  ProjectImageAsset,
  ResolvedProject,
  TemplateDefinition,
  ThemeDefinition,
  UpdateProjectInput,
  TranslationUnitRecord,
  GlossaryEntryRecord,
  VoiceProfileRecord,
  VoiceSampleRecord,
  GeneratedScriptResult,
  ScriptGenerationInput,
  ScriptGenerationStatus,
} from '@video-kit/core/contracts';
import type {MusicTrackCatalogItem} from '@video-kit/core/music';

export type Catalog = {
  categories: CategoryDefinition[];
  themes: CatalogTheme[];
  templates: CatalogTemplate[];
};

export type LegacyVideo = {
  ref: string;
  title: string;
  categoryId: string;
  durationSeconds: number;
  scenes: number;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? {'Content-Type': 'application/json'} : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | {error?: string; issues?: Array<{path: string; message: string}>}
      | null;
    const detail = body?.issues
      ?.map((issue) => `${issue.path}: ${issue.message}`)
      .join('\n');
    throw new Error(detail || body?.error || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
};

export const api = {
  catalog: () => request<Catalog>('/api/catalog'),
  music: () => request<MusicTrackCatalogItem[]>('/api/music'),
  musicAudioUrl: (id: string) => `/api/music/${encodeURIComponent(id)}/audio`,
  projects: () => request<ProjectRecord[]>('/api/projects'),
  languages: () => request<LanguageCatalog>('/api/languages'),
  scriptGenerationStatus: () =>
    request<ScriptGenerationStatus>('/api/script-generation/status'),
  generateScript: (input: ScriptGenerationInput) =>
    request<GeneratedScriptResult>('/api/script-generation/generate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  project: (id: string, variantId?: string) =>
    request<ResolvedProject>(
      `/api/projects/${id}${variantId ? `?variantId=${encodeURIComponent(variantId)}` : ''}`,
    ),
  createProject: (input: CreateProjectInput) =>
    request<ResolvedProject>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateProject: (id: string, input: UpdateProjectInput) =>
    request<ResolvedProject>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  createVariant: (projectId: string, locale: string) =>
    request<ResolvedProject>(`/api/projects/${projectId}/variants`, {
      method: 'POST',
      body: JSON.stringify({locale}),
    }),
  updateVariant: (
    projectId: string,
    variantId: string,
    input: {
      spec?: ResolvedProject['variant']['spec'];
      voiceProfileVersionId?: string | null;
      narrationAssetId?: string | null;
    },
  ) =>
    request<ResolvedProject>(
      `/api/projects/${projectId}/variants/${variantId}`,
      {method: 'PUT', body: JSON.stringify(input)},
    ),
  promoteVariant: (projectId: string, variantId: string) =>
    request<ResolvedProject>(
      `/api/projects/${projectId}/variants/${variantId}/promote`,
      {method: 'POST'},
    ),
  translations: (projectId: string, variantId: string) =>
    request<TranslationUnitRecord[]>(
      `/api/projects/${projectId}/variants/${variantId}/translations`,
    ),
  updateTranslation: (
    projectId: string,
    variantId: string,
    unitId: string,
    input: {
      translatedText?: string;
      reviewerNote?: string | null;
      status?: 'draft' | 'approved' | 'stale';
    },
  ) =>
    request<{
      project: ResolvedProject;
      units: TranslationUnitRecord[];
    }>(
      `/api/projects/${projectId}/variants/${variantId}/translations/${unitId}`,
      {method: 'PUT', body: JSON.stringify(input)},
    ),
  approveVariant: (projectId: string, variantId: string) =>
    request<ResolvedProject>(
      `/api/projects/${projectId}/variants/${variantId}/approve`,
      {method: 'POST'},
    ),
  glossary: (projectId: string) =>
    request<GlossaryEntryRecord[]>(`/api/projects/${projectId}/glossary`),
  saveGlossary: (
    projectId: string,
    input: {
      sourceTerm: string;
      translatedTerm?: string | null;
      mode: 'preserve' | 'translate';
    },
  ) =>
    request<GlossaryEntryRecord[]>(`/api/projects/${projectId}/glossary`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteGlossary: (projectId: string, entryId: string) =>
    request<GlossaryEntryRecord[]>(
      `/api/projects/${projectId}/glossary/${entryId}`,
      {method: 'DELETE'},
    ),
  importScript: (id: string, script: string) =>
    request<ResolvedProject>(`/api/projects/${id}/import-script`, {
      method: 'POST',
      body: JSON.stringify({script}),
    }),
  uploadProjectImage: async (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file, file.name);
    const response = await fetch(`/api/projects/${projectId}/images`, {
      method: 'POST',
      body: form,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | {error?: string}
        | null;
      throw new Error(body?.error ?? `Image upload failed (${response.status})`);
    }
    return response.json() as Promise<ProjectImageAsset>;
  },
  legacyVideos: () => request<LegacyVideo[]>('/api/legacy-videos'),
  cloneLegacy: (ref: string) =>
    request<ResolvedProject>(`/api/legacy-videos/${ref}/clone`, {
      method: 'POST',
    }),
  jobs: () => request<JobRecord[]>('/api/jobs'),
  job: (id: string) => request<JobDetail>(`/api/jobs/${id}`),
  createJob: (projectId: string, variantId: string, generateVoice: boolean) =>
    request<JobRecord>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({projectId, variantId, generateVoice}),
    }),
  createTranslationJob: (projectId: string, variantId: string) =>
    request<JobRecord>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({kind: 'translation', projectId, variantId}),
    }),
  createProductionJob: (input: {
    projectId: string;
    variantId: string;
    generateVoice: boolean;
    provider?:
      | 'kokoro'
      | 'chatterbox'
      | 'f5tts'
      | 'indicf5'
      | 'elevenlabs'
      | 'uploaded';
    voiceProfileVersionId?: string;
    cloudConfirmed?: boolean;
  }) =>
    request<JobRecord>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({kind: 'production', ...input}),
    }),
  cancelJob: (id: string) =>
    request<JobRecord>(`/api/jobs/${id}/cancel`, {method: 'POST'}),
  retryJob: (id: string) =>
    request<JobRecord>(`/api/jobs/${id}/retry`, {method: 'POST'}),
  cloneTheme: (sourceId: string, id: string, label: string) =>
    request<CatalogTheme>('/api/themes/clone', {
      method: 'POST',
      body: JSON.stringify({sourceId, id, label}),
    }),
  saveTheme: (id: string, definition: ThemeDefinition) =>
    request<CatalogTheme>(`/api/themes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(definition),
    }),
  cloneTemplate: (sourceId: string, id: string, label: string) =>
    request<CatalogTemplate>('/api/templates/clone', {
      method: 'POST',
      body: JSON.stringify({sourceId, id, label}),
    }),
  saveTemplate: (id: string, definition: TemplateDefinition) =>
    request<CatalogTemplate>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(definition),
    }),
  saveCategory: (definition: CategoryDefinition) =>
    request<CategoryDefinition>(`/api/categories/${definition.id}`, {
      method: 'PUT',
      body: JSON.stringify(definition),
    }),
  artifactUrl: (artifact: ArtifactRecord) =>
    `/api/artifacts/${artifact.id}/download`,
  voices: () => request<VoiceProfileRecord[]>('/api/voices'),
  narrations: () => request<NarrationAssetRecord[]>('/api/narrations'),
  uploadNarration: async (input: {
    file: Blob;
    filename: string;
    label: string;
    locale: string;
  }) => {
    const form = new FormData();
    form.append('label', input.label);
    form.append('locale', input.locale);
    form.append('file', input.file, input.filename);
    const response = await fetch('/api/narrations', {method: 'POST', body: form});
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | {error?: string}
        | null;
      throw new Error(body?.error ?? `Upload failed (${response.status})`);
    }
    return response.json() as Promise<NarrationAssetRecord>;
  },
  narrationAudioUrl: (id: string) => `/api/narrations/${id}/audio`,
  createVoice: (input: {
    name: string;
    ownerName: string;
    adultAttested: true;
    ownershipAttested: true;
    consentPhrase: string;
    provider: 'chatterbox' | 'f5tts' | 'indicf5' | 'elevenlabs';
    model: string;
    enabledLocales: string[];
    cloudAllowed: boolean;
  }) =>
    request<VoiceProfileRecord>('/api/voices', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  voice: (id: string) =>
    request<{
      profile: VoiceProfileRecord;
      samples: VoiceSampleRecord[];
      previews: Array<{
        locale: string;
        status: 'pending' | 'ready' | 'accepted';
        hasAudio: boolean;
        acceptedAt: string | null;
        updatedAt: string;
      }>;
    }>(
      `/api/voices/${id}`,
    ),
  uploadVoiceSample: async (
    profileId: string,
    input: {
      file: Blob;
      filename: string;
      purpose: 'consent' | 'reference';
      locale: string;
      transcript: string;
    },
  ) => {
    const form = new FormData();
    form.append('purpose', input.purpose);
    form.append('locale', input.locale);
    form.append('transcript', input.transcript);
    form.append('file', input.file, input.filename);
    const response = await fetch(`/api/voices/${profileId}/samples`, {
      method: 'POST',
      body: form,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | {error?: string}
        | null;
      throw new Error(body?.error ?? `Upload failed (${response.status})`);
    }
    return response.json() as Promise<VoiceSampleRecord>;
  },
  acceptVoicePreview: (profileId: string, locale: string) =>
    request<VoiceProfileRecord>(
      `/api/voices/${profileId}/previews/${locale}/accept`,
      {method: 'POST'},
    ),
  generateVoicePreview: (profileId: string, locale: string) =>
    request<{
      profileId: string;
      locale: string;
      language: string;
      audioUrl: string;
    }>(`/api/voices/${profileId}/previews/${locale}`, {method: 'POST'}),
  voicePreviewUrl: (profileId: string, locale: string) =>
    `/api/voices/${profileId}/previews/${locale}/audio`,
  revokeVoice: (id: string) =>
    request<VoiceProfileRecord>(`/api/voices/${id}/revoke`, {method: 'POST'}),
  deleteVoice: (id: string) =>
    request<{deleted: boolean}>(`/api/voices/${id}`, {method: 'DELETE'}),
  voiceSampleUrl: (id: string) => `/api/voice-samples/${id}/audio`,
};
