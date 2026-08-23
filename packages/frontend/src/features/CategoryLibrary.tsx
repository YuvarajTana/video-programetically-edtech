import type {CategoryDefinition} from '@video-kit/core/contracts';
import {slugify} from '@video-kit/core/storyboard';
import {useEffect, useState} from 'react';
import {api} from '../api';

export const CategoryLibrary = ({categories, onChanged}: {categories: CategoryDefinition[]; onChanged: () => void}) => {
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
