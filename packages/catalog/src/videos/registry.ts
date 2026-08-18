import type {VideoSpec} from '@video-kit/core/spec';
import type {ChannelId} from '@video-kit/core/channels';
import {FUN_VIDEOS} from './fun/registry';
import {LEARN_VIDEOS} from './learn/registry';
import {STYLE_GUIDES} from './style-guides/registry';
import {TECH_VIDEOS} from './tech/registry';

/** Production content. Style guides are deliberately excluded from batch renders. */
export const VIDEOS: VideoSpec[] = [
  ...TECH_VIDEOS,
  ...LEARN_VIDEOS,
  ...FUN_VIDEOS,
];

/** Everything visible in Remotion Studio. */
export const STUDIO_VIDEOS: VideoSpec[] = [...VIDEOS, ...STYLE_GUIDES];

export const byRef = (channel: ChannelId, slug: string) =>
  VIDEOS.find((video) => video.channel === channel && video.slug === slug);
