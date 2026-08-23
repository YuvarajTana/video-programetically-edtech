import {PRODUCTION_PIPELINE, productionStageIndex} from '@video-kit/core/pipeline';

export const ProductionPipelineMap = ({
  activeStage,
  completed = false,
}: {
  activeStage?: string;
  completed?: boolean;
}) => {
  const activeIndex = activeStage ? productionStageIndex(activeStage) : -1;
  return (
    <div className="production-pipeline" aria-label="Video production pipeline">
      {PRODUCTION_PIPELINE.map((stage, index) => {
        const state = completed || index < activeIndex
          ? 'complete'
          : index === activeIndex
            ? 'active'
            : '';
        return (
          <div className={`pipeline-step ${state}`} key={stage.id}>
            <span className="pipeline-index">{String(index + 1).padStart(2, '0')}</span>
            <strong>{stage.label}</strong>
            {'tracks' in stage ? (
              <div className="pipeline-tracks">
                {stage.tracks.map((track) => <small key={track}>{track}</small>)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
