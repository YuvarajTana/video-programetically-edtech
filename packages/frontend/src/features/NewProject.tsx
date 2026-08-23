import type {CategoryDefinition, GeneratedScriptScene, NarrationAssetRecord, VoiceProfileRecord} from '@video-kit/core/contracts';
import {LONG_FORM_MINUTES, MAX_VIDEO_SECONDS, secondsForVideoFormat, type LongFormMinutes} from '@video-kit/core/durations';
import {LANGUAGES, type SupportedLocale} from '@video-kit/core/languages';
import type {MusicTrackCatalogItem} from '@video-kit/core/music';
import type {Scene} from '@video-kit/core/spec';
import {useEffect, useState, type FormEvent} from 'react';
import {api, type Catalog} from '../api';
import {PageHeader, ProductionPipelineMap} from '../components';
import {duration, formatTime} from '../lib/format';
import {navigate} from '../lib/router';
import {sceneFromGeneratedPlan} from '../lib/scenes';
import {DELIVERY_CHOICES, describeOutputs} from '../outputs';

export const NewProject = ({
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
  // Fields a category can require. Nothing collected them before, so every
  // project in such a category was created failing its own editorial rules.
  const [ageBand, setAgeBand] = useState('');
  const [objective, setObjective] = useState('');
  const [safetyStatus, setSafetyStatus] = useState<'draft' | 'reviewed' | 'approved'>(
    'draft',
  );
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

  /**
   * Which of the three metadata fields this category insists on. Read off the
   * category record the form already holds, so a category that turns a flag on
   * starts collecting the field with no edit here.
   */
  const category =
    catalog.categories.find((item) => item.id === categoryId) ?? catalog.categories[0];
  const required = {
    ageBand: Boolean(category.editorial.requiresAgeBand),
    objective: Boolean(category.editorial.requiresLearningObjective),
    safetyStatus: Boolean(category.editorial.requiresSafetyReview),
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
        ...(required.ageBand && ageBand.trim() ? {ageBand: ageBand.trim()} : {}),
        ...(required.objective && objective.trim() ? {objective: objective.trim()} : {}),
        ...(required.safetyStatus ? {safetyStatus} : {}),
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
                {required.ageBand ? (
                  <label className="field">
                    <span>Age band</span>
                    <input
                      value={ageBand}
                      placeholder="6–9"
                      onChange={(event) => setAgeBand(event.target.value)}
                    />
                    <small>Required for {category.label} videos.</small>
                  </label>
                ) : null}
                {required.safetyStatus ? (
                  <label className="field">
                    <span>Safety review</span>
                    <select
                      value={safetyStatus}
                      onChange={(event) =>
                        setSafetyStatus(
                          event.target.value as 'draft' | 'reviewed' | 'approved',
                        )
                      }
                    >
                      <option value="draft">draft</option>
                      <option value="reviewed">reviewed</option>
                      <option value="approved">approved</option>
                    </select>
                    <small>Must be reviewed or approved before a job passes cleanly.</small>
                  </label>
                ) : null}
              </div>
              {required.objective ? (
                <label className="field">
                  <span>Learning objective</span>
                  <textarea
                    rows={2}
                    value={objective}
                    placeholder="What a viewer can do afterwards that they could not before."
                    onChange={(event) => setObjective(event.target.value)}
                  />
                  <small>Required for {category.label} videos.</small>
                </label>
              ) : null}
              <div className="delivery-row">
                <span>Outputs</span>
                {DELIVERY_CHOICES.map(({id: deliveryId, label}) => (
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
              {deliveries.length ? (
                <p className="delivery-summary">
                  Produces {describeOutputs(deliveries)}.
                </p>
              ) : null}
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
