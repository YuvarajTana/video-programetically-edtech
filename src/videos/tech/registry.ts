import type {VideoSpec} from '../../types';
import {cdnToContainer} from './cdn-to-container';
import {selectionSort} from './selection-sort';
import {vectorSearchMeaning} from './vector-search-meaning';

// video-imports

export const TECH_VIDEOS: VideoSpec[] = [
  cdnToContainer,
  selectionSort,
  vectorSearchMeaning,
  // videos
];
