/**
 * The browser surface. Importing this pulls the font CSS that `FontGate` needs,
 * so it is only safe inside a bundler.
 *
 * Node-side callers (tests, the render engine, the CLI) must use the narrower
 * subpaths instead — `@video-kit/render-kit/scenes`, `/timing`, `/layout` — or
 * reference `/entry` by path without importing it.
 */
export {Video} from './Video';
export {Cover} from './Cover';
export {RemotionRoot} from './Root';
export {calculateManagedMetadata} from './managed';
export {SCENES} from './scenes/registry';
export {useLayout} from './design/formats';
export type {Layout} from './design/formats';
