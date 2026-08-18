// Import concrete theme modules rather than the themes barrel so this
// registry's import chain stays free of JSX. Node-based tooling (validate,
// captions, package, tests) imports it directly without bundling.
import {funTheme} from '../themes/fun';
import {learnTheme} from '../themes/learn';
import {techTheme} from '../themes/tech';
import type {BuiltInChannelId, ChannelId, ChannelProfile} from './types';

export const CHANNELS: Record<BuiltInChannelId, ChannelProfile> = {
  tech: {
    id: 'tech',
    label: 'AI Data Dynamics',
    shortLabel: 'Tech, visually',
    handle: '@AIDataDynamics',
    secondaryHandle: '@YuvarajTana',
    theme: techTheme,
    defaultDeliveries: ['youtube-long', 'instagram-reel'],
    defaultTemplate: 'concept-explainer',
    defaultCta: 'Follow for more',
    defaultHashtags: {
      youtube: ['technology', 'programming', 'ai'],
      instagram: ['tech', 'programming', 'artificialintelligence'],
    },
    voice: {
      model: 'mlx-community/Kokoro-82M-bf16',
      preset: 'am_adam',
      speed: 1,
      maxSpeed: 1,
      language: 'a',
      targetLufs: -14,
      truePeakDb: -1.5,
      loudnessRange: 11,
    },
    editorial: {
      minSeconds: 20,
      maxSeconds: 1_800,
      maxNarrationWpm: 165,
      minNarrationWpm: 130,
    },
  },
  learn: {
    id: 'learn',
    label: 'Learn Fast',
    shortLabel: 'Learn it fast',
    handle: '@LearnChannel',
    theme: learnTheme,
    defaultDeliveries: ['youtube-short', 'instagram-reel'],
    defaultTemplate: 'why-does-this-happen',
    defaultCta: 'Try the quick check',
    defaultHashtags: {
      youtube: ['learning', 'students', 'education'],
      instagram: ['learnfast', 'studentlife', 'education'],
    },
    voice: {
      model: 'mlx-community/Kokoro-82M-bf16',
      preset: 'af_heart',
      speed: 1,
      maxSpeed: 1,
      language: 'a',
      targetLufs: -14,
      truePeakDb: -1.5,
      loudnessRange: 11,
    },
    editorial: {
      minSeconds: 20,
      maxSeconds: 1_800,
      maxNarrationWpm: 170,
      requiresAgeBand: true,
      requiresLearningObjective: true,
      requiresSafetyReview: true,
    },
  },
  fun: {
    id: 'fun',
    label: 'Fun Loop',
    shortLabel: 'Wait for it',
    handle: '@FunChannel',
    theme: funTheme,
    defaultDeliveries: ['youtube-short', 'instagram-reel'],
    defaultTemplate: 'did-you-know',
    defaultCta: 'Watch it loop',
    defaultHashtags: {
      youtube: ['fun', 'shorts', 'challenge'],
      instagram: ['funreels', 'challenge', 'watchtillend'],
    },
    voice: {
      model: 'mlx-community/Kokoro-82M-bf16',
      preset: 'af_sky',
      speed: 1,
      maxSpeed: 1,
      language: 'a',
      targetLufs: -14,
      truePeakDb: -1.5,
      loudnessRange: 11,
    },
    editorial: {
      minSeconds: 8,
      maxSeconds: 1_800,
      maxNarrationWpm: 230,
    },
  },
};

export const CHANNEL_IDS = Object.keys(CHANNELS) as BuiltInChannelId[];

export const getChannel = (id: ChannelId) => {
  const channel = CHANNELS[id as BuiltInChannelId];
  if (!channel) throw new Error(`Unknown source-controlled channel: ${id}`);
  return channel;
};
