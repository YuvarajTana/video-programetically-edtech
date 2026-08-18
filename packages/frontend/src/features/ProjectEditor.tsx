import type {EditableVideoSpec, NarrationAssetRecord, ResolvedProject} from '@video-kit/core/contracts';
import {FORMATS, type FormatId} from '@video-kit/core/design/formats';
import {LANGUAGES} from '@video-kit/core/languages';
import type {MotionCanvasElement, Scene, SceneType} from '@video-kit/core/spec';
import {Suspense, useCallback, useEffect, useState} from 'react';
import {api} from '../api';
import {Modal, SceneJsonEditor} from '../components';
import {ScenePreview} from '../components/ScenePreviewLazy';
import {duration, formatTime} from '../lib/format';
import {navigate} from '../lib/router';
import {sceneFromType, sceneLabel} from '../lib/scenes';
import {ASPECT_IDS, aspectRatioLabel} from '../outputs';
import {LocalizationPanel} from './LocalizationPanel';

export const ProjectEditor = ({id, onChanged}: {id: string; onChanged: () => void}) => {
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
              {ASPECT_IDS.map((id) => (
                <button className={profile === id ? 'active' : ''} onClick={() => setProfile(id)} key={id}>
                  {aspectRatioLabel(id)}
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
