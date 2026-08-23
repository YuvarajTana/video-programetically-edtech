import type {JobDetail, JobRecord} from '@video-kit/core/contracts';
import {productionStageLabel} from '@video-kit/core/pipeline';
import {useEffect, useState} from 'react';
import {api} from '../api';
import {Empty, PageHeader, ProductionPipelineMap} from '../components';
import {timeAgo} from '../lib/format';
import {STATUS_LABELS} from '../lib/jobs';
import {navigate} from '../lib/router';

export const Jobs = ({jobs, selectedId, onChanged}: {jobs: JobRecord[]; selectedId?: string; onChanged: () => void}) => {
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
