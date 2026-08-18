# Extending the kit

Three things get added often: a new **output variant**, a new **aspect ratio**,
and a new **scene type**. Each has one place to start.

## The packages

```
packages/
  core/           types, zod contracts, aspects, output variants, config
  catalog/        the source-controlled video specs
  render-kit/     Remotion compositions, scenes, themes, layout
  render-engine/  bundling and the producers that turn variants into files
  datasource/     repository port, SQLite adapter, service, migrations
  backend/        the API and the job runner
  frontend/       the studio app
  cli/            command-line production
```

`core` is the dependency leaf and imports no other package. Its default entry
is isomorphic — the studio bundles it — so anything that touches `node:` lives
behind a subpath such as `@video-kit/core/config`. `npm run deps:check`
enforces both rules; CI runs it.

## Add an output variant

An **output variant** is one artifact: a video, a still, a sequence of stills,
an animated image, or a document assembled from another variant. Everything
about it is data.

Add an entry to `OUTPUT_VARIANTS` in
`packages/core/src/output/variants.ts`:

```ts
'youtube-thumbnail': {
  id: 'youtube-thumbnail',
  label: 'YouTube thumbnail',
  kind: 'still',
  aspect: 'landscape',
  platform: 'youtube',
  composition: 'cover',
  frames: {at: 'frame', frame: 0},
  encoding: {format: 'jpeg', quality: 92},
  artifact: {
    kind: 'poster',
    filenameStem: 'youtube-thumbnail',
    mimeType: 'image/jpeg',
  },
},
```

That is the whole change. The CLI, the API job runner, the package manifest and
the studio picker all iterate the registry, so none of them needs editing.

Render it without touching any spec:

```bash
npm run render -- tech/selection-sort --variant youtube-thumbnail
```

To make a variant part of a video's normal output, either name it in the spec's
`outputs`, or map it from a delivery in `LEGACY_DELIVERY_VARIANTS` if it should
ship whenever that platform package is requested.

**Fields worth knowing:**

- `composition` picks which composition renders the frames: `'video'` for the
  timeline, `'cover'` for the designed cover art.
- `frames` selects what to capture — a fixed frame, a time, a fraction of the
  whole video, one frame per scene, or a range for animation. Fractions survive
  narration retiming; frame numbers do not.
- `overlays` suppresses captions, chrome, the progress rail, or audio. This is
  how one composition serves a captioned reel and a clean poster.
- `caption` is the wording the cover composition prints. Set it when the
  rendered text must not drift.
- `artifact.filenameStem` is the output filename. Keep it stable: artifact rows
  and existing output trees are keyed on it.

### If the variant is a genuinely new *kind* of artifact

Only then does code change. Add a producer in
`packages/render-engine/src/producers/`, implementing `Producer`:

```ts
export const myProducer: Producer = async ({serveUrl, spec, channel, variant, outDir, browser}) => {
  const {composition, inputProps} = await selectFor({serveUrl, spec, channel, variant, browser});
  // ... write files, then describe them
  return [describeArtifact({variant, path: output, width: composition.width, height: composition.height})];
};
```

Register it in `packages/render-engine/src/producers/index.ts` and add the kind
to `OutputKind` in `packages/core/src/output/types.ts`. `PRODUCERS` is typed as
a total map, so the compiler will tell you what is missing.

## Add an aspect ratio

Add it to `ASPECTS` in `packages/core/src/output/aspects.ts`:

```ts
story: {id: 'story', label: 'Story 2:3', width: 1080, height: 1620},
```

Compositions are registered from `ASPECT_IDS`, so `video--story` and
`cover--story` appear automatically, and `useLayout()` reports the new aspect to
every scene. Give it a ratio label in `packages/frontend/src/outputs.ts` so the
studio's preview toolbar names it.

Scene components read `layout.isLandscape`, `layout.stack` and `layout.columns`
rather than the aspect id, so most need no change — but check the ones with
bespoke sizing if the new ratio is far from an existing one.

## Add a scene type

This one still spans several files; see *Known rough edges* below.

1. Add the typed variant in `packages/core/src/spec/index.ts` and add it to the
   `Scene` union.
2. Add it to `SceneTypeSchema` (and any rules) in
   `packages/core/src/contracts.ts`.
3. Add validation in `packages/cli/src/validation-lib.mjs`.
4. Build the component in `packages/render-kit/src/scenes/`, using `useTheme()`
   for colour and `useLayout()` for aspect-aware layout.
5. Register it in `packages/render-kit/src/scenes/registry.ts`.
6. Add it to the channel style guides in `packages/catalog/src/videos/style-guides/`.

Structural sizing belongs in `packages/core/src/design/tokens.ts`; brand colour
and typography belong in `packages/core/src/themes/`.

## Add a video

```bash
npm run new -- --channel tech "My video title"
```

The scaffold writes `packages/catalog/src/videos/<channel>/<slug>.ts` and
registers it. Then:

```bash
npm run validate -- tech/my-video
npm run render -- tech/my-video
```

## Running the pieces

```bash
npm run app                 # API, serving the built studio
npm run app:dev             # API + studio with hot reload
npm run app:dev:all         # datasource + API + studio, three processes
npm run datasource          # the store on its own, port 4312
npm run db:migrate          # apply migrations deliberately
```

By default the API runs SQLite in its own process. Set
`VIDEO_KIT_DATASOURCE=http://127.0.0.1:4312` to point it at the datasource
service instead; nothing else changes, because both sides implement the same
`Repository` port and a contract test runs the same assertions against each.

## Known rough edges

- **Scene types are described in three places** — the TypeScript union, the zod
  schema, and the imperative validator. They answer different questions
  (is it well-formed / is it parseable / is it editorially sound), but the
  duplication is real and deriving the first two from per-scene schemas is the
  obvious next step.
- **`FormatId` still exists** as an alias of `AspectId` in
  `packages/core/src/design/formats.ts`, because `renderProfile` is threaded
  through the studio, the job pipeline and the composition props. It is one
  table now, not two, so this is naming debt rather than drift.
- **Blob storage assumes a shared filesystem.** The datasource service can run
  on its own port, but job artifacts are written by the backend and recorded by
  the datasource, so both must see the same `.video-kit/`. A remote blob store
  is the next step if the two ever need to run on different machines.
