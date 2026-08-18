/**
 * Input props and identifiers for the managed (database-driven) compositions.
 * Pure data so the API and the CLI can address a composition without
 * importing the Remotion render tree.
 */
import type {ChannelProfile} from './channels';
import type {FormatId} from './design/formats';
import type {VideoSpec} from './spec';

export type ManagedVideoInput = {
  spec: VideoSpec;
  channel: ChannelProfile;
  renderProfile: FormatId;
};

export const MANAGED_COMPOSITION_IDS: Record<FormatId, string> = {
  landscape: 'managed--landscape',
  portrait: 'managed--portrait',
  square: 'managed--square',
  carousel: 'managed--carousel',
};

export const managedDefaults: ManagedVideoInput = {
  renderProfile: 'landscape',
  channel: {
    id: 'tech',
    label: 'Video Studio',
    shortLabel: 'Preview',
    handle: '@VideoStudio',
    theme: {
      id: 'tech',
      color: {
        bg: '#0a0e0c',
        bgDeep: '#060907',
        surface: '#141f1a',
        surfaceHi: '#1b2a24',
        line: '#26362f',
        lineHi: '#33473f',
        text: '#e9e7e2',
        textDim: '#b6beb9',
        muted: '#7e8c86',
      },
      accents: {
        primary: '#f5a524',
        secondary: '#a78bfa',
        success: '#2dd4bf',
        attention: '#ff6b5b',
        info: '#60a5fa',
      },
      font: {
        display: "'Fraunces', Georgia, serif",
        body: "'Hanken Grotesk', system-ui, sans-serif",
        mono: "'JetBrains Mono', ui-monospace, monospace",
      },
      frameBackground:
        'radial-gradient(120% 80% at 50% 0%, rgba(20,31,26,0.34), transparent 60%)',
      chrome: {progressHeight: 5, progressOpacity: 0.85, captionRadius: 14},
    },
    defaultDeliveries: ['youtube-long'],
    defaultTemplate: 'concept-explainer',
    defaultCta: 'Follow for more',
    defaultHashtags: {youtube: [], instagram: []},
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
      minSeconds: 1,
      maxSeconds: 1_800,
      maxNarrationWpm: 165,
    },
  },
  spec: {
    channel: 'tech',
    slug: 'managed-preview',
    title: 'Managed preview',
    template: 'concept-explainer',
    scenes: [
      {
        type: 'title',
        durationInFrames: 90,
        title: 'Managed preview',
        narration: 'Your project will appear here.',
      },
    ],
  },
};

