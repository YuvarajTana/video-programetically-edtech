import type {SceneType} from '../types';
import {Architecture} from './Architecture';
import {ArrayViz} from './ArrayViz';
import {BigStat} from './BigStat';
import {Callout} from './Callout';
import {Chart} from './Chart';
import {Clip} from './Clip';
import {Code} from './Code';
import {Colors} from './Colors';
import {Compare} from './Compare';
import {Countdown} from './Countdown';
import {Counting} from './Counting';
import {Flashcards} from './Flashcards';
import {Flow} from './Flow';
import {KineticText} from './KineticText';
import {LabeledDiagram} from './LabeledDiagram';
import {NumberLine} from './NumberLine';
import {Outro} from './Outro';
import {Photo} from './Photo';
import {Quiz} from './Quiz';
import {Stats} from './Stats';
import {Steps} from './Steps';
import {Terminal} from './Terminal';
import {Timeline} from './Timeline';
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
  chart: Chart,
  timeline: Timeline,
  kineticText: KineticText,
  countdown: Countdown,
  numberLine: NumberLine,
  labeledDiagram: LabeledDiagram,
  image: Photo,
  videoClip: Clip,
  counting: Counting,
  colors: Colors,
  flashcards: Flashcards,
  quiz: Quiz,
  callout: Callout,
  arrayViz: ArrayViz,
  outro: Outro,
};
