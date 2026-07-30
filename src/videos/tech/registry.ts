import type {VideoSpec} from '../../types';
import {cdnToContainer} from './cdn-to-container';
import {selectionSort} from './selection-sort';

// video-imports

export const TECH_VIDEOS: VideoSpec[] = [
  cdnToContainer,
  selectionSort,
  // videos
];
