import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type {
  CatalogTemplate,
  CatalogTheme,
  CategoryDefinition,
  EditableVideoSpec,
  GeneratedScriptScene,
  JobDetail,
  JobRecord,
  LanguageCatalog,
  NarrationAssetRecord,
  ProjectRecord,
  ResolvedProject,
  TemplateDefinition,
  ThemeDefinition,
  TranslationUnitRecord,
  VoiceProfileRecord,
} from '../../shared/contracts';
import {LANGUAGES, type SupportedLocale} from '../../shared/languages';
import type {MusicTrackCatalogItem} from '../../shared/music';
import {
  LONG_FORM_MINUTES,
  MAX_VIDEO_SECONDS,
  secondsForVideoFormat,
  type LongFormMinutes,
} from '../../shared/durations';
import {slugify} from '../../shared/storyboard';
import {
  PRODUCTION_PIPELINE,
  productionStageIndex,
  productionStageLabel,
} from '../../shared/pipeline';
import {FORMATS, type FormatId} from '../../src/design/formatDefs';
import type {MotionCanvasElement, Scene, SceneType} from '../../src/types';
import {totalFrames} from '../../src/types';
import {api, type LegacyVideo} from './api';

// The Remotion player and the entire scene kit load on demand — they are the
// heaviest part of the bundle and only the editor's preview pane needs them.
const ScenePreview = lazy(() => import('./ScenePreview'));

type Catalog = Awaited<ReturnType<typeof api.catalog>>;
type View =
  | {name: 'dashboard'}
  | {name: 'new'}
  | {name: 'editor'; id: string}
  | {name: 'library'}
  | {name: 'jobs'; id?: string}
  | {name: 'audio'}
  | {name: 'legacy'};

const parseRoute = (): View => {
  const route = window.location.hash.replace(/^#\/?/, '');
  const [name, id] = route.split('/');
  if (name === 'projects' && id) return {name: 'editor', id};
  if (name === 'new') return {name: 'new'};
  if (name === 'library') return {name: 'library'};
  if (name === 'jobs') return {name: 'jobs', id};
  if (name === 'audio' || name === 'voices') return {name: 'audio'};
  if (name === 'legacy') return {name: 'legacy'};
  return {name: 'dashboard'};
};

const navigate = (path: string) => {
  window.location.hash = path;
};

const duration = (spec: EditableVideoSpec) =>
  totalFrames(spec as unknown as Parameters<typeof totalFrames>[0]) /
  (spec.fps ?? 30);

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
};

