/**
 * The editorial rules now live in `@video-kit/core/editorial`, where the
 * studio and the job pipeline can reach them too — they used to run only here,
 * so a project made in the studio got no editorial check at all.
 *
 * The rules are isomorphic, so they take their filesystem access as an
 * injected probe. This shim supplies the Node one, which is why the CLI's own
 * call sites are unchanged.
 */
import {
  validateSpec as validate,
  validateCollection as validateAll,
} from '@video-kit/core/editorial';
import {nodeAssetProbe} from '@video-kit/core/config';

export {refOf} from '@video-kit/core/editorial';

const options = () => ({assets: nodeAssetProbe()});

export const validateSpec = (spec, channel) => validate(spec, channel, options());

export const validateCollection = (entries) => validateAll(entries, options());
