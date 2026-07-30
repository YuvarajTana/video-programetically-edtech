import type {SceneType} from '../types';
import {Architecture} from './Architecture';
import {ArrayViz} from './ArrayViz';
import {BigStat} from './BigStat';
import {Callout} from './Callout';
import {Code} from './Code';
import {Colors} from './Colors';
import {Compare} from './Compare';
import {Flashcards} from './Flashcards';
import {Flow} from './Flow';
import {Outro} from './Outro';
import {Stats} from './Stats';
import {Steps} from './Steps';
import {Terminal} from './Terminal';
import {Title} from './Title';

/**
 * The single place a scene type is bound to a component. Adding a scene type is
 * three edits: the type in types.ts, the component here, and an entry below.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SCENES: Record<SceneType, React.FC<{scene: any}>> = {
  title: Title,
  steps: Steps,
  code: Code,
  terminal: Terminal,
  architecture: Architecture,
  flow: Flow,
  compare: Compare,
  stats: Stats,
  bigStat: BigStat,
  colors: Colors,
  flashcards: Flashcards,
  callout: Callout,
  arrayViz: ArrayViz,
  outro: Outro,
};
