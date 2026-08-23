import type {ResolvedProject, TranslationUnitRecord} from '@video-kit/core/contracts';
import {LANGUAGES, type SupportedLocale} from '@video-kit/core/languages';
import {useEffect, useState} from 'react';
import {api} from '../api';
import {navigate} from '../lib/router';

export const LocalizationPanel = ({
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
