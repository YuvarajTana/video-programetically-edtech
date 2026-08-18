import type {VideoSpec} from '@video-kit/core/spec';
import {funStyleGuide} from './fun';
import {learnStyleGuide} from './learn';
import {styleGuide as techStyleGuide} from './tech';

export const STYLE_GUIDES: VideoSpec[] = [
  techStyleGuide,
  learnStyleGuide,
  funStyleGuide,
];
