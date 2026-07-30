import type {VideoSpec} from '../../types';
import {funStyleGuide} from './fun';
import {learnStyleGuide} from './learn';
import {styleGuide as techStyleGuide} from './tech';

export const STYLE_GUIDES: VideoSpec[] = [
  techStyleGuide,
  learnStyleGuide,
  funStyleGuide,
];
