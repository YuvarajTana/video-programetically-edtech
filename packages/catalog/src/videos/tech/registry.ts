import type {VideoSpec} from '@video-kit/core/spec';
import {agenticRag} from './agentic-rag';
import {cdnToContainer} from './cdn-to-container';
import {llmFundamentals} from './llm-fundamentals';
import {selectionSort} from './selection-sort';
import {vectorSearchMeaning} from './vector-search-meaning';
import {embeddingsMotionExplainer} from './embeddings-motion-explainer';
import {ragIn60Seconds} from './rag-in-60-seconds';
import {ragFundamentals} from './rag-fundamentals';
import {dockerFundamentals} from './docker-fundamentals';
import {pythonListsVsGenerators} from './python-lists-vs-generators';
import {internetDataTrends2015To2025} from './internet-data-trends-2015-2025';

// video-imports
import {pythonBeforeAiEngineering} from './python-before-ai-engineering';
import {pythonFundamentals} from './python-fundamentals';
import {contextVsHarnessEngineering} from './context-vs-harness-engineering';

export const TECH_VIDEOS: VideoSpec[] = [
  agenticRag,
  cdnToContainer,
  llmFundamentals,
  selectionSort,
  vectorSearchMeaning,
  embeddingsMotionExplainer,
  ragIn60Seconds,
  ragFundamentals,
  dockerFundamentals,
  pythonListsVsGenerators,
  internetDataTrends2015To2025,
  contextVsHarnessEngineering,
  pythonFundamentals,
  pythonBeforeAiEngineering,
  // videos
];
