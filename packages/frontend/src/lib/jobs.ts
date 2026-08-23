import type {JobRecord} from '@video-kit/core/contracts';

export const STATUS_LABELS: Record<JobRecord['status'], string> = {
  queued: 'Queued',
  running: 'In progress',
  completed: 'Ready',
  failed: 'Needs attention',
  cancelled: 'Cancelled',
  interrupted: 'Interrupted',
};
