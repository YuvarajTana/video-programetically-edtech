import type {DeliveryId, PlatformId} from '../publishing/types';
import type {VideoTheme} from '../themes/types';

/**
 * Channel/category ids are data-driven for managed projects. The three built-in
 * ids remain available for the source-controlled legacy catalog.
 */
export type ChannelId = string;
export type BuiltInChannelId = 'tech' | 'learn' | 'fun';

export type VoiceProfile = {
  model: string;
  preset: string;
  speed: number;
  /** Optional hard ceiling used by local TTS timing fit. */
  maxSpeed?: number;
  language: string;
  targetLufs: number;
  truePeakDb: number;
  loudnessRange: number;
};

export type ChannelProfile = {
  id: ChannelId;
  label: string;
  shortLabel: string;
  handle: string;
  /** Personal/creator handle shown beside the channel handle on every frame. */
  secondaryHandle?: string;
  theme: VideoTheme;
  defaultDeliveries: DeliveryId[];
  defaultTemplate: string;
  defaultCta: string;
  defaultHashtags: Record<PlatformId, string[]>;
  voice: VoiceProfile;
  editorial: {
    minSeconds: number;
    maxSeconds: number;
    maxNarrationWpm: number;
    /**
     * Floor for narrated text-led scenes (title/callout/bigStat). A slow line
     * over a static frame reads as dead air; mechanism scenes are exempt
     * because their visuals carry the pause.
     */
    minNarrationWpm?: number;
    requiresAgeBand?: boolean;
    requiresLearningObjective?: boolean;
    requiresSafetyReview?: boolean;
  };
};
