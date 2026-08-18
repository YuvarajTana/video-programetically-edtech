import type {CatalogTheme, ThemeDefinition} from '@video-kit/core/contracts';
import {slugify} from '@video-kit/core/storyboard';
import {useEffect, useState} from 'react';
import {api} from '../api';

export const ThemeLibrary = ({themes, onChanged}: {themes: CatalogTheme[]; onChanged: () => void}) => {
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
