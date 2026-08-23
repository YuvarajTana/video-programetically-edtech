import {useCallback, useEffect, useState} from 'react';
import type {JobRecord, ProjectRecord} from '@video-kit/core/contracts';
import {api, type Catalog} from './api';
import {NavItem} from './components';
import {Dashboard} from './features/Dashboard';
import {Jobs} from './features/Jobs';
import {Legacy} from './features/Legacy';
import {Library} from './features/Library';
import {NewProject} from './features/NewProject';
import {ProjectEditor} from './features/ProjectEditor';
import {Voices} from './features/Voices';
import {navigate, parseRoute, type View} from './lib/router';

export const App = () => {
  const [route, setRoute] = useState<View>(parseRoute);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [nextCatalog, nextProjects, nextJobs] = await Promise.all([
        api.catalog(),
        api.projects(),
        api.jobs(),
      ]);
      setCatalog(nextCatalog);
      setProjects(nextProjects);
      setJobs(nextJobs);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const listener = () => setRoute(parseRoute());
    window.addEventListener('hashchange', listener);
    void refresh();
    const interval = window.setInterval(() => void refresh(), 4_000);
    return () => {
      window.removeEventListener('hashchange', listener);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const activeJobs = jobs.filter(
    (job) => job.status === 'queued' || job.status === 'running',
  ).length;

  if (loading || !catalog) {
    return (
      <div className="boot">
        <div className="brand-mark">VK</div>
        <p>Preparing your local studio…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('/')}>
          <span className="brand-mark">VK</span>
          <span>
            <strong>Video Kit</strong>
            <small>Local studio</small>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <NavItem active={route.name === 'dashboard'} icon="⌂" label="Home" path="/" />
          <NavItem active={route.name === 'new'} icon="＋" label="New video" path="/new" />
          <NavItem active={route.name === 'library'} icon="▦" label="Library" path="/library" />
          <NavItem
            active={route.name === 'jobs'}
            icon="◌"
            label="Jobs"
            path="/jobs"
            badge={activeJobs || undefined}
          />
          <NavItem active={route.name === 'audio'} icon="◉" label="Voice & audio" path="/audio" />
          <NavItem active={route.name === 'legacy'} icon="↗" label="Existing videos" path="/legacy" />
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />
          <div>
            <strong>Running locally</strong>
            <small>Private to this Mac</small>
          </div>
        </div>
      </aside>
      <main className="main">
        {error ? (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        ) : null}
        {route.name === 'dashboard' ? (
          <Dashboard projects={projects} jobs={jobs} catalog={catalog} />
        ) : null}
        {route.name === 'new' ? (
          <NewProject catalog={catalog} onChanged={refresh} />
        ) : null}
        {route.name === 'editor' ? (
          <ProjectEditor id={route.id} onChanged={refresh} />
        ) : null}
        {route.name === 'library' ? (
          <Library catalog={catalog} onChanged={refresh} />
        ) : null}
        {route.name === 'jobs' ? (
          <Jobs jobs={jobs} selectedId={route.id} onChanged={refresh} />
        ) : null}
        {route.name === 'audio' ? <Voices /> : null}
        {route.name === 'legacy' ? <Legacy onChanged={refresh} /> : null}
      </main>
    </div>
  );
};
