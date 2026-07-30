import type {FormatId} from '../design/formats';

export type DeliveryId =
  | 'youtube-long'
  | 'youtube-short'
  | 'instagram-reel'
  | 'instagram-feed';

export type PlatformId = 'youtube' | 'instagram';

export type DeliveryTarget = {
  id: DeliveryId;
  label: string;
  platform: PlatformId;
  renderProfile: FormatId;
};
