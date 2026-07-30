import type {DeliveryId, PlatformId} from '../publishing/types';
import type {VideoTheme} from '../themes/types';

export type ChannelId = 'tech' | 'learn' | 'fun';

export type ChannelProfile = {
  id: ChannelId;
  label: string;
  shortLabel: string;
  handle: string;
  theme: VideoTheme;
  defaultDeliveries: DeliveryId[];
  defaultTemplate: string;
  defaultCta: string;
  defaultHashtags: Record<PlatformId, string[]>;
  editorial: {
    minSeconds: number;
    maxSeconds: number;
    maxNarrationWpm: number;
    requiresAgeBand?: boolean;
    requiresLearningObjective?: boolean;
    requiresSafetyReview?: boolean;
  };
};
