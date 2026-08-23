import type {CatalogTemplate, TemplateDefinition} from '@video-kit/core/contracts';
import type {SceneType} from '@video-kit/core/spec';
import {slugify} from '@video-kit/core/storyboard';
import {useEffect, useState} from 'react';
import {api} from '../api';

export const TemplateLibrary = ({templates, onChanged}: {templates: CatalogTemplate[]; onChanged: () => void}) => {
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
