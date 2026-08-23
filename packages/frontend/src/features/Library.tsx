import {useState} from 'react';
import type {Catalog} from '../api';
import {PageHeader} from '../components';
import {CategoryLibrary} from './CategoryLibrary';
import {TemplateLibrary} from './TemplateLibrary';
import {ThemeLibrary} from './ThemeLibrary';

export const Library = ({catalog, onChanged}: {catalog: Catalog; onChanged: () => void}) => {
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
