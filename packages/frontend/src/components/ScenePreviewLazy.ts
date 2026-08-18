import {lazy} from 'react';

/**
 * The Remotion player and the entire scene kit load on demand — they are the
 * heaviest part of the bundle and only the editor's preview pane needs them.
 */
export const ScenePreview = lazy(() => import('../ScenePreview'));
