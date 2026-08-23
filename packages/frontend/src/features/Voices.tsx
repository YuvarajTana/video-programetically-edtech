import type {LanguageCatalog, VoiceProfileRecord} from '@video-kit/core/contracts';
import {LANGUAGES, type SupportedLocale} from '@video-kit/core/languages';
import {useCallback, useEffect, useState, type FormEvent} from 'react';
import {api} from '../api';
import {PageHeader} from '../components';
import {RecordingStep} from './RecordingStep';
import {CONSENT_PHRASE, F5_REFERENCE_PASSAGE, REFERENCE_PASSAGE, localesForVoiceProvider, type EnrollmentProvider} from './constants';

export const Voices = () => {
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
