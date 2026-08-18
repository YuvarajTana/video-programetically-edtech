import type {JobRecord, ProjectRecord} from '@video-kit/core/contracts';
import type {Catalog} from '../api';
import {Empty, Metric} from '../components';
import {timeAgo} from '../lib/format';
import {navigate} from '../lib/router';

export const Dashboard = ({
  projects,
  jobs,
  catalog,
}: {
  projects: ProjectRecord[];
  jobs: JobRecord[];
  catalog: Catalog;
}) => {
  const latestJob = jobs[0];
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Your production desk</span>
          <h1>From a script to a finished video.</h1>
          <p>
            Shape the story, preview every frame, generate the voice, and render
            every delivery—all on this Mac.
          </p>
          <div className="button-row">
            <button className="button primary" onClick={() => navigate('/new')}>
              Create a video <span>→</span>
            </button>
            <button className="button quiet" onClick={() => navigate('/legacy')}>
              Use an existing video
            </button>
          </div>
        </div>
        <div className="hero-visual" aria-label="Production workflow">
          <div className="workflow-node done"><span>01</span>Script</div>
          <div className="workflow-line" />
          <div className="workflow-node current"><span>02</span>Shape</div>
          <div className="workflow-line" />
          <div className="workflow-node"><span>03</span>Render</div>
        </div>
      </section>
      <section className="metric-grid">
        <Metric label="Projects" value={String(projects.length)} note="Saved locally" />
        <Metric
          label="Active jobs"
          value={String(jobs.filter((j) => ['queued', 'running'].includes(j.status)).length)}
          note={latestJob ? `${latestJob.stage} · ${Math.round(latestJob.progress * 100)}%` : 'Queue is clear'}
        />
        <Metric label="Templates" value={String(catalog.templates.length)} note="Reusable story shapes" />
        <Metric label="Themes" value={String(catalog.themes.length)} note="Versioned visual systems" />
      </section>
      <div className="section-title">
        <div>
          <h2>Recent projects</h2>
          <p>Continue where you left off.</p>
        </div>
        <button className="text-button" onClick={() => navigate('/new')}>New project ＋</button>
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.slice(0, 6).map((project) => {
            const category = catalog.categories.find((item) => item.id === project.categoryId);
            const theme = catalog.themes.find((item) => item.id === project.themeId);
            return (
              <button
                className="project-card"
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{'--card-accent': theme?.definition.accents.primary} as React.CSSProperties}
              >
                <div className="project-card-top">
                  <span className="category-pill">{category?.shortLabel ?? project.categoryId}</span>
                  <span className="more">•••</span>
                </div>
                <div className="mini-frame">
                  <span>{project.title.slice(0, 1)}</span>
                  <i />
                </div>
                <h3>{project.title}</h3>
                <footer>
                  <span>{project.defaultLocale}</span>
                  <span>{timeAgo(project.updatedAt)}</span>
                </footer>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Your first video starts with a script"
          text="Choose a channel and template, paste your narration, then shape the generated scenes."
          action="Create the first project"
          onAction={() => navigate('/new')}
        />
      )}
    </div>
  );
};