const ProductionPipelineMap = ({
  activeStage,
  completed = false,
}: {
  activeStage?: string;
  completed?: boolean;
}) => {
  const activeIndex = activeStage ? productionStageIndex(activeStage) : -1;
  return (
    <div className="production-pipeline" aria-label="Video production pipeline">
      {PRODUCTION_PIPELINE.map((stage, index) => {
        const state = completed || index < activeIndex
          ? 'complete'
          : index === activeIndex
            ? 'active'
            : '';
        return (
          <div className={`pipeline-step ${state}`} key={stage.id}>
            <span className="pipeline-index">{String(index + 1).padStart(2, '0')}</span>
            <strong>{stage.label}</strong>
            {'tracks' in stage ? (
              <div className="pipeline-tracks">
                {stage.tracks.map((track) => <small key={track}>{track}</small>)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const timeAgo = (value: string) => {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString();
};

const sceneLabel = (scene: Scene) => {
  if ('title' in scene && scene.title) return scene.title;
  if ('text' in scene && scene.text) return scene.text;
  if ('label' in scene && scene.label) return scene.label;
  if (scene.narration) return scene.narration;
  return scene.type;
};

const sceneFromType = (
  type: SceneType,
  current: Scene,
  index: number,
): Scene => {
  const base = {
    id: current.id ?? `scene-${index + 1}`,
    durationInFrames: current.durationInFrames,
    narration: current.narration,
    accent: current.accent,
  };
  const text = current.narration || 'Add narration here.';
  const conciseText =
    text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
  switch (type) {
    case 'title':
      return {...base, type, title: text, subtitle: ''};
    case 'steps':
      return {...base, type, kicker: text, items: [{label: 'First idea'}, {label: 'Second idea'}]};
    case 'code':
      return {...base, type, title: text, lang: 'text', lines: ['Your example here']};
    case 'terminal':
      return {...base, type, title: text, entries: [{cmd: 'echo "Hello video"'}]};
    case 'architecture':
      return {
        ...base,
        type,
        title: text,
        nodes: [
          {id: 'a', label: 'Input', col: 1, row: 1},
          {id: 'b', label: 'Output', col: 2, row: 1},
        ],
        edges: [{from: 'a', to: 'b'}],
      };
    case 'flow':
      return {...base, type, title: text, steps: [{label: 'Start'}, {label: 'Finish'}]};
    case 'compare':
      return {
        ...base,
        type,
        title: text,
        left: {heading: 'Before', points: ['Starting point']},
        right: {heading: 'After', points: ['Result']},
      };
    case 'stats':
      return {...base, type, title: text, cards: [{label: 'Metric', value: '100'}]};
    case 'bigStat':
      return {...base, type, value: String(index + 1), label: text};
    case 'counting':
      return {...base, type, number: index + 1, word: text};
    case 'colors':
      return {
        ...base,
        type,
        title: text,
        items: [{name: 'Orange', hex: '#ff7043', emoji: '●'}],
      };
    case 'flashcards':
      return {...base, type, title: text, items: [{label: 'Card', emoji: '★'}]};
    case 'arrayViz':
      return {...base, type, title: text, algorithm: 'selection', values: [5, 3, 8, 1]};
    case 'motionCanvas':
      return {
        ...base,
        type,
        style: 'midnight-code',
        motion: {intensity: 'dynamic', ambient: true},
        effects: {
          camera: 'push-in',
          particles: 'data-stream',
          glow: 'soft',
          scanlines: true,
          vignette: true,
        },
        headline: conciseText,
        elements: [
          {
            id: 'headline',
            kind: 'text',
            x: 50,
            y: 11,
            width: 92,
            role: 'headline',
            text: conciseText,
          },
        ],
        actions: [{target: 'headline', type: 'reveal', atFrame: 0, durationFrames: 18}],
      };
    case 'outro':
      return {...base, type, tagline: text, cta: 'Keep creating'};
    case 'callout':
    default:
      return {...base, type: 'callout', text};
  }
};

const sceneFromGeneratedPlan = (
  plan: GeneratedScriptScene,
  current: Scene,
  index: number,
): Scene => {
  const planned = sceneFromType(
    plan.sceneType,
    {...current, narration: plan.narration},
    index,
  );
  switch (planned.type) {
    case 'title':
      return {...planned, title: plan.onScreenText, subtitle: plan.purpose};
    case 'callout':
      return {...planned, text: plan.onScreenText};
    case 'code':
      return {
        ...planned,
        title: plan.onScreenText,
        lang: 'python',
        lines: plan.codeVisual
          ? plan.codeVisual.split('\n')
          : ['# Add the reviewed runnable example'],
      };
    case 'terminal':
      return {
        ...planned,
        title: plan.onScreenText,
        entries: plan.codeVisual
          ? plan.codeVisual.split('\n').filter(Boolean).map((cmd) => ({cmd}))
          : [{cmd: '# Add the reviewed command'}],
      };
    case 'flow':
      return {
        ...planned,
        title: plan.onScreenText,
        steps: (plan.visualLabels.length ? plan.visualLabels : ['Input', 'Result'])
          .map((label) => ({label})),
      };
    case 'steps':
      return {
        ...planned,
        kicker: plan.onScreenText,
        items: (plan.visualLabels.length ? plan.visualLabels : ['First', 'Then'])
          .map((label) => ({label})),
      };
    case 'architecture': {
      const labels = plan.visualLabels.length
        ? plan.visualLabels.slice(0, 4)
        : ['Input', 'Service', 'Output'];
      return {
        ...planned,
        title: plan.onScreenText,
        nodes: labels.map((label, labelIndex) => ({
          id: `node-${labelIndex + 1}`,
          label,
          col: labelIndex + 1,
          row: 1,
        })),
        edges: labels.slice(1).map((_, labelIndex) => ({
          from: `node-${labelIndex + 1}`,
          to: `node-${labelIndex + 2}`,
        })),
      };
    }
    case 'compare': {
      const labels = plan.visualLabels.length >= 4
        ? plan.visualLabels
        : ['Before', 'Repeated work', 'After', 'Shared behavior'];
      const middle = Math.ceil(labels.length / 2);
      return {
        ...planned,
        title: plan.onScreenText,
        left: {heading: labels[0], points: labels.slice(1, middle)},
        right: {heading: labels[middle], points: labels.slice(middle + 1)},
      };
    }
    case 'outro':
      return {...planned, tagline: plan.onScreenText};
    default:
      return 'title' in planned
        ? {...planned, title: plan.onScreenText}
        : planned;
  }
};

const STATUS_LABELS: Record<JobRecord['status'], string> = {
  queued: 'Queued',
  running: 'In progress',
  completed: 'Ready',
  failed: 'Needs attention',
  cancelled: 'Cancelled',
  interrupted: 'Interrupted',
};

export const App = () => {
  const [route, setRoute] = useState<View>(parseRoute);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [nextCatalog, nextProjects, nextJobs] = await Promise.all([
        api.catalog(),
        api.projects(),
        api.jobs(),
      ]);
      setCatalog(nextCatalog);
      setProjects(nextProjects);
      setJobs(nextJobs);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const listener = () => setRoute(parseRoute());
    window.addEventListener('hashchange', listener);
    void refresh();
    const interval = window.setInterval(() => void refresh(), 4_000);
    return () => {
      window.removeEventListener('hashchange', listener);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const activeJobs = jobs.filter(
    (job) => job.status === 'queued' || job.status === 'running',
  ).length;

  if (loading || !catalog) {
    return (
      <div className="boot">
        <div className="brand-mark">VK</div>
        <p>Preparing your local studio…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('/')}>
          <span className="brand-mark">VK</span>
          <span>
            <strong>Video Kit</strong>
            <small>Local studio</small>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <NavItem active={route.name === 'dashboard'} icon="⌂" label="Home" path="/" />
          <NavItem active={route.name === 'new'} icon="＋" label="New video" path="/new" />
          <NavItem active={route.name === 'library'} icon="▦" label="Library" path="/library" />
          <NavItem
            active={route.name === 'jobs'}
            icon="◌"
            label="Jobs"
            path="/jobs"
            badge={activeJobs || undefined}
          />
          <NavItem active={route.name === 'audio'} icon="◉" label="Voice & audio" path="/audio" />
          <NavItem active={route.name === 'legacy'} icon="↗" label="Existing videos" path="/legacy" />
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />
          <div>
            <strong>Running locally</strong>
            <small>Private to this Mac</small>
          </div>
        </div>
      </aside>
      <main className="main">
        {error ? (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        ) : null}
        {route.name === 'dashboard' ? (
          <Dashboard projects={projects} jobs={jobs} catalog={catalog} />
        ) : null}
        {route.name === 'new' ? (
          <NewProject catalog={catalog} onChanged={refresh} />
        ) : null}
        {route.name === 'editor' ? (
          <ProjectEditor id={route.id} onChanged={refresh} />
        ) : null}
        {route.name === 'library' ? (
          <Library catalog={catalog} onChanged={refresh} />
        ) : null}
        {route.name === 'jobs' ? (
          <Jobs jobs={jobs} selectedId={route.id} onChanged={refresh} />
        ) : null}
        {route.name === 'audio' ? <Voices /> : null}
        {route.name === 'legacy' ? <Legacy onChanged={refresh} /> : null}
      </main>
    </div>
  );
};

const NavItem = ({
  active,
  icon,
  label,
  path,
  badge,
}: {
  active: boolean;
  icon: string;
  label: string;
  path: string;
  badge?: number;
}) => (
  <button
    className={`nav-item ${active ? 'active' : ''}`}
    onClick={() => navigate(path)}
  >
    <span className="nav-icon">{icon}</span>
    <span>{label}</span>
    {badge ? <em>{badge}</em> : null}
  </button>
);

const PageHeader = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <header className="page-header">
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {action}
  </header>
);

const Dashboard = ({
  projects,
  jobs,
  catalog,
}: {
  projects: ProjectRecord[];
  jobs: JobRecord[];
  catalog: Catalog;
}) => {
  const latestJob = jobs[0];
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Your production desk</span>
          <h1>From a script to a finished video.</h1>
          <p>
            Shape the story, preview every frame, generate the voice, and render
            every delivery—all on this Mac.
          </p>
          <div className="button-row">
            <button className="button primary" onClick={() => navigate('/new')}>
              Create a video <span>→</span>
            </button>
            <button className="button quiet" onClick={() => navigate('/legacy')}>
              Use an existing video
            </button>
          </div>
        </div>
        <div className="hero-visual" aria-label="Production workflow">
          <div className="workflow-node done"><span>01</span>Script</div>
          <div className="workflow-line" />
          <div className="workflow-node current"><span>02</span>Shape</div>
          <div className="workflow-line" />
          <div className="workflow-node"><span>03</span>Render</div>
        </div>
      </section>
      <section className="metric-grid">
        <Metric label="Projects" value={String(projects.length)} note="Saved locally" />
        <Metric
          label="Active jobs"
          value={String(jobs.filter((j) => ['queued', 'running'].includes(j.status)).length)}
          note={latestJob ? `${latestJob.stage} · ${Math.round(latestJob.progress * 100)}%` : 'Queue is clear'}
        />
        <Metric label="Templates" value={String(catalog.templates.length)} note="Reusable story shapes" />
        <Metric label="Themes" value={String(catalog.themes.length)} note="Versioned visual systems" />
      </section>
      <div className="section-title">
        <div>
          <h2>Recent projects</h2>
          <p>Continue where you left off.</p>
        </div>
        <button className="text-button" onClick={() => navigate('/new')}>New project ＋</button>
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.slice(0, 6).map((project) => {
            const category = catalog.categories.find((item) => item.id === project.categoryId);
            const theme = catalog.themes.find((item) => item.id === project.themeId);
            return (
              <button
                className="project-card"
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{'--card-accent': theme?.definition.accents.primary} as React.CSSProperties}
              >
                <div className="project-card-top">
                  <span className="category-pill">{category?.shortLabel ?? project.categoryId}</span>
                  <span className="more">•••</span>
                </div>
                <div className="mini-frame">
                  <span>{project.title.slice(0, 1)}</span>
                  <i />
                </div>
                <h3>{project.title}</h3>
                <footer>
                  <span>{project.defaultLocale}</span>
                  <span>{timeAgo(project.updatedAt)}</span>
                </footer>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Your first video starts with a script"
          text="Choose a channel and template, paste your narration, then shape the generated scenes."
          action="Create the first project"
          onAction={() => navigate('/new')}
        />
      )}
    </div>
  );
};

const Metric = ({label, value, note}: {label: string; value: string; note: string}) => (
  <div className="metric">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </div>
);

const NewProject = ({
  catalog,
  onChanged,
}: {
  catalog: Catalog;
  onChanged: () => void;
}) => {
  const first =
    catalog.categories.find((category) => category.id === 'tech') ??
    catalog.categories[0];
  const recommendedTemplate = (
    nextCategoryId: string,
    nextFormat: 'reel' | 'full',
  ) => {
    const nextCategory = catalog.categories.find(
      (item) => item.id === nextCategoryId,
    )!;
    const preferred =
      nextCategoryId === 'tech'
        ? nextFormat === 'reel'
          ? 'tech-reel-runtime'
          : 'tech-youtube-deep-dive'
        : nextFormat === 'reel'
          ? nextCategory.defaultTemplateId
          : 'concept-explainer';
    return catalog.templates.some((item) => item.id === preferred)
      ? preferred
      : nextCategory.defaultTemplateId;
  };
  const [format, setFormat] = useState<'reel' | 'full'>('reel');
  const [longFormMinutes, setLongFormMinutes] =
    useState<LongFormMinutes>(5);
  const [scriptMode, setScriptMode] = useState<'ai' | 'manual'>('ai');
  const [categoryId, setCategoryId] = useState(first.id);
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState(
    recommendedTemplate(first.id, 'reel'),
  );
  const [themeId, setThemeId] = useState(first.defaultThemeId);
  const [locale, setLocale] = useState<SupportedLocale>('en-US');
  const [deliveries, setDeliveries] = useState<string[]>([
    'youtube-short',
    'instagram-reel',
  ]);
  const [topic, setTopic] = useState('');
  const [direction, setDirection] = useState('');
  const [script, setScript] = useState('');
  const [reviewChecklist, setReviewChecklist] = useState<string[]>([]);
  const [generatedScenes, setGeneratedScenes] = useState<GeneratedScriptScene[]>([]);
  const [scriptContextVersion, setScriptContextVersion] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState<
    Awaited<ReturnType<typeof api.scriptGenerationStatus>> | null
  >(null);
  const [narrations, setNarrations] = useState<NarrationAssetRecord[]>([]);
  const [voices, setVoices] = useState<VoiceProfileRecord[]>([]);
  const [musicTracks, setMusicTracks] = useState<MusicTrackCatalogItem[]>([]);
  const [audioMode, setAudioMode] = useState<'voiceover' | 'music-only'>(
    'voiceover',
  );
  const [musicTrackId, setMusicTrackId] = useState('');
  const [voiceProfileVersionId, setVoiceProfileVersionId] = useState('');
  const [narrationAssetId, setNarrationAssetId] = useState('');
  const [uploadingNarration, setUploadingNarration] = useState(false);
  const [narrationMatchesScript, setNarrationMatchesScript] = useState(false);

  useEffect(() => {
    let active = true;
    const refreshAudioOptions = () =>
      void Promise.all([api.narrations(), api.voices(), api.music()])
        .then(([assets, profiles, tracks]) => {
          if (active) {
            setNarrations(assets);
            setVoices(profiles);
            setMusicTracks(tracks);
            setMusicTrackId((current) => current || tracks[0]?.id || '');
          }
        })
        .catch(() => undefined);
    void Promise.all([
      api.scriptGenerationStatus(),
      api.narrations(),
      api.voices(),
      api.music(),
    ])
      .then(([status, assets, profiles, tracks]) => {
        if (!active) return;
        setAiStatus(status);
        setNarrations(assets);
        setVoices(profiles);
        setMusicTracks(tracks);
        setMusicTrackId((current) => current || tracks[0]?.id || '');
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });
    const timer = window.setInterval(refreshAudioOptions, 5_000);
    window.addEventListener('focus', refreshAudioOptions);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshAudioOptions);
    };
  }, []);

  const compatibleNarrations = narrations.filter(
    (narration) =>
      narration.locale === locale && narration.usage === 'finished',
  );
  const compatibleVoices = voices.filter(
    (voice) =>
      voice.status === 'ready' &&
      voice.activeVersion?.provider === 'chatterbox' &&
      voice.activeVersion.enabledLocales.includes(locale),
  );
  const selectedNarration = compatibleNarrations.find(
    (narration) => narration.id === narrationAssetId,
  );
  const selectedMusic = musicTracks.find((track) => track.id === musicTrackId);
  const targetSeconds = secondsForVideoFormat(format, longFormMinutes);
  const productionSeconds = selectedNarration
    ? Math.round(selectedNarration.durationSeconds)
    : targetSeconds;
  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const sceneCount = script.trim().split(/\n\s*\n/).filter(Boolean).length;

  const deriveTitle = (value: string) => {
    const firstLine = value
      .split(/\n|[.!?]/)
      .map((part) => part.trim())
      .find(Boolean);
    return (firstLine || 'Untitled video').slice(0, 90);
  };

  const changeFormat = (next: 'reel' | 'full') => {
    setFormat(next);
    setTemplateId(recommendedTemplate(categoryId, next));
    setDeliveries(
      next === 'reel'
        ? ['youtube-short', 'instagram-reel']
        : ['youtube-long'],
    );
    setReviewed(false);
  };

  const changeCategory = (id: string) => {
    const next = catalog.categories.find((item) => item.id === id)!;
    setCategoryId(id);
    setTemplateId(recommendedTemplate(id, format));
    setThemeId(next.defaultThemeId);
    setReviewed(false);
  };

  const generateDraft = async () => {
    setGenerating(true);
    setError('');
    try {
      const draft = await api.generateScript({
        topic,
        direction,
        format,
        targetSeconds,
        categoryId,
        templateId,
        locale,
        audienceLevel: 'beginner',
        audioMode,
      });
      setTitle(draft.title);
      setScript(draft.script);
      setReviewChecklist(draft.reviewChecklist);
      setGeneratedScenes(draft.scenes);
      setScriptContextVersion(draft.contextVersion);
      setReviewed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setGenerating(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (!reviewed) {
        throw new Error('Review and approve the script before production.');
      }
      if (audioMode === 'voiceover' && locale !== 'en-US' && !narrationAssetId) {
        throw new Error(
          'Local Studio TTS currently supports English. Upload a complete narration track for this language.',
        );
      }
      if (audioMode === 'music-only' && !selectedMusic) {
        throw new Error('Choose a music track before production.');
      }
      if (productionSeconds > MAX_VIDEO_SECONDS) {
        throw new Error('Video duration cannot exceed 30 minutes.');
      }
      const project = await api.createProject({
        title: title.trim() || deriveTitle(script),
        categoryId,
        templateId,
        themeId,
        locale,
        deliveries: deliveries as CategoryDefinition['defaultDeliveries'],
        script,
        targetSeconds: productionSeconds,
      });
      let productionProject = project;
      if (
        generatedScenes.length === project.variant.spec.scenes.length
      ) {
        productionProject = await api.updateProject(project.project.id, {
          spec: {
            ...project.variant.spec,
            scenes: project.variant.spec.scenes.map((scene, index) =>
              sceneFromGeneratedPlan(
                generatedScenes[index],
                scene as Scene,
                index,
              ),
            ),
          },
        });
      }
      if (audioMode === 'music-only') {
        const currentSpec = productionProject.variant.spec;
        productionProject = await api.updateProject(project.project.id, {
          spec: {
            ...currentSpec,
            audio: undefined,
            captionTimings: undefined,
            captions: false,
            scenes: currentSpec.scenes.map((scene) => ({
              ...scene,
              narration: undefined,
            })),
            soundtrack: {
              music: {
                src: selectedMusic!.src,
                credit: selectedMusic!.credit,
                license: selectedMusic!.license,
                volume: selectedMusic!.defaultVolume,
                loop: selectedMusic!.loop,
                fadeInFrames: 45,
                fadeOutFrames: 75,
              },
            },
          },
        });
      } else if (narrationAssetId || voiceProfileVersionId) {
        productionProject = await api.updateVariant(
          productionProject.project.id,
          productionProject.variant.id,
          {
            voiceProfileVersionId: voiceProfileVersionId || null,
            narrationAssetId: narrationAssetId || null,
          },
        );
      }
      const provider = audioMode === 'music-only'
        ? undefined
        : narrationAssetId
        ? 'uploaded'
        : voiceProfileVersionId
          ? 'chatterbox'
          : 'kokoro';
      const job = await api.createProductionJob({
        projectId: productionProject.project.id,
        variantId: productionProject.variant.id,
        generateVoice: audioMode === 'voiceover',
        provider,
        voiceProfileVersionId: voiceProfileVersionId || undefined,
        cloudConfirmed: false,
      });
      onChanged();
      navigate(`/jobs/${job.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page narrow">
      <PageHeader
        eyebrow="One-click production"
        title="From one idea to a finished video."
        description="Generate a script with AI or paste your own, review every scene, then choose voiceover or a music-led visual production."
      />
      <section className="pipeline-overview">
        <div>
          <span>Production path</span>
          <strong>One master timeline. Every visual and sound stays synchronized.</strong>
        </div>
        <ProductionPipelineMap />
      </section>
      <form className="wizard production-wizard" onSubmit={submit}>
        <section className="form-section">
          <span className="step-number">01</span>
          <div className="form-section-body">
            <h2>Choose the output</h2>
            <div className="format-grid">
              <button
                type="button"
                className={`format-card ${format === 'reel' ? 'selected' : ''}`}
                onClick={() => changeFormat('reel')}
              >
                <span className="format-frame portrait" />
                <div>
                  <strong>60-second Reel</strong>
                  <small>YouTube Short + Instagram Reel · 9:16</small>
                </div>
              </button>
              <button
                type="button"
                className={`format-card ${format === 'full' ? 'selected' : ''}`}
                onClick={() => changeFormat('full')}
              >
                <span className="format-frame landscape" />
                <div>
                  <strong>Long-form Video</strong>
                  <small>{longFormMinutes}-minute · YouTube · 16:9</small>
                </div>
              </button>
            </div>
            {format === 'full' ? (
              <div className="duration-picker">
                <span>Video length</span>
                <div role="group" aria-label="Long-form video duration">
                  {LONG_FORM_MINUTES.map((minutes) => (
                    <button
                      type="button"
                      key={minutes}
                      className={longFormMinutes === minutes ? 'active' : ''}
                      aria-pressed={longFormMinutes === minutes}
                      onClick={() => {
                        setLongFormMinutes(minutes);
                        setReviewed(false);
                      }}
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
                <small>
                  AI pacing, scene count, captions, music, voiceover, and render
                  timeline will use this runtime.
                </small>
              </div>
            ) : null}
          </div>
        </section>
        <section className="form-section">
          <span className="step-number">02</span>
          <div className="form-section-body">
            <h2>Provide the content</h2>
            <div className="source-switch" role="tablist" aria-label="Script source">
              <button
                type="button"
                className={scriptMode === 'ai' ? 'active' : ''}
                onClick={() => {
                  setScriptMode('ai');
                  setReviewed(false);
                }}
              >
                Generate with AI
              </button>
              <button
                type="button"
                className={scriptMode === 'manual' ? 'active' : ''}
                onClick={() => {
                  setScriptMode('manual');
                  setReviewed(false);
                }}
              >
                Paste my script
              </button>
            </div>
            {scriptMode === 'ai' ? (
              <div className="ai-input-panel">
                <label className="field">
                  <span>What should the video teach or explain?</span>
                  <textarea
                    autoFocus
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Example: Explain Python decorators to beginners with one practical API example."
                  />
                </label>
                <label className="field">
                  <span>Optional direction</span>
                  <input
                    value={direction}
                    onChange={(event) => setDirection(event.target.value)}
                    placeholder="Tone, important points, examples, or concepts to avoid"
                  />
                </label>
                <div
                  className={`ai-status ${aiStatus?.configured ? 'ready' : 'missing'}`}
                >
                  <span>{aiStatus?.configured ? '●' : '○'}</span>
                  <div>
                    <strong>
                      {aiStatus?.configured
                        ? `${aiStatus.model} ready`
                        : 'OpenAI API key required'}
                    </strong>
                    <small>{aiStatus?.detail ?? 'Checking the local runtime…'}</small>
                  </div>
                  <button
                    type="button"
                    className="button primary small"
                    disabled={!aiStatus?.configured || !topic.trim() || generating}
                    onClick={generateDraft}
                  >
                    {generating
                      ? 'Writing draft…'
                      : script
                        ? 'Regenerate script'
                        : 'Generate script'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
        <section className="form-section">
          <span className="step-number">03</span>
          <div className="form-section-body">
            <h2>Review and edit the script</h2>
            <label className="field">
              <span>Video title</span>
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setReviewed(false);
                }}
                placeholder="Optional — generated from your script if left empty"
              />
            </label>
            <label className="field script-review">
              <span>
                {audioMode === 'music-only'
                  ? 'Approved visual plan · one paragraph becomes one scene'
                  : 'Approved narration · one paragraph becomes one scene'}
              </span>
              <textarea
                className="script-input"
                value={script}
                onChange={(event) => {
                  setScript(event.target.value);
                  setGeneratedScenes([]);
                  setReviewed(false);
                }}
                placeholder={
                  scriptMode === 'manual'
                    ? 'Paste your complete narration here. Separate scenes with blank lines.'
                    : 'Your AI-generated draft will appear here for review.'
                }
              />
            </label>
            <div className="script-metrics">
              <span><strong>{wordCount}</strong> words</span>
              <span><strong>{sceneCount}</strong> scenes</span>
              {audioMode === 'voiceover' ? (
                <span><strong>{Math.round(wordCount / (productionSeconds / 60))}</strong> WPM</span>
              ) : null}
              <span><strong>{formatTime(productionSeconds)}</strong> {selectedNarration ? 'audio' : 'target'}</span>
            </div>
            {generatedScenes.length ? (
              <div className="review-notes">
                <strong>
                  AI scene plan · {scriptContextVersion}
                </strong>
                <ol>
                  {generatedScenes.map((scene, index) => (
                    <li key={`${scene.sceneType}-${index}`}>
                      <b>{scene.sceneType}</b> — {scene.purpose}{' '}
                      <span>{scene.visualDirection}</span>
                      {scene.visualLabels.length ? (
                        <small>{scene.visualLabels.join(' → ')}</small>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {reviewChecklist.length ? (
              <div className="review-notes">
                <strong>Manual verification</strong>
                <ul>
                  {reviewChecklist.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ) : null}
            <label className="approval-check">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              <span>
                {audioMode === 'music-only'
                  ? 'I reviewed the on-screen explanations, visual sequence, examples, names, and factual claims. This is the visual plan I approve for production.'
                  : 'I reviewed the narration, examples, names, and factual claims. This is the script I approve for voice generation.'}
              </span>
            </label>
          </div>
        </section>
        <section className="form-section">
          <span className="step-number">04</span>
          <div className="form-section-body">
            <h2>Choose the audio</h2>
            <div className="source-switch audio-mode-switch" role="tablist" aria-label="Audio mode">
              <button
                type="button"
                className={audioMode === 'voiceover' ? 'active' : ''}
                onClick={() => {
                  setAudioMode('voiceover');
                  setReviewed(false);
                }}
              >
                Voiceover
              </button>
              <button
                type="button"
                className={audioMode === 'music-only' ? 'active' : ''}
                onClick={() => {
                  setAudioMode('music-only');
                  setNarrationAssetId('');
                  setVoiceProfileVersionId('');
                  setReviewed(false);
                }}
              >
                Music only · visual explanation
              </button>
            </div>
            {audioMode === 'music-only' ? (
              <div className="voice-choice-grid music-choice-grid">
                {musicTracks.map((track) => (
                  <article
                    key={track.id}
                    className={`voice-choice uploaded music-choice ${musicTrackId === track.id ? 'selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="narration-select"
                      onClick={() => setMusicTrackId(track.id)}
                    >
                      <span className="voice-avatar">♫</span>
                      <div>
                        <strong>{track.label}</strong>
                        <small>{track.mood} · {track.recommendedFor}</small>
                      </div>
                    </button>
                    <audio controls preload="metadata" src={api.musicAudioUrl(track.id)} />
                  </article>
                ))}
                <div className="review-notes music-only-note">
                  <strong>No speech will be generated</strong>
                  <span>
                    The selected track becomes the primary audio. TTS, spoken captions,
                    and narration artifacts are skipped; the approved ideas remain in
                    titles, diagrams, code, labels, and animations.
                  </span>
                </div>
              </div>
            ) : (
            <div className="voice-choice-grid">
              {locale === 'en-US' ? (
                <button
                  type="button"
                  className={`voice-choice ${narrationAssetId === '' && voiceProfileVersionId === '' ? 'selected' : ''}`}
                  onClick={() => {
                    setNarrationAssetId('');
                    setVoiceProfileVersionId('');
                  }}
                >
                  <span className="voice-avatar">AI</span>
                  <div>
                    <strong>Local Studio TTS</strong>
                    <small>Kokoro · generates the approved script · private on this Mac</small>
                  </div>
                </button>
              ) : null}
              {compatibleVoices.map((voice) => (
                <button
                  type="button"
                  key={voice.id}
                  className={`voice-choice ${voiceProfileVersionId === voice.activeVersionId ? 'selected' : ''}`}
                  onClick={() => {
                    setNarrationAssetId('');
                    setVoiceProfileVersionId(voice.activeVersionId ?? '');
                  }}
                >
                  <span className="voice-avatar">
                    {voice.ownerName.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{voice.name}</strong>
                    <small>My Voice · local clone · speaks the approved script</small>
                  </div>
                </button>
              ))}
              {compatibleNarrations.map((narration) => (
                <article
                  key={narration.id}
                  className={`voice-choice uploaded ${narrationAssetId === narration.id ? 'selected' : ''}`}
                >
                  <button
                    type="button"
                    className="narration-select"
                    onClick={() => {
                      setNarrationAssetId(narration.id);
                      setVoiceProfileVersionId('');
                    }}
                  >
                    <span className="voice-avatar">♫</span>
                    <div>
                      <strong>{narration.label}</strong>
                      <small>
                        Uploaded narration · {formatTime(narration.durationSeconds)} · skips TTS
                      </small>
                    </div>
                  </button>
                  <audio
                    controls
                    preload="metadata"
                    src={api.narrationAudioUrl(narration.id)}
                  />
                </article>
              ))}
              {locale !== 'en-US' && !compatibleNarrations.length ? (
                <div className="review-notes">
                  <strong>Upload narration for this language</strong>
                  <span>
                    Experimental cloned voices are disabled. Upload one complete
                    recording that speaks the approved script exactly.
                  </span>
                </div>
              ) : null}
              <label className="approval-check narration-confirmation">
                <input
                  type="checkbox"
                  checked={narrationMatchesScript}
                  onChange={(event) =>
                    setNarrationMatchesScript(event.target.checked)
                  }
                />
                <span>
                  My audio speaks the exact approved script above. It is a finished narration, not a voice sample.
                </span>
              </label>
              <label className={`voice-choice add upload-narration ${uploadingNarration || !narrationMatchesScript ? 'disabled' : ''}`}>
                <span>↑</span>
                <div>
                  <strong>{uploadingNarration ? 'Importing audio…' : 'Upload finished narration'}</strong>
                  <small>Use a complete WAV or MP3 directly; no cloning</small>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  disabled={uploadingNarration || !narrationMatchesScript}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    setUploadingNarration(true);
                    setError('');
                    void api.uploadNarration({
                      file,
                      filename: file.name,
                      label: file.name.replace(/\.[^.]+$/, '').slice(0, 120),
                      locale,
                    })
                      .then((asset) => {
                        setNarrations((current) => [asset, ...current]);
                        setNarrationAssetId(asset.id);
                      })
                      .catch((cause) =>
                        setError(cause instanceof Error ? cause.message : String(cause)),
                      )
                      .finally(() => setUploadingNarration(false));
                  }}
                />
              </label>
            </div>
            )}
            <details className="advanced-settings">
              <summary>Advanced settings</summary>
              <div className="field-grid">
                <label className="field">
                  <span>Category</span>
                  <select
                    value={categoryId}
                    onChange={(event) => changeCategory(event.target.value)}
                  >
                    {catalog.categories.map((item) => (
                      <option value={item.id} key={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Language</span>
                  <select
                    value={locale}
                    onChange={(event) => {
                      setLocale(event.target.value as SupportedLocale);
                      setNarrationAssetId('');
                      setReviewed(false);
                    }}
                  >
                    {LANGUAGES.map((language) => (
                      <option value={language.locale} key={language.locale}>
                        {language.label} · {language.nativeLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Template</span>
                  <select
                    value={templateId}
                    onChange={(event) => {
                      setTemplateId(event.target.value);
                      setReviewed(false);
                    }}
                  >
                    {catalog.templates.map((template) => (
                      <option value={template.id} key={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Theme</span>
                  <select
                    value={themeId}
                    onChange={(event) => setThemeId(event.target.value)}
                  >
                    {catalog.themes.map((theme) => (
                      <option value={theme.id} key={theme.id}>{theme.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="delivery-row">
                <span>Outputs</span>
                {[
                  ['youtube-long', 'YouTube 16:9'],
                  ['youtube-short', 'YouTube Short'],
                  ['instagram-reel', 'Instagram Reel'],
                  ['instagram-feed', 'Instagram 1:1'],
                ].map(([deliveryId, label]) => (
                  <label className="check" key={deliveryId}>
                    <input
                      type="checkbox"
                      checked={deliveries.includes(deliveryId)}
                      onChange={() =>
                        setDeliveries((current) =>
                          current.includes(deliveryId)
                            ? current.filter((value) => value !== deliveryId)
                            : [...current, deliveryId],
                        )
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
        </section>
        {error ? <p className="form-error">{error}</p> : null}
        <footer className="wizard-footer">
          <span>
            {reviewed
              ? '✓ Script approved for production'
              : 'Review approval required before generation'}
          </span>
          <button
            className="button primary"
            disabled={
              submitting ||
              generating ||
              !script.trim() ||
              !reviewed ||
              deliveries.length === 0
            }
          >
            {submitting
              ? 'Submitting production…'
              : 'Approve & generate video →'}
          </button>
        </footer>
      </form>
    </div>
  );
};

const ProjectEditor = ({id, onChanged}: {id: string; onChanged: () => void}) => {
  const [resolved, setResolved] = useState<ResolvedProject | null>(null);
  const [spec, setSpec] = useState<EditableVideoSpec | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | undefined>();
  const [editorMode, setEditorMode] = useState<'storyboard' | 'localization'>(
    'storyboard',
  );
  const [narrations, setNarrations] = useState<NarrationAssetRecord[]>([]);
  const [selected, setSelected] = useState(0);
  const [profile, setProfile] = useState<FormatId>('landscape');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [scriptOpen, setScriptOpen] = useState(false);
  const [script, setScript] = useState('');
  const [generateVoice, setGenerateVoice] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await api.project(id, activeVariantId);
      setResolved(next);
      setSpec(next.variant.spec);
      setActiveVariantId(next.variant.id);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  }, [activeVariantId, id]);

  useEffect(() => void load(), [load]);
  useEffect(() => {
    void api.narrations().then(setNarrations).catch(() => setNarrations([]));
  }, []);

  if (!resolved || !spec) return <div className="page"><p>Loading project…</p></div>;
  const currentScene = spec.scenes[selected] as Scene | undefined;
  const format = FORMATS[profile];

  const updateScene = (next: Scene) => {
    setSpec((current) =>
      current
        ? {
            ...current,
            scenes: current.scenes.map((scene, index) => (index === selected ? next : scene)),
          }
        : current,
    );
  };

  const save = async () => {
    setSaving(true);
    setNotice('');
    try {
      const next =
        resolved.project.masterVariantId === resolved.variant.id
          ? await api.updateProject(id, {title: spec.title, spec})
          : await api.updateVariant(id, resolved.variant.id, {spec});
      setResolved(next);
      setSpec(next.variant.spec);
      setNotice('Saved');
      onChanged();
      return true;
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const render = async () => {
    if (!(await save())) return;
    try {
      if (
        generateVoice &&
        resolved.variant.locale !== 'en-US' &&
        !resolved.variant.narrationAssetId
      ) {
        throw new Error(
          'Local Studio TTS currently supports English. Upload a complete narration track for this language.',
        );
      }
      const provider =
        resolved.variant.narrationAssetId
          ? 'uploaded'
          : 'kokoro';
      const job = await api.createProductionJob({
        projectId: id,
        variantId: resolved.variant.id,
        generateVoice,
        provider,
        cloudConfirmed: false,
      });
      onChanged();
      navigate(`/jobs/${job.id}`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const move = (direction: -1 | 1) => {
    const target = selected + direction;
    if (target < 0 || target >= spec.scenes.length) return;
    const scenes = [...spec.scenes];
    [scenes[selected], scenes[target]] = [scenes[target], scenes[selected]];
    setSpec({...spec, scenes});
    setSelected(target);
  };

  const duplicate = () => {
    if (!currentScene) return;
    const clone = {
      ...currentScene,
      id: `${currentScene.id ?? currentScene.type}-${Date.now().toString(36)}`,
    };
    const scenes = [...spec.scenes];
    scenes.splice(selected + 1, 0, clone);
    setSpec({...spec, scenes});
    setSelected(selected + 1);
  };

  const remove = () => {
    if (spec.scenes.length === 1) return;
    setSpec({...spec, scenes: spec.scenes.filter((_, index) => index !== selected)});
    setSelected(Math.max(0, selected - 1));
  };

  const addPhoto = async (file: File) => {
    if (!currentScene) return;
    setUploadingImage(true);
    setNotice('');
    try {
      const asset = await api.uploadProjectImage(id, file);
      const canvasScene =
        currentScene.type === 'motionCanvas'
          ? currentScene
          : sceneFromType('motionCanvas', currentScene, selected);
      if (canvasScene.type !== 'motionCanvas') {
        throw new Error('Could not create a motion canvas for this photo.');
      }
      const photoId = `photo-${asset.id}`;
      const alt = file.name
        .replace(/\.[^.]+$/, '')
        .replaceAll(/[-_]+/g, ' ')
        .trim()
        .slice(0, 240);
      const image: MotionCanvasElement = {
        id: photoId,
        kind: 'image',
        src: asset.src,
        alt: alt || 'Photo',
        x: 50,
        y: 57,
        width: 82,
        height: 58,
        fit: 'cover',
        radius: 28,
        motion: 'ken-burns-in',
        focalX: 50,
        focalY: 50,
      };
      updateScene({
        ...canvasScene,
        elements: [...canvasScene.elements, image],
        actions: [
          ...canvasScene.actions,
          {target: photoId, type: 'reveal', atFrame: 6, durationFrames: 20},
        ],
      });
      setNotice('Photo added. Save the project to keep it in this scene.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUploadingImage(false);
    }
  };

  const updatePhoto = (
    photoId: string,
    patch: Partial<Extract<MotionCanvasElement, {kind: 'image'}>>,
  ) => {
    if (currentScene?.type !== 'motionCanvas') return;
    updateScene({
      ...currentScene,
      elements: currentScene.elements.map((element) =>
        element.id === photoId && element.kind === 'image'
          ? {...element, ...patch}
          : element,
      ),
    });
  };

  const removePhoto = (photoId: string) => {
    if (currentScene?.type !== 'motionCanvas') return;
    updateScene({
      ...currentScene,
      elements: currentScene.elements.filter((element) => element.id !== photoId),
      actions: currentScene.actions.filter((action) => action.target !== photoId),
    });
  };

  const addShape = () => {
    if (!currentScene) return;
    const canvasScene =
      currentScene.type === 'motionCanvas'
        ? currentScene
        : sceneFromType('motionCanvas', currentScene, selected);
    if (canvasScene.type !== 'motionCanvas') return;
    const shapeId = `shape-${Date.now().toString(36)}`;
    const shape: MotionCanvasElement = {
      id: shapeId,
      kind: 'shape',
      shape: 'diamond',
      label: 'STEP',
      sublabel: 'Describe this part',
      x: 50,
      y: 55,
      width: 14,
      height: 18,
      tone: 'accent',
      animation: 'breathe',
    };
    updateScene({
      ...canvasScene,
      elements: [...canvasScene.elements, shape],
      actions: [
        ...canvasScene.actions,
        {target: shapeId, type: 'reveal', atFrame: 6, durationFrames: 18},
        {target: shapeId, type: 'bounce', atFrame: 28, durationFrames: 24},
      ],
    });
    setNotice('Shape added. Position and timing can be refined in Advanced scene data.');
  };

  const updateShape = (
    shapeId: string,
    patch: Partial<Extract<MotionCanvasElement, {kind: 'shape'}>>,
  ) => {
    if (currentScene?.type !== 'motionCanvas') return;
    updateScene({
      ...currentScene,
      elements: currentScene.elements.map((element) =>
        element.id === shapeId && element.kind === 'shape'
          ? {...element, ...patch}
          : element,
      ),
    });
  };

  const removeShape = (shapeId: string) => {
    if (currentScene?.type !== 'motionCanvas') return;
    updateScene({
      ...currentScene,
      elements: currentScene.elements.filter((element) => element.id !== shapeId),
      actions: currentScene.actions.filter((action) => action.target !== shapeId),
    });
  };

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <button className="back-button" onClick={() => navigate('/')}>←</button>
        <div className="editor-title">
          <input
            aria-label="Project title"
            value={spec.title}
            onChange={(event) => setSpec({...spec, title: event.target.value})}
          />
          <span>{resolved.category.shortLabel} · {resolved.variant.locale} · {formatTime(duration(spec))}</span>
        </div>
        <div className="editor-actions">
          <select
            aria-label="Project language"
            className="language-select"
            value={resolved.variant.id}
            onChange={(event) => {
              setSelected(0);
              setActiveVariantId(event.target.value);
            }}
          >
            {resolved.variants.map((variant) => {
              const language = LANGUAGES.find(
                (item) => item.locale === variant.locale,
              );
              return (
                <option value={variant.id} key={variant.id}>
                  {language?.nativeLabel ?? variant.locale}
                  {resolved.project.masterVariantId === variant.id
                    ? ' · master'
                    : ` · ${variant.translationStatus}`}
                </option>
              );
            })}
          </select>
          <button
            className={`button quiet small ${editorMode === 'storyboard' ? 'active' : ''}`}
            onClick={() => setEditorMode('storyboard')}
          >
            Storyboard
          </button>
          <button
            className={`button quiet small ${editorMode === 'localization' ? 'active' : ''}`}
            onClick={() => setEditorMode('localization')}
          >
            Localization
          </button>
          {notice ? <span className="save-notice">{notice}</span> : null}
          <button className="button quiet small" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <label className="voice-toggle">
            <input type="checkbox" checked={generateVoice} onChange={(event) => setGenerateVoice(event.target.checked)} />
            <span>AI voice</span>
          </label>
          <button className="button primary small" onClick={render}>Generate video</button>
        </div>
      </header>
      {editorMode === 'localization' ? (
        <LocalizationPanel
          resolved={resolved}
          onSelectVariant={setActiveVariantId}
          onChanged={async () => {
            await load();
            onChanged();
          }}
        />
      ) : (
      <div className="editor-grid">
        <aside className="scene-panel">
          <div className="panel-heading">
            <div><strong>Storyboard</strong><span>{spec.scenes.length} scenes</span></div>
            <button onClick={() => setScriptOpen(true)}>Import</button>
          </div>
          <div className="scene-list">
            {spec.scenes.map((scene, index) => (
              <button
                key={scene.id ?? index}
                className={`scene-row ${selected === index ? 'selected' : ''}`}
                onClick={() => setSelected(index)}
              >
                <span className="scene-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="scene-thumb" style={{background: resolved.theme.definition.color.bg}}>
                  <i style={{background: resolved.theme.definition.accents.primary}} />
                </span>
                <span className="scene-copy">
                  <strong>{scene.type}</strong>
                  <small>{sceneLabel(scene as Scene)}</small>
                </span>
                <time>{(scene.durationInFrames / (spec.fps ?? 30)).toFixed(1)}s</time>
              </button>
            ))}
          </div>
          <button
            className="add-scene"
            onClick={() => {
              const next = sceneFromType(
                'callout',
                {
                  type: 'callout',
                  text: 'New scene',
                  narration: 'New scene',
                  durationInFrames: 150,
                },
                spec.scenes.length,
              );
              setSpec({...spec, scenes: [...spec.scenes, next]});
              setSelected(spec.scenes.length);
            }}
          >
            ＋ Add scene
          </button>
        </aside>
        <section className="preview-workspace">
          <div className="preview-toolbar">
            <div className="segmented">
              {(['landscape', 'portrait', 'square'] as FormatId[]).map((id) => (
                <button className={profile === id ? 'active' : ''} onClick={() => setProfile(id)} key={id}>
                  {id === 'landscape' ? '16:9' : id === 'portrait' ? '9:16' : '1:1'}
                </button>
              ))}
            </div>
            <span>{format.width} × {format.height}</span>
          </div>
          <div className={`player-stage ${profile}`}>
            <Suspense fallback={<div className="player-loading">Loading preview…</div>}>
              <ScenePreview
                spec={spec}
                channel={resolved.channel}
                profile={profile}
                format={format}
                fps={spec.fps ?? 30}
              />
            </Suspense>
          </div>
          <div className="timeline-summary">
            {spec.scenes.map((scene, index) => (
              <button
                key={scene.id ?? index}
                onClick={() => setSelected(index)}
                className={selected === index ? 'active' : ''}
                style={{flex: scene.durationInFrames}}
                title={`Scene ${index + 1}: ${scene.type}`}
              />
            ))}
          </div>
        </section>
        <aside className="inspector">
          {currentScene ? (
            <>
              <div className="panel-heading">
                <div><strong>Scene {selected + 1}</strong><span>Visual and timing</span></div>
                <div className="scene-tools">
                  <button title="Move earlier" onClick={() => move(-1)}>↑</button>
                  <button title="Move later" onClick={() => move(1)}>↓</button>
                  <button title="Duplicate" onClick={duplicate}>＋</button>
                  <button title="Delete" onClick={remove}>×</button>
                </div>
              </div>
              <label className="field compact">
                <span>Scene type</span>
                <select
                  value={currentScene.type}
                  onChange={(event) =>
                    updateScene(sceneFromType(event.target.value as SceneType, currentScene, selected))
                  }
                >
                  {[
                    'title', 'callout', 'steps', 'flow', 'compare', 'stats',
                    'bigStat', 'code', 'terminal', 'architecture', 'counting',
                    'colors', 'flashcards', 'arrayViz', 'motionCanvas', 'outro',
                  ].map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              {currentScene.type === 'motionCanvas' ? (
                <div className="motion-controls">
                  <div className="photo-controls-heading">
                    <span>Motion theme and effects</span>
                    <small>Deterministic and safe for preview, seek, and final render</small>
                  </div>
                  <label className="field compact">
                    <span>Visual theme</span>
                    <select
                      value={currentScene.style}
                      onChange={(event) =>
                        updateScene({
                          ...currentScene,
                          style: event.target.value as typeof currentScene.style,
                        })
                      }
                    >
                      <option value="whiteboard-light">Whiteboard light</option>
                      <option value="midnight-code">Midnight code</option>
                      <option value="electric-grid">Electric grid</option>
                    </select>
                  </label>
                  <div className="motion-control-grid">
                    <label className="field compact">
                      <span>Camera</span>
                      <select
                        value={currentScene.effects?.camera ?? 'none'}
                        onChange={(event) =>
                          updateScene({
                            ...currentScene,
                            effects: {
                              ...currentScene.effects,
                              camera: event.target.value as NonNullable<typeof currentScene.effects>['camera'],
                            },
                          })
                        }
                      >
                        <option value="none">Locked</option>
                        <option value="push-in">Slow push in</option>
                        <option value="drift">Cinematic drift</option>
                      </select>
                    </label>
                    <label className="field compact">
                      <span>Glow</span>
                      <select
                        value={currentScene.effects?.glow ?? 'none'}
                        onChange={(event) =>
                          updateScene({
                            ...currentScene,
                            effects: {
                              ...currentScene.effects,
                              glow: event.target.value as NonNullable<typeof currentScene.effects>['glow'],
                            },
                          })
                        }
                      >
                        <option value="none">None</option>
                        <option value="soft">Soft bloom</option>
                        <option value="strong">Strong bloom</option>
                      </select>
                    </label>
                    <label className="field compact">
                      <span>Particles</span>
                      <select
                        value={currentScene.effects?.particles ?? 'none'}
                        onChange={(event) =>
                          updateScene({
                            ...currentScene,
                            effects: {
                              ...currentScene.effects,
                              particles: event.target.value as NonNullable<typeof currentScene.effects>['particles'],
                            },
                          })
                        }
                      >
                        <option value="none">None</option>
                        <option value="data-stream">Data stream</option>
                      </select>
                    </label>
                    <label className="field compact">
                      <span>Energy</span>
                      <select
                        value={currentScene.motion?.intensity ?? 'calm'}
                        onChange={(event) =>
                          updateScene({
                            ...currentScene,
                            motion: {
                              ...currentScene.motion,
                              intensity: event.target.value as 'calm' | 'dynamic',
                            },
                          })
                        }
                      >
                        <option value="calm">Calm</option>
                        <option value="dynamic">Dynamic</option>
                      </select>
                    </label>
                  </div>
                  <div className="effect-toggles">
                    {([
                      ['scanlines', 'Scanlines'],
                      ['vignette', 'Vignette'],
                    ] as const).map(([key, label]) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={currentScene.effects?.[key] ?? false}
                          onChange={(event) =>
                            updateScene({
                              ...currentScene,
                              effects: {...currentScene.effects, [key]: event.target.checked},
                            })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <label className="field compact">
                <span>Narration source</span>
                <select
                  value={
                    resolved.variant.narrationAssetId
                      ? `narration:${resolved.variant.narrationAssetId}`
                      : ''
                  }
                  onChange={async (event) => {
                    const [kind, value] = event.target.value.split(':');
                    const next = await api.updateVariant(
                      id,
                      resolved.variant.id,
                      {
                        voiceProfileVersionId: null,
                        narrationAssetId:
                          kind === 'narration' ? value : null,
                      },
                    );
                    setResolved(next);
                  }}
                >
                  <option value="">
                    {resolved.variant.locale === 'en-US'
                      ? 'Local Studio TTS · approved scene narration'
                      : 'Upload a complete narration track'}
                  </option>
                  {narrations
                    .filter(
                      (narration) =>
                        narration.locale === resolved.variant.locale &&
                        narration.usage === 'finished',
                    )
                    .map((narration) => (
                      <option
                        value={`narration:${narration.id}`}
                        key={narration.id}
                      >
                        {narration.label} · uploaded {formatTime(narration.durationSeconds)}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field compact">
                <span>Narration</span>
                <textarea
                  value={currentScene.narration ?? ''}
                  onChange={(event) => updateScene({...currentScene, narration: event.target.value})}
                  rows={7}
                />
                <small>{(currentScene.narration ?? '').split(/\s+/).filter(Boolean).length} words</small>
              </label>
              {'title' in currentScene ? (
                <label className="field compact">
                  <span>On-screen title</span>
                  <input value={String(currentScene.title ?? '')} onChange={(event) => updateScene({...currentScene, title: event.target.value})} />
                </label>
              ) : null}
              {'text' in currentScene ? (
                <label className="field compact">
                  <span>On-screen text</span>
                  <textarea value={String(currentScene.text ?? '')} onChange={(event) => updateScene({...currentScene, text: event.target.value})} rows={4} />
                </label>
              ) : null}
              <div className="photo-controls">
                <div className="photo-controls-heading">
                  <span>Photos and PNG graphics</span>
                  <small>PNG, JPEG, or WebP · up to 15 MB</small>
                </div>
                <label className={`button quiet small file-button ${uploadingImage ? 'disabled' : ''}`}>
                  {uploadingImage ? 'Importing photo…' : '＋ Add photo to this scene'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    disabled={uploadingImage}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.currentTarget.value = '';
                      if (file) void addPhoto(file);
                    }}
                  />
                </label>
                {currentScene.type === 'motionCanvas'
                  ? currentScene.elements
                      .filter(
                        (element): element is Extract<MotionCanvasElement, {kind: 'image'}> =>
                          element.kind === 'image',
                      )
                      .map((photo) => (
                        <article className="photo-item" key={photo.id}>
                          <img src={`/${photo.src}`} alt={photo.alt} />
                          <div>
                            <strong>{photo.alt}</strong>
                            <div className="photo-options">
                              <select
                                aria-label={`Fit for ${photo.alt}`}
                                value={photo.fit ?? 'cover'}
                                onChange={(event) =>
                                  updatePhoto(photo.id, {
                                    fit: event.target.value as 'cover' | 'contain',
                                  })
                                }
                              >
                                <option value="cover">Fill frame</option>
                                <option value="contain">Show whole image</option>
                              </select>
                              <select
                                aria-label={`Motion for ${photo.alt}`}
                                value={photo.motion ?? 'ken-burns-in'}
                                onChange={(event) =>
                                  updatePhoto(photo.id, {
                                    motion: event.target.value as Extract<
                                      MotionCanvasElement,
                                      {kind: 'image'}
                                    >['motion'],
                                  })
                                }
                              >
                                <option value="ken-burns-in">Slow zoom in</option>
                                <option value="ken-burns-out">Slow zoom out</option>
                                <option value="pan-left">Pan left</option>
                                <option value="pan-right">Pan right</option>
                                <option value="none">No camera motion</option>
                              </select>
                            </div>
                          </div>
                          <button type="button" title="Remove photo" onClick={() => removePhoto(photo.id)}>×</button>
                        </article>
                      ))
                  : null}
              </div>
              <div className="photo-controls">
                <div className="photo-controls-heading">
                  <span>Diagram shapes</span>
                  <small>Semantic geometry with seek-safe animation</small>
                </div>
                <button type="button" className="button quiet small" onClick={addShape}>
                  ＋ Add animated shape
                </button>
                {currentScene.type === 'motionCanvas'
                  ? currentScene.elements
                      .filter(
                        (element): element is Extract<MotionCanvasElement, {kind: 'shape'}> =>
                          element.kind === 'shape',
                      )
                      .map((shape) => (
                        <article className="photo-item shape-item" key={shape.id}>
                          <span className={`shape-preview shape-${shape.shape}`} aria-hidden="true" />
                          <div>
                            <input
                              aria-label={`Label for ${shape.id}`}
                              value={shape.label ?? ''}
                              placeholder="Shape label"
                              onChange={(event) => updateShape(shape.id, {label: event.target.value || undefined})}
                            />
                            <div className="photo-options">
                              <select
                                aria-label={`Geometry for ${shape.id}`}
                                value={shape.shape}
                                onChange={(event) =>
                                  updateShape(shape.id, {
                                    shape: event.target.value as Extract<MotionCanvasElement, {kind: 'shape'}>['shape'],
                                  })
                                }
                              >
                                <option value="circle">Circle</option>
                                <option value="square">Square</option>
                                <option value="rounded-square">Rounded square</option>
                                <option value="diamond">Decision diamond</option>
                                <option value="triangle">Triangle</option>
                                <option value="hexagon">Hexagon</option>
                                <option value="pill">Pill</option>
                                <option value="ring">Ring</option>
                                <option value="database">Database</option>
                                <option value="document">Document</option>
                              </select>
                              <select
                                aria-label={`Animation for ${shape.id}`}
                                value={shape.animation ?? 'none'}
                                onChange={(event) =>
                                  updateShape(shape.id, {
                                    animation: event.target.value as Extract<MotionCanvasElement, {kind: 'shape'}>['animation'],
                                  })
                                }
                              >
                                <option value="none">No idle motion</option>
                                <option value="float">Float</option>
                                <option value="rotate">Rotate</option>
                                <option value="wobble">Wobble</option>
                                <option value="breathe">Breathe</option>
                              </select>
                            </div>
                          </div>
                          <button type="button" title="Remove shape" onClick={() => removeShape(shape.id)}>×</button>
                        </article>
                      ))
                  : null}
              </div>
              <label className="field compact">
                <span>Duration · {(currentScene.durationInFrames / (spec.fps ?? 30)).toFixed(1)} seconds</span>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="0.5"
                  value={currentScene.durationInFrames / (spec.fps ?? 30)}
                  onChange={(event) =>
                    updateScene({
                      ...currentScene,
                      durationInFrames: Math.round(Number(event.target.value) * (spec.fps ?? 30)),
                    })
                  }
                />
              </label>
              <label className="field compact">
                <span>Accent</span>
                <select value={currentScene.accent ?? 'primary'} onChange={(event) => updateScene({...currentScene, accent: event.target.value as Scene['accent']})}>
                  <option>primary</option><option>secondary</option><option>success</option><option>attention</option><option>info</option>
                </select>
              </label>
              <details className="advanced-json">
                <summary>Advanced scene data</summary>
                <SceneJsonEditor scene={currentScene} onChange={updateScene} />
              </details>
            </>
          ) : null}
        </aside>
      </div>
      )}
      {scriptOpen ? (
        <Modal title="Rebuild storyboard from a script" onClose={() => setScriptOpen(false)}>
          <p className="modal-intro">Each paragraph becomes a scene. This replaces the current storyboard after you confirm.</p>
          <textarea className="script-input" value={script} onChange={(event) => setScript(event.target.value)} placeholder="Paste the complete narration here…" />
          <div className="modal-actions">
            <button className="button quiet" onClick={() => setScriptOpen(false)}>Cancel</button>
            <button
              className="button primary"
              disabled={!script.trim()}
              onClick={async () => {
                const next = await api.importScript(id, script);
                setResolved(next);
                setSpec(next.variant.spec);
                setSelected(0);
                setScriptOpen(false);
                onChanged();
              }}
            >
              Replace storyboard
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

const LocalizationPanel = ({
  resolved,
  onSelectVariant,
  onChanged,
}: {
  resolved: ResolvedProject;
  onSelectVariant: (id: string) => void;
  onChanged: () => void | Promise<void>;
}) => {
  const [units, setUnits] = useState<TranslationUnitRecord[]>([]);
  const [glossary, setGlossary] = useState<
    Awaited<ReturnType<typeof api.glossary>>
  >([]);
  const [targetLocale, setTargetLocale] = useState<SupportedLocale>('hi-IN');
  const [term, setTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [notice, setNotice] = useState('');
  const isMaster =
    resolved.project.masterVariantId === resolved.variant.id;
  const available = LANGUAGES.filter(
    (language) =>
      !resolved.variants.some((variant) => variant.locale === language.locale),
  );

  useEffect(() => {
    setTargetLocale(available[0]?.locale ?? 'hi-IN');
  }, [resolved.project.id, resolved.variants.length]);

  useEffect(() => {
    void Promise.all([
      isMaster
        ? Promise.resolve([])
        : api.translations(resolved.project.id, resolved.variant.id),
      api.glossary(resolved.project.id),
    ])
      .then(([nextUnits, nextGlossary]) => {
        setUnits(nextUnits);
        setGlossary(nextGlossary);
        setNotice('');
      })
      .catch((cause) =>
        setNotice(cause instanceof Error ? cause.message : String(cause)),
      );
  }, [isMaster, resolved.project.id, resolved.variant.id]);

  const updateUnit = async (
    unit: TranslationUnitRecord,
    changes: {
      translatedText?: string;
      status?: 'draft' | 'approved' | 'stale';
    },
  ) => {
    try {
      const next = await api.updateTranslation(
        resolved.project.id,
        resolved.variant.id,
        unit.id,
        changes,
      );
      setUnits(next.units);
      await onChanged();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <div className="localization-page">
      <div className="localization-head">
        <div>
          <span className="eyebrow">Language variants</span>
          <h2>Review meaning before generating a voice.</h2>
          <p>
            The master can be any supported language. Indic-to-Indic drafts
            show their English pivot so reviewers can spot meaning changes.
          </p>
        </div>
        {available.length ? (
          <div className="inline-create">
            <select
              value={targetLocale}
              onChange={(event) =>
                setTargetLocale(event.target.value as SupportedLocale)
              }
            >
              {available.map((language) => (
                <option value={language.locale} key={language.locale}>
                  {language.label} · {language.nativeLabel}
                </option>
              ))}
            </select>
            <button
              className="button primary small"
              onClick={async () => {
                const next = await api.createVariant(
                  resolved.project.id,
                  targetLocale,
                );
                onSelectVariant(next.variant.id);
                await onChanged();
              }}
            >
              Add language
            </button>
          </div>
        ) : null}
      </div>

      <div className="language-matrix">
        {resolved.variants.map((variant) => {
          const language = LANGUAGES.find(
            (item) => item.locale === variant.locale,
          );
          return (
            <button
              className={variant.id === resolved.variant.id ? 'active' : ''}
              onClick={() => onSelectVariant(variant.id)}
              key={variant.id}
            >
              <strong>{language?.nativeLabel ?? variant.locale}</strong>
              <span>
                {resolved.project.masterVariantId === variant.id
                  ? 'Master'
                  : variant.translationStatus.replace('_', ' ')}
              </span>
            </button>
          );
        })}
      </div>

      {notice ? <p className="form-error">{notice}</p> : null}

      {isMaster ? (
        <div className="localization-empty">
          <h3>This is the authoritative storyboard.</h3>
          <p>
            Add another language to create field-level translation units, or
            select an existing variant to review it.
          </p>
        </div>
      ) : (
        <div className="translation-workspace">
          <section className="translation-review">
            <div className="section-title compact-title">
              <div>
                <h2>Translation review</h2>
                <p>
                  {units.filter((unit) => unit.status === 'approved').length} of{' '}
                  {units.length} fields approved
                </p>
              </div>
              <div className="button-row">
                <button
                  className="button quiet small"
                  onClick={async () => {
                    const job = await api.createTranslationJob(
                      resolved.project.id,
                      resolved.variant.id,
                    );
                    navigate(`/jobs/${job.id}`);
                  }}
                >
                  Generate draft
                </button>
                <button
                  className="button quiet small"
                  onClick={async () => {
                    await api.promoteVariant(
                      resolved.project.id,
                      resolved.variant.id,
                    );
                    await onChanged();
                  }}
                >
                  Make master
                </button>
                <button
                  className="button primary small"
                  onClick={async () => {
                    await api.approveVariant(
                      resolved.project.id,
                      resolved.variant.id,
                    );
                    await onChanged();
                  }}
                >
                  Approve all
                </button>
              </div>
            </div>
            <div className="translation-list">
              {units.map((unit) => (
                <article className="translation-unit" key={unit.id}>
                  <header>
                    <span>
                      {unit.sceneId} · {unit.fieldPath}
                    </span>
                    <i className={`translation-status ${unit.status}`}>
                      {unit.status}
                    </i>
                  </header>
                  <div className="translation-columns">
                    <div>
                      <small>Source</small>
                      <p>{unit.sourceText}</p>
                      {unit.pivotText ? (
                        <>
                          <small>English pivot</small>
                          <p className="pivot">{unit.pivotText}</p>
                        </>
                      ) : null}
                    </div>
                    <label>
                      <small>Native-script translation</small>
                      <textarea
                        value={unit.translatedText}
                        onChange={(event) =>
                          setUnits((current) =>
                            current.map((entry) =>
                              entry.id === unit.id
                                ? {
                                    ...entry,
                                    translatedText: event.target.value,
                                    status: 'draft',
                                  }
                                : entry,
                            ),
                          )
                        }
                      />
                      <div className="button-row end">
                        <button
                          className="button quiet small"
                          onClick={() =>
                            void updateUnit(unit, {
                              translatedText: unit.translatedText,
                              status: 'draft',
                            })
                          }
                        >
                          Save
                        </button>
                        <button
                          className="button primary small"
                          onClick={() =>
                            void updateUnit(unit, {
                              translatedText: unit.translatedText,
                              status: 'approved',
                            })
                          }
                        >
                          Approve
                        </button>
                      </div>
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <aside className="glossary-panel">
            <h3>Protected terminology</h3>
            <p>
              Preserve product names, acronyms, code terms, or supply an
              approved translation.
            </p>
            <label className="field compact">
              <span>Source term</span>
              <input value={term} onChange={(event) => setTerm(event.target.value)} />
            </label>
            <label className="field compact">
              <span>Approved translation · optional</span>
              <input
                value={translation}
                onChange={(event) => setTranslation(event.target.value)}
              />
            </label>
            <button
              className="button quiet small"
              disabled={!term.trim()}
              onClick={async () => {
                const next = await api.saveGlossary(resolved.project.id, {
                  sourceTerm: term,
                  translatedTerm: translation || null,
                  mode: translation ? 'translate' : 'preserve',
                });
                setGlossary(next);
                setTerm('');
                setTranslation('');
              }}
            >
              Add term
            </button>
            <div className="glossary-list">
              {glossary.map((entry) => (
                <div key={entry.id}>
                  <span>
                    <strong>{entry.sourceTerm}</strong>
                    <small>
                      {entry.mode === 'preserve'
                        ? 'Preserve'
                        : entry.translatedTerm}
                    </small>
                  </span>
                  <button
                    onClick={async () =>
                      setGlossary(
                        await api.deleteGlossary(
                          resolved.project.id,
                          entry.id,
                        ),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

const SceneJsonEditor = ({scene, onChange}: {scene: Scene; onChange: (scene: Scene) => void}) => {
  const [value, setValue] = useState(() => JSON.stringify(scene, null, 2));
  const [error, setError] = useState('');
  useEffect(() => setValue(JSON.stringify(scene, null, 2)), [scene.id, scene.type]);
  return (
    <>
      <textarea className="json-editor" value={value} onChange={(event) => setValue(event.target.value)} rows={12} />
      {error ? <small className="form-error">{error}</small> : null}
      <button
        className="button quiet small"
        onClick={() => {
          try {
            onChange(JSON.parse(value) as Scene);
            setError('');
          } catch {
            setError('This is not valid JSON.');
          }
        }}
      >
        Apply data
      </button>
    </>
  );
};

const Library = ({catalog, onChanged}: {catalog: Catalog; onChanged: () => void}) => {
  const [tab, setTab] = useState<'themes' | 'templates' | 'categories'>('themes');
  return (
    <div className="page">
      <PageHeader
        eyebrow="Creative system"
        title="Library"
        description="Versioned building blocks keep every channel consistent while leaving room to grow."
      />
      <div className="tabs">
        {(['themes', 'templates', 'categories'] as const).map((item) => (
          <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>
        ))}
      </div>
      {tab === 'themes' ? <ThemeLibrary themes={catalog.themes} onChanged={onChanged} /> : null}
      {tab === 'templates' ? <TemplateLibrary templates={catalog.templates} onChanged={onChanged} /> : null}
      {tab === 'categories' ? <CategoryLibrary categories={catalog.categories} onChanged={onChanged} /> : null}
    </div>
  );
};

const ThemeLibrary = ({themes, onChanged}: {themes: CatalogTheme[]; onChanged: () => void}) => {
  const [selectedId, setSelectedId] = useState(themes[0]?.id);
  const selected = themes.find((theme) => theme.id === selectedId) ?? themes[0];
  const [draft, setDraft] = useState<ThemeDefinition>(selected.definition);
  useEffect(() => setDraft(selected.definition), [selected.versionId]);
  if (!selected) return null;
  const colors = {...draft.color, ...draft.accents};
  return (
    <div className="library-layout">
      <div className="library-list">
        {themes.map((theme) => (
          <button className={theme.id === selected.id ? 'active' : ''} onClick={() => setSelectedId(theme.id)} key={theme.id}>
            <i style={{background: theme.definition.color.bg}}><b style={{background: theme.definition.accents.primary}} /></i>
            <span><strong>{theme.label}</strong><small>Version {theme.version}</small></span>
          </button>
        ))}
      </div>
      <div className="library-editor">
        <div className="theme-preview" style={{background: draft.color.bg, color: draft.color.text}}>
          <span style={{color: draft.accents.primary}}>EXPLAINED VISUALLY</span>
          <strong style={{fontFamily: draft.font.display}}>Make complex ideas feel simple.</strong>
          <p style={{color: draft.color.textDim}}>One visual system, ready for every scene.</p>
          <i style={{background: draft.accents.primary}} />
        </div>
        <div className="editor-heading"><div><h2>{selected.label}</h2><p>Saving creates a new immutable version.</p></div></div>
        <div className="color-grid">
          {Object.entries(colors).map(([key, value]) => (
            <label className="color-field" key={key}>
              <input
                type="color"
                value={value}
                onChange={(event) => {
                  if (key in draft.color) setDraft({...draft, color: {...draft.color, [key]: event.target.value}});
                  else setDraft({...draft, accents: {...draft.accents, [key]: event.target.value}});
                }}
              />
              <span>{key}</span>
              <code>{value}</code>
            </label>
          ))}
        </div>
        <div className="button-row end">
          <button
            className="button quiet"
            onClick={async () => {
              const label = window.prompt('Name the cloned theme', `${selected.label} copy`);
              if (!label) return;
              await api.cloneTheme(selected.id, slugify(label), label);
              onChanged();
            }}
          >Clone theme</button>
          <button className="button primary" onClick={async () => {await api.saveTheme(selected.id, draft); onChanged();}}>Save version</button>
        </div>
      </div>
    </div>
  );
};

const TemplateLibrary = ({templates, onChanged}: {templates: CatalogTemplate[]; onChanged: () => void}) => {
  const [selectedId, setSelectedId] = useState(templates[0]?.id);
  const selected = templates.find((item) => item.id === selectedId) ?? templates[0];
  const [draft, setDraft] = useState<TemplateDefinition>(selected.definition);
  useEffect(() => setDraft(selected.definition), [selected.versionId]);
  if (!selected) return null;
  return (
    <div className="library-layout">
      <div className="library-list">
        {templates.map((template) => (
          <button className={template.id === selected.id ? 'active' : ''} onClick={() => setSelectedId(template.id)} key={template.id}>
            <span className="list-glyph">▤</span>
            <span><strong>{template.label}</strong><small>Version {template.version} · {template.definition.slots.length} slots</small></span>
          </button>
        ))}
      </div>
      <div className="library-editor">
        <div className="editor-heading">
          <div><h2>{selected.label}</h2><p>{draft.description}</p></div>
          <button className="button quiet small" onClick={() => setDraft({...draft, slots: [...draft.slots, {id: `slot-${draft.slots.length + 1}`, label: 'New slot', sceneType: 'callout', durationSeconds: 5, required: false, repeatable: false, defaultProps: {}}]})}>＋ Add slot</button>
        </div>
        <div className="slot-list">
          {draft.slots.map((slot, index) => (
            <div className="slot-row" key={`${slot.id}-${index}`}>
              <span className="drag-handle">⠿</span>
              <input value={slot.label} onChange={(event) => setDraft({...draft, slots: draft.slots.map((item, i) => i === index ? {...item, label: event.target.value} : item)})} />
              <select value={slot.sceneType} onChange={(event) => setDraft({...draft, slots: draft.slots.map((item, i) => i === index ? {...item, sceneType: event.target.value as SceneType} : item)})}>
                <option>title</option><option>callout</option><option>steps</option><option>flow</option><option>compare</option><option>bigStat</option><option>outro</option>
              </select>
              <label><input type="number" min="0.5" max="120" step="0.5" value={slot.durationSeconds} onChange={(event) => setDraft({...draft, slots: draft.slots.map((item, i) => i === index ? {...item, durationSeconds: Number(event.target.value)} : item)})} /> sec</label>
              <label className="mini-check"><input type="checkbox" checked={slot.repeatable} onChange={(event) => setDraft({...draft, slots: draft.slots.map((item, i) => i === index ? {...item, repeatable: event.target.checked} : item)})} /> Repeat</label>
              <button onClick={() => setDraft({...draft, slots: draft.slots.filter((_, i) => i !== index)})}>×</button>
            </div>
          ))}
        </div>
        <div className="button-row end">
          <button className="button quiet" onClick={async () => {const label = window.prompt('Name the cloned template', `${selected.label} copy`); if (!label) return; await api.cloneTemplate(selected.id, slugify(label), label); onChanged();}}>Clone template</button>
          <button className="button primary" onClick={async () => {await api.saveTemplate(selected.id, draft); onChanged();}}>Save version</button>
        </div>
      </div>
    </div>
  );
};

const CategoryLibrary = ({categories, onChanged}: {categories: CategoryDefinition[]; onChanged: () => void}) => {
  const [selectedId, setSelectedId] = useState(categories[0]?.id);
  const selected = categories.find((item) => item.id === selectedId) ?? categories[0];
  const [draft, setDraft] = useState(selected);
  useEffect(() => setDraft(selected), [selected.id]);
  return (
    <div className="library-layout">
      <div className="library-list">
        {categories.map((category) => (
          <button className={category.id === selected.id ? 'active' : ''} onClick={() => setSelectedId(category.id)} key={category.id}>
            <span className="list-glyph">{category.label.slice(0, 1)}</span>
            <span><strong>{category.label}</strong><small>{category.handle}</small></span>
          </button>
        ))}
      </div>
      <div className="library-editor">
        <div className="editor-heading"><div><h2>{selected.label}</h2><p>Audience, voice, and editorial defaults.</p></div></div>
        <div className="field-grid">
          <label className="field"><span>Name</span><input value={draft.label} onChange={(e) => setDraft({...draft, label: e.target.value})} /></label>
          <label className="field"><span>Handle</span><input value={draft.handle} onChange={(e) => setDraft({...draft, handle: e.target.value})} /></label>
          <label className="field"><span>Voice preset</span><input value={draft.voice.preset} onChange={(e) => setDraft({...draft, voice: {...draft.voice, preset: e.target.value}})} /></label>
          <label className="field"><span>Voice speed</span><input type="number" step="0.01" value={draft.voice.speed} onChange={(e) => setDraft({...draft, voice: {...draft.voice, speed: Number(e.target.value)}})} /></label>
          <label className="field"><span>Maximum timing-fit speed</span><input type="number" step="0.01" value={draft.voice.maxSpeed ?? draft.voice.speed} onChange={(e) => setDraft({...draft, voice: {...draft.voice, maxSpeed: Number(e.target.value)}})} /></label>
          <label className="field"><span>Minimum seconds</span><input type="number" value={draft.editorial.minSeconds} onChange={(e) => setDraft({...draft, editorial: {...draft.editorial, minSeconds: Number(e.target.value)}})} /></label>
          <label className="field"><span>Maximum seconds</span><input type="number" value={draft.editorial.maxSeconds} onChange={(e) => setDraft({...draft, editorial: {...draft.editorial, maxSeconds: Number(e.target.value)}})} /></label>
        </div>
        <div className="button-row end">
          <button
            className="button quiet"
            onClick={async () => {
              const label = window.prompt('Name the new category', `${selected.label} copy`);
              if (!label) return;
              await api.saveCategory({...selected, id: slugify(label), label, shortLabel: label});
              onChanged();
            }}
          >
            Clone category
          </button>
          <button className="button primary" onClick={async () => {await api.saveCategory(draft); onChanged();}}>Save category</button>
        </div>
      </div>
    </div>
  );
};

const AudioLibrary = () => {
  const [narrations, setNarrations] = useState<NarrationAssetRecord[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void api.narrations()
      .then(setNarrations)
      .catch((cause) =>
        setNotice(cause instanceof Error ? cause.message : String(cause)),
      );
  }, []);

  const finished = narrations.filter((item) => item.usage === 'finished');
  const references = narrations.filter((item) => item.usage === 'reference');

  return (
    <div className="page">
      <PageHeader
        eyebrow="Narration pipeline"
        title="Voice and audio, without hidden behavior."
        description="Choose local text-to-speech for an approved English script, or upload one finished recording that already speaks the complete script."
      />
      {notice ? <p className="form-error">{notice}</p> : null}
      <div className="model-status-grid">
        <article className="model-status ready">
          <span>● Production ready</span>
          <strong>Local Studio TTS</strong>
          <small>
            Kokoro generates every approved English scene locally. Programming
            tokens are converted into speech-friendly wording while captions
            retain the reviewed text.
          </small>
          <em>LOCAL</em>
        </article>
        <article className="model-status ready">
          <span>● Explicit source</span>
          <strong>Finished narration upload</strong>
          <small>
            WAV and MP3 tracks bypass synthesis. Use this only when the file
            already contains the complete approved narration.
          </small>
          <em>UPLOAD</em>
        </article>
        <article className="model-status">
          <span>○ Disabled</span>
          <strong>Experimental voice cloning</strong>
          <small>
            F5, IndicF5, and cloud cloning are removed from production until
            pronunciation and reference validation are reliable.
          </small>
          <em>OFF</em>
        </article>
      </div>
      <section className="library-section">
        <div className="section-title">
          <div>
            <h2>Finished narration tracks</h2>
            <p>Only these tracks can be selected as final video narration.</p>
          </div>
          <button className="button primary" onClick={() => navigate('/new')}>
            Create video
          </button>
        </div>
        {finished.length ? (
          <div className="voice-preview-grid">
            {finished.map((item) => (
              <article key={item.id}>
                <span>{item.locale}</span>
                <strong>{item.label}</strong>
                <small>{formatTime(item.durationSeconds)} · complete narration</small>
                <audio controls preload="metadata" src={api.narrationAudioUrl(item.id)} />
              </article>
            ))}
          </div>
        ) : (
          <div className="localization-empty">
            <h3>No finished narration uploads.</h3>
            <p>Use New video to upload a complete narration after approving its script.</p>
          </div>
        )}
        {references.length ? (
          <p className="review-notes">
            {references.length} legacy reference {references.length === 1 ? 'file is' : 'files are'}
            {' '}quarantined and cannot be selected for production.
          </p>
        ) : null}
      </section>
    </div>
  );
};

const CONSENT_PHRASE =
  'I confirm that I am an adult, this is my own voice, and I consent to Video Kit creating synthetic speech for projects I authorize. I can revoke this permission at any time.';

const REFERENCE_PASSAGE =
  'Technology can make difficult ideas easier to understand when we explain them one step at a time. In this recording I am speaking naturally, clearly, and at a comfortable pace. My voice changes slightly as I ask a question, share an exciting idea, and finish a thoughtful sentence. This private sample will only be used for video projects that I choose to create on this computer.';

const F5_REFERENCE_PASSAGE =
  'Clear explanations turn complex technology into simple steps. I speak naturally, pause between ideas, and emphasize the words that matter most.';

type EnrollmentProvider = 'chatterbox' | 'f5tts' | 'indicf5' | 'elevenlabs';

const localesForVoiceProvider = (provider: EnrollmentProvider) =>
  provider === 'chatterbox'
    ? (['en-US'] as SupportedLocale[])
    : provider === 'f5tts'
    ? LANGUAGES.map((language) => language.locale)
    : provider === 'indicf5'
      ? LANGUAGES.filter((language) => language.locale !== 'en-US').map(
          (language) => language.locale,
        )
      : (['en-US', 'hi-IN', 'ta-IN'] as SupportedLocale[]);

const Voices = () => {
  const [voices, setVoices] = useState<VoiceProfileRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<
    Awaited<ReturnType<typeof api.voice>> | null
  >(null);
  const [models, setModels] = useState<LanguageCatalog['models']>([]);
  const [name, setName] = useState('My narrator voice');
  const [ownerName, setOwnerName] = useState('');
  const [locales, setLocales] = useState<SupportedLocale[]>(['en-US']);
  const [provider, setProvider] = useState<EnrollmentProvider>('chatterbox');
  const [cloudVoiceId, setCloudVoiceId] = useState('');
  const [cloudAllowed, setCloudAllowed] = useState(false);
  const [adult, setAdult] = useState(false);
  const [owner, setOwner] = useState(false);
  const [notice, setNotice] = useState('');
  const [generated, setGenerated] = useState<string[]>([]);
  const [previewingLocale, setPreviewingLocale] = useState<string>();

  const refresh = useCallback(async (preferredId?: string) => {
    try {
      const [nextVoices, languageCatalog] = await Promise.all([
        api.voices(),
        api.languages(),
      ]);
      setVoices(nextVoices);
      setModels(languageCatalog.models);
      const nextId = preferredId ?? selectedId ?? nextVoices[0]?.id;
      setSelectedId(nextId);
      const nextDetail = nextId ? await api.voice(nextId) : null;
      setDetail(nextDetail);
      setGenerated(
        nextDetail?.previews
          .filter((preview) => preview.hasAudio)
          .map((preview) => preview.locale) ?? [],
      );
      setNotice('');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  }, [selectedId]);

  useEffect(() => void refresh(), []);
  useEffect(() => {
    if (!selectedId) return;
    void api.voice(selectedId)
      .then((nextDetail) => {
        setDetail(nextDetail);
        setGenerated(
          nextDetail.previews
            .filter((preview) => preview.hasAudio)
            .map((preview) => preview.locale),
        );
      })
      .catch(() => undefined);
  }, [selectedId]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const profile = await api.createVoice({
        name,
        ownerName,
        adultAttested: true,
        ownershipAttested: true,
        consentPhrase: CONSENT_PHRASE,
        provider,
        model:
          provider === 'chatterbox'
            ? 'ResembleAI/chatterbox'
            : provider === 'f5tts'
            ? 'SWivid/F5-TTS + ai4bharat/IndicF5'
            : provider === 'indicf5'
              ? 'ai4bharat/IndicF5'
              : cloudVoiceId,
        enabledLocales: locales,
        cloudAllowed,
      });
      await refresh(profile.id);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const samplesNewestFirst = detail?.samples.slice().reverse() ?? [];
  const selectedSample = (purpose: 'consent' | 'reference') =>
    samplesNewestFirst.find(
      (sample) => sample.purpose === purpose && sample.quality.valid,
    ) ?? samplesNewestFirst.find((sample) => sample.purpose === purpose);
  const selectedConsent = selectedSample('consent');
  const selectedReference = selectedSample('reference');
  const currentQualityIssues = [selectedConsent, selectedReference]
    .flatMap((sample) =>
      sample && !sample.quality.valid ? sample.quality.issues : [],
    )
    .filter((issue, index, issues) => issues.indexOf(issue) === index);
  const defaultReferencePassage =
    detail?.profile.activeVersion?.provider === 'chatterbox'
      ? F5_REFERENCE_PASSAGE
      : detail?.profile.activeVersion?.provider === 'f5tts'
        ? F5_REFERENCE_PASSAGE
        : REFERENCE_PASSAGE;
  const referencePassage =
    selectedReference?.transcript ?? defaultReferencePassage;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Private voice library"
        title="Your voice, with explicit consent."
        description="Reference audio remains outside public assets and is only used for languages whose previews you approve."
      />
      <div className="model-status-grid">
        {models.filter((model) => model.id === 'chatterbox').map((model) => (
          <div className={`model-status ${model.installed ? 'ready' : ''}`} key={model.id}>
            <span>{model.installed ? '● Ready' : '○ Setup required'}</span>
            <strong>{model.label}</strong>
            <small>{model.detail}</small>
            {!model.installed ? (
              <code>{model.id === 'chatterbox' ? 'npm run voice:setup' : 'npm run ai:setup'}</code>
            ) : <em>{model.device.toUpperCase()}</em>}
          </div>
        ))}
      </div>
      <div className="voices-layout">
        <aside className="voice-list">
          {voices.map((voice) => (
            <button
              className={voice.id === selectedId ? 'active' : ''}
              onClick={() => setSelectedId(voice.id)}
              key={voice.id}
            >
              <span className="voice-avatar">{voice.ownerName.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{voice.name}</strong>
                <small>{voice.ownerName} · {voice.status}</small>
              </span>
            </button>
          ))}
          <details className="new-voice-card" open={!voices.length}>
            <summary>＋ Enroll my voice</summary>
            <form onSubmit={create}>
              <label className="field compact">
                <span>Profile name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label className="field compact">
                <span>Your full name</span>
                <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} required />
              </label>
              <label className="field compact">
                <span>Voice engine</span>
                <select
                  value={provider}
                  onChange={(event) => {
                    const next = event.target.value as EnrollmentProvider;
                    setProvider(next);
                    const allowed = localesForVoiceProvider(next);
                    setLocales((current) => {
                      const retained = current.filter((locale) =>
                        allowed.includes(locale),
                      );
                      return retained.length ? retained : [allowed[0]];
                    });
                    if (next !== 'elevenlabs') {
                      setCloudAllowed(false);
                    }
                  }}
                >
                  <option value="chatterbox">My Voice · local English clone</option>
                </select>
              </label>
              {provider === 'elevenlabs' ? (
                <>
                  <label className="field compact">
                    <span>Your verified ElevenLabs voice ID</span>
                    <input
                      value={cloudVoiceId}
                      onChange={(event) => setCloudVoiceId(event.target.value)}
                      required
                    />
                  </label>
                  <label className="check consent-check">
                    <input
                      type="checkbox"
                      checked={cloudAllowed}
                      onChange={(event) => setCloudAllowed(event.target.checked)}
                    />
                    <span>
                      I understand that approved text is sent to ElevenLabs for
                      this profile. Local failures will never trigger this
                      provider automatically.
                    </span>
                  </label>
                </>
              ) : null}
              <span className="field-label">Preview languages</span>
              <div className="locale-checks">
                {LANGUAGES.filter(
                  (language) =>
                    localesForVoiceProvider(provider).includes(language.locale),
                ).map((language) => (
                  <label key={language.locale}>
                    <input
                      type="checkbox"
                      checked={locales.includes(language.locale)}
                      onChange={() =>
                        setLocales((current) =>
                          current.includes(language.locale)
                            ? current.filter((locale) => locale !== language.locale)
                            : [...current, language.locale],
                        )
                      }
                    />
                    {language.nativeLabel}
                  </label>
                ))}
              </div>
              <label className="check consent-check">
                <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />
                <span>I am an adult.</span>
              </label>
              <label className="check consent-check">
                <input type="checkbox" checked={owner} onChange={(event) => setOwner(event.target.checked)} />
                <span>This is my own voice; I am not enrolling another person or a minor.</span>
              </label>
              <button
                className="button primary small"
                disabled={
                  !adult ||
                  !owner ||
                  !ownerName.trim() ||
                  !locales.length ||
                  (provider === 'elevenlabs' &&
                    (!cloudAllowed || !cloudVoiceId.trim()))
                }
              >
                Create private profile
              </button>
            </form>
          </details>
        </aside>
        <section className="voice-editor">
          {notice ? (
            <p className={previewingLocale ? 'form-notice' : 'form-error'}>
              {notice}
            </p>
          ) : null}
          {detail ? (
            <>
              <div className="editor-heading">
                <div>
                  <span className={`status-pill ${detail.profile.status}`}>
                    {detail.profile.status}
                  </span>
                  <h2>{detail.profile.name}</h2>
                  <p>
                    Version {detail.profile.activeVersion?.version} ·{' '}
                    {detail.profile.activeVersion?.provider}
                  </p>
                </div>
                {detail.profile.status !== 'revoked' ? (
                  <button
                    className="button danger small"
                    onClick={async () => {
                      if (!window.confirm('Revoke this voice profile and invalidate its generation cache?')) return;
                      await api.revokeVoice(detail.profile.id);
                      await refresh(detail.profile.id);
                    }}
                  >
                    Revoke
                  </button>
                ) : (
                  <button
                    className="button danger small"
                    onClick={async () => {
                      if (!window.confirm('Permanently delete the private recordings for this profile?')) return;
                      await api.deleteVoice(detail.profile.id);
                      setSelectedId(undefined);
                      setDetail(null);
                      await refresh();
                    }}
                  >
                    Delete recordings
                  </button>
                )}
              </div>
              {detail.profile.status !== 'revoked' ? (
                <>
                  <div className="voice-step-grid">
                    <RecordingStep
                      number="01"
                      title="Record consent"
                      text={CONSENT_PHRASE}
                      minimumSeconds={2}
                      maximumSeconds={30}
                      complete={selectedConsent?.quality.valid ?? false}
                      onAudio={async (blob, filename) => {
                        const sample = await api.uploadVoiceSample(detail.profile.id, {
                          file: blob,
                          filename,
                          purpose: 'consent',
                          locale: 'en-US',
                          transcript: CONSENT_PHRASE,
                        });
                        await refresh(detail.profile.id);
                        return sample;
                      }}
                    />
                    <RecordingStep
                      number="02"
                      title="Record a clean reference"
                      text={referencePassage}
                      minimumSeconds={
                        detail.profile.activeVersion?.provider === 'chatterbox' ||
                        detail.profile.activeVersion?.provider === 'f5tts'
                          ? 6
                          : 20
                      }
                      maximumSeconds={
                        detail.profile.activeVersion?.provider === 'chatterbox' ||
                        detail.profile.activeVersion?.provider === 'f5tts'
                          ? 15
                          : 60
                      }
                      complete={selectedReference?.quality.valid ?? false}
                      onAudio={async (blob, filename) => {
                        const sample = await api.uploadVoiceSample(detail.profile.id, {
                          file: blob,
                          filename,
                          purpose: 'reference',
                          locale: 'en-US',
                          transcript: referencePassage,
                        });
                        await refresh(detail.profile.id);
                        return sample;
                      }}
                    />
                  </div>
                  {currentQualityIssues.length ? (
                    <div className="quality-warning">
                      <strong>The latest recording needs attention</strong>
                      {currentQualityIssues.map((issue) => <span key={issue}>{issue}</span>)}
                    </div>
                  ) : null}
                  <div className="preview-section">
                    <div className="section-title compact-title">
                      <div>
                        <h2>Language previews</h2>
                        <p>Listen before enabling this clone for production.</p>
                      </div>
                    </div>
                    <div className="voice-preview-grid">
                      {detail.profile.activeVersion?.enabledLocales.map((locale) => {
                        const language = LANGUAGES.find((entry) => entry.locale === locale);
                        const hasReference = selectedReference?.quality.valid ?? false;
                        const isGenerating = previewingLocale === locale;
                        return (
                          <article key={locale}>
                            <span>{language?.nativeLabel}</span>
                            <strong>{language?.label}</strong>
                            {generated.includes(locale) ? (
                              <audio controls src={api.voicePreviewUrl(detail.profile.id, locale)} />
                            ) : null}
                            <div className="button-row">
                              <button
                                className="button quiet small"
                                disabled={!hasReference || Boolean(previewingLocale)}
                                onClick={async () => {
                                  setPreviewingLocale(locale);
                                  setNotice(
                                    `Generating ${language?.label} preview locally… First use may take several minutes while the My Voice model is prepared.`,
                                  );
                                  try {
                                    await api.generateVoicePreview(detail.profile.id, locale);
                                    setGenerated((current) => [...new Set([...current, locale])]);
                                    setNotice('');
                                  } catch (cause) {
                                    setNotice(cause instanceof Error ? cause.message : String(cause));
                                  } finally {
                                    setPreviewingLocale(undefined);
                                  }
                                }}
                              >
                                {isGenerating ? 'Generating…' : 'Generate preview'}
                              </button>
                              <button
                                className="button primary small"
                                disabled={!generated.includes(locale)}
                                onClick={async () => {
                                  await api.acceptVoicePreview(detail.profile.id, locale);
                                  await refresh(detail.profile.id);
                                }}
                              >
                                Accept
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="localization-empty">
                  <h3>This voice profile is revoked.</h3>
                  <p>It cannot create new narration. Existing finished videos are unchanged.</p>
                </div>
              )}
            </>
          ) : (
            <div className="localization-empty">
              <h3>No voice profile selected.</h3>
              <p>Create a profile for your own adult voice to begin private enrollment.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const RecordingStep = ({
  number,
  title,
  text,
  complete,
  minimumSeconds,
  maximumSeconds,
  onAudio,
}: {
  number: string;
  title: string;
  text: string;
  complete: boolean;
  minimumSeconds: number;
  maximumSeconds: number;
  onAudio: (
    blob: Blob,
    filename: string,
  ) => Promise<{quality: {valid: boolean; issues: string[]}}>;
}) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notice, setNotice] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const disposedRef = useRef(false);

  useEffect(() => {
    if (!recording) return;
    const update = () => {
      const elapsed = Math.min(
        maximumSeconds,
        (Date.now() - startedAtRef.current) / 1000,
      );
      setElapsedSeconds(elapsed);
      if (
        elapsed >= maximumSeconds &&
        recorderRef.current?.state === 'recording'
      ) {
        recorderRef.current.stop();
        setRecording(false);
      }
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [recording, maximumSeconds]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const upload = async (blob: Blob, filename: string) => {
    setUploading(true);
    setNotice('Uploading and checking audio…');
    try {
      const sample = await onAudio(blob, filename);
      setNotice(
        sample.quality.valid
          ? 'Recording saved privately and passed the quality check.'
          : `Saved privately, but please record again: ${sample.quality.issues.join(' ')}`,
      );
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUploading(false);
    }
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      streamRef.current = stream;
      const chunks: BlobPart[] = [];
      const next = new MediaRecorder(stream);
      next.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      next.onstop = () => {
        const blob = new Blob(chunks, {type: next.mimeType || 'audio/webm'});
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (!disposedRef.current) void upload(blob, 'recording.webm');
      };
      next.start(500);
      recorderRef.current = next;
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setRecording(true);
      setNotice('');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <article className={`recording-step ${complete ? 'complete' : ''}`}>
      <header><span>{number}</span><strong>{title}</strong>{complete ? <i>✓</i> : null}</header>
      <blockquote>{text}</blockquote>
      <div className={`recording-guide ${recording ? 'active' : ''}`}>
        <strong>
          {recording
            ? `${elapsedSeconds.toFixed(1)}s`
            : `${minimumSeconds}–${maximumSeconds} seconds`}
        </strong>
        <span>
          {recording && elapsedSeconds < minimumSeconds
            ? `Keep reading for ${Math.ceil(minimumSeconds - elapsedSeconds)} more seconds.`
            : recording
              ? 'Minimum reached. Finish the sentence, then stop.'
              : `Record for at least ${minimumSeconds} seconds. Recording stops automatically at ${maximumSeconds} seconds.`}
        </span>
      </div>
      <div className="button-row">
        {!recording ? (
          <button type="button" className="button primary small" disabled={uploading} onClick={() => void start()}>● Start recording</button>
        ) : (
          <button
            type="button"
            className="button danger small"
            disabled={elapsedSeconds < minimumSeconds}
            onClick={() => {
              recorderRef.current?.stop();
              setRecording(false);
            }}
          >
            {elapsedSeconds < minimumSeconds
              ? `Wait ${Math.ceil(minimumSeconds - elapsedSeconds)}s`
              : '■ Stop and check'}
          </button>
        )}
        <label className={`button quiet small file-button ${recording || uploading ? 'disabled' : ''}`}>
          Upload audio
          <input
            type="file"
            accept="audio/*"
            disabled={recording || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file, file.name);
              event.target.value = '';
            }}
          />
        </label>
      </div>
      {notice ? <small>{notice}</small> : null}
    </article>
  );
};

const Jobs = ({jobs, selectedId, onChanged}: {jobs: JobRecord[]; selectedId?: string; onChanged: () => void}) => {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const selected = selectedId ?? jobs[0]?.id;
  useEffect(() => {
    if (!selected) return;
    let source: EventSource | null = null;
    void api.job(selected).then(setDetail);
    const job = jobs.find((item) => item.id === selected);
    if (job && ['queued', 'running'].includes(job.status)) {
      source = new EventSource(`/api/jobs/${selected}/events`);
      source.addEventListener('job', (event) => {
        setDetail(JSON.parse((event as MessageEvent).data) as JobDetail);
        onChanged();
      });
    }
    return () => source?.close();
  }, [selected, jobs.find((item) => item.id === selected)?.status]);
  return (
    <div className="page">
      <PageHeader eyebrow="Production queue" title="Jobs" description="Every render is isolated, resumable, and tied to an immutable project revision." />
      <div className="jobs-layout">
        <div className="jobs-list">
          {jobs.length ? jobs.map((job) => (
            <button className={`job-row ${selected === job.id ? 'active' : ''}`} key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}>
              <span className={`job-status ${job.status}`} />
              <span><strong>{STATUS_LABELS[job.status]}</strong><small>{productionStageLabel(job.stage)} · {timeAgo(job.updatedAt)}</small></span>
              <em>{Math.round(job.progress * 100)}%</em>
            </button>
          )) : <p className="muted-copy">No jobs yet.</p>}
        </div>
        <div className="job-detail">
          {detail ? (
            <>
              <div className="job-detail-head">
                <div><span className={`status-badge ${detail.status}`}>{STATUS_LABELS[detail.status]}</span><h2>{productionStageLabel(detail.stage)}</h2><p>Job {detail.id.slice(0, 8)}</p></div>
                <div className="button-row">
                  {detail.status === 'running' || detail.status === 'queued' ? <button className="button quiet small" onClick={async () => {await api.cancelJob(detail.id); onChanged();}}>Cancel</button> : null}
                  {['failed', 'cancelled', 'interrupted'].includes(detail.status) ? <button className="button primary small" onClick={async () => {const job = await api.retryJob(detail.id); onChanged(); navigate(`/jobs/${job.id}`);}}>Retry</button> : null}
                </div>
              </div>
              <div className="progress-track"><i style={{width: `${detail.progress * 100}%`}} /></div>
              {detail.error ? <p className="job-error">{detail.error}</p> : null}
              <h3>Master pipeline</h3>
              <ProductionPipelineMap
                activeStage={detail.stage}
                completed={detail.status === 'completed'}
              />
              <h3>Activity</h3>
              <div className="event-log">
                {detail.events.map((event) => (
                  <div className={event.level} key={event.id}><time>{new Date(event.createdAt).toLocaleTimeString()}</time><span>{productionStageLabel(event.stage)}</span><p>{event.message}</p></div>
                ))}
              </div>
              {detail.artifacts.length ? (
                <>
                  <h3>Outputs</h3>
                  <div className="artifact-grid">
                    {detail.artifacts.map((artifact) => (
                      <a href={api.artifactUrl(artifact)} className="artifact" key={artifact.id}>
                        <span>{artifact.kind === 'video' ? '▶' : artifact.kind === 'thumbnail' ? '▧' : '↓'}</span>
                        <div><strong>{artifact.filename}</strong><small>{(artifact.sizeBytes / 1024 / 1024).toFixed(artifact.sizeBytes > 1_000_000 ? 1 : 2)} MB · {artifact.kind}</small></div>
                      </a>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : <Empty title="Select a job" text="Progress, logs, and downloadable outputs will appear here." />}
        </div>
      </div>
    </div>
  );
};

const Legacy = ({onChanged}: {onChanged: () => void}) => {
  const [videos, setVideos] = useState<LegacyVideo[]>([]);
  useEffect(() => void api.legacyVideos().then(setVideos), []);
  return (
    <div className="page">
      <PageHeader eyebrow="Source-controlled catalog" title="Existing videos" description="These originals remain read-only. Clone one to create a fully editable managed project." />
      <div className="legacy-list">
        {videos.map((video) => (
          <div className="legacy-row" key={video.ref}>
            <span className={`legacy-icon ${video.categoryId}`}>{video.title.slice(0, 1)}</span>
            <div><strong>{video.title}</strong><small>{video.ref} · {video.scenes} scenes · {formatTime(video.durationSeconds)}</small></div>
            <button className="button quiet small" onClick={async () => {const project = await api.cloneLegacy(video.ref); onChanged(); navigate(`/projects/${project.project.id}`);}}>Clone and edit</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Empty = ({title, text, action, onAction}: {title: string; text: string; action?: string; onAction?: () => void}) => (
  <div className="empty">
    <span>◇</span><h3>{title}</h3><p>{text}</p>
    {action ? <button className="button primary" onClick={onAction}>{action}</button> : null}
  </div>
);

const Modal = ({title, children, onClose}: {title: string; children: React.ReactNode; onClose: () => void}) => (
  <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose();}}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <header><h2>{title}</h2><button aria-label="Close" onClick={onClose}>×</button></header>
      {children}
    </section>
  </div>
);
