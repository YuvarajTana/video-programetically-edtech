import {animatedImageProducer} from './animated-image';
import {documentProducer} from './document';
import {stillProducer} from './still';
import {stillSequenceProducer} from './still-sequence';
import {videoProducer} from './video';
import type {ProducerRegistry} from '../types';

/**
 * One producer per output kind. Adding a genuinely new shape of output is a new
 * module here plus one line; adding a new *variant* of an existing shape is
 * data in @video-kit/core and touches nothing in this package.
 */
export const PRODUCERS: ProducerRegistry = {
  video: videoProducer,
  still: stillProducer,
  'still-sequence': stillSequenceProducer,
  'animated-image': animatedImageProducer,
  document: documentProducer,
};
