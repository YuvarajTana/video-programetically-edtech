import type {VideoSpec} from '../types';
import type {ChannelProfile} from '../channels/types';
import type {FormatId} from '../design/formats';
import type {DeliveryId, DeliveryTarget} from './types';

export const DELIVERIES: Record<DeliveryId, DeliveryTarget> = {
  'youtube-long': {
    id: 'youtube-long',
    label: 'YouTube 16:9',
    platform: 'youtube',
    renderProfile: 'landscape',
  },
  'youtube-short': {
    id: 'youtube-short',
    label: 'YouTube Short 9:16',
    platform: 'youtube',
    renderProfile: 'portrait',
  },
  'instagram-reel': {
    id: 'instagram-reel',
    label: 'Instagram Reel 9:16',
    platform: 'instagram',
    renderProfile: 'portrait',
  },
  'instagram-feed': {
    id: 'instagram-feed',
    label: 'Instagram Feed 1:1',
    platform: 'instagram',
    renderProfile: 'square',
  },
};

export const deliveriesFor = (spec: VideoSpec, channel: ChannelProfile) =>
  spec.deliveries ?? channel.defaultDeliveries;

export const renderProfilesFor = (spec: VideoSpec, channel: ChannelProfile) =>
  [...new Set(deliveriesFor(spec, channel).map((id) => DELIVERIES[id].renderProfile))] as FormatId[];
