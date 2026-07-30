import type {VideoSpec} from '../types';
import {cdnToContainer} from './cdn-to-container';
import {selectionSort} from './selection-sort';
import {styleGuide} from './style-guide';

/** Add a new video here and it appears in Studio and in the render script. */
export const VIDEOS: VideoSpec[] = [cdnToContainer, selectionSort, styleGuide];

export const bySlug = (slug: string) => VIDEOS.find((v) => v.slug === slug);
