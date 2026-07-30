import {funTheme, learnTheme, techTheme} from '../themes';
import type {ChannelId, ChannelProfile} from './types';

export const CHANNELS: Record<ChannelId, ChannelProfile> = {
  tech: {
    id: 'tech',
    label: 'AI Data Dynamics',
    shortLabel: 'Tech, visually',
    handle: '@AIDataDynamics',
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
      speed: 0.98,
      language: 'a',
      targetLufs: -14,
      truePeakDb: -1.5,
      loudnessRange: 11,
    },
    editorial: {
      minSeconds: 20,
      maxSeconds: 480,
      maxNarrationWpm: 220,
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
      speed: 0.92,
      language: 'a',
      targetLufs: -14,
      truePeakDb: -1.5,
      loudnessRange: 11,
    },
    editorial: {
      minSeconds: 20,
      maxSeconds: 90,
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
      speed: 1.08,
      language: 'a',
      targetLufs: -14,
      truePeakDb: -1.5,
      loudnessRange: 11,
    },
    editorial: {
      minSeconds: 8,
      maxSeconds: 45,
      maxNarrationWpm: 230,
    },
  },
};

export const CHANNEL_IDS = Object.keys(CHANNELS) as ChannelId[];

export const getChannel = (id: ChannelId) => CHANNELS[id];
