import type {VideoSpec} from '@video-kit/core/spec';
import {
  validateSpec,
  type EditorialIssue,
  type ValidateOptions,
} from '@video-kit/core/editorial';
import type {StudioRepository} from './repository';

/**
 * Editorial rules, run over what is already in the database.
 *
 * The rules used to run only on source-controlled specs, so turning them on
 * for studio projects can only be done knowing what it would say about
 * projects that render fine today. That is what this reports, and it is what
 * decides whether an editorial error may fail a job or must stay advisory.
 */
export type EditorialProblem = {
  projectId: string;
  variantId: string;
  label: string;
  errors: EditorialIssue[];
  warnings: EditorialIssue[];
};

export const checkStoredEditorial = (
  repository: StudioRepository,
  options: ValidateOptions = {},
): EditorialProblem[] => {
  const problems: EditorialProblem[] = [];

  for (const project of repository.listProjects()) {
    for (const variant of repository.listVariants(project.id)) {
      let spec: VideoSpec;
      let channel;
      try {
        // getProject resolves the category into the ChannelProfile the rules
        // read thresholds from, so the check sees exactly what a job would.
        const resolved = repository.getProject(project.id, variant.id);
        spec = resolved.variant.spec as VideoSpec;
        channel = resolved.channel;
      } catch (error) {
        // A spec that will not even parse is db:check-specs' problem, not this
        // one; reporting it twice would just obscure which fix applies.
        problems.push({
          projectId: project.id,
          variantId: variant.id,
          label: `${project.title} (${variant.locale})`,
          errors: [{severity: 'error', path: 'spec', message: String(error)}],
          warnings: [],
        });
        continue;
      }

      const issues = validateSpec(spec, channel, options);
      if (!issues.length) continue;
      problems.push({
        projectId: project.id,
        variantId: variant.id,
        label: `${project.title} (${variant.locale})`,
        errors: issues.filter((issue) => issue.severity === 'error'),
        warnings: issues.filter((issue) => issue.severity === 'warning'),
      });
    }
  }

  return problems;
};
