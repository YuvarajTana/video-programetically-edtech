/**
 * Load video specs from the catalog package.
 *
 * This used to install a node:module resolve hook to add extensions to the
 * project's relative imports, because the specs were reached by file path. They
 * are a package now, so the hook is gone.
 */
export const loadSpecs = async ({includeStyleGuides = false} = {}) => {
  const [videos, channels] = await Promise.all([
    import('@video-kit/catalog'),
    import('@video-kit/core/channels'),
  ]);
  const specs = includeStyleGuides ? videos.STUDIO_VIDEOS : videos.VIDEOS;
  return specs.map((spec) => ({spec, channel: channels.getChannel(spec.channel)}));
};
