import type {VideoSpec} from '../../types';
import {agenticRag} from './agentic-rag';
import {cdnToContainer} from './cdn-to-container';
import {llmFundamentals} from './llm-fundamentals';
import {selectionSort} from './selection-sort';
import {vectorSearchMeaning} from './vector-search-meaning';

// video-imports
import {contextVsHarnessEngineering} from './context-vs-harness-engineering';

export const TECH_VIDEOS: VideoSpec[] = [
  agenticRag,
  cdnToContainer,
  llmFundamentals,
  selectionSort,
  vectorSearchMeaning,
  contextVsHarnessEngineering,
  // videos
];
