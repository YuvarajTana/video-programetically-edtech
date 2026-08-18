import {useEffect, useState} from 'react';
import {api, type LegacyVideo} from '../api';
import {PageHeader} from '../components';
import {formatTime} from '../lib/format';
import {navigate} from '../lib/router';

export const Legacy = ({onChanged}: {onChanged: () => void}) => {
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
