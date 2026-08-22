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

A scene type is a zod schema plus a component. The TypeScript type, the
validation the studio applies, and the type the renderer sees are all derived
from the schema, so there is one declaration.

1. Write the schema in `packages/core/src/spec/scenes/` — pick the module that
   fits (`text`, `technical`, `data`, `learning`, `media`), or add one:

   ```ts
   export const StepChartSceneSchema = sceneSchema('stepChart', {
     kicker: z.string().max(120).optional(),
     title: z.string().max(300).optional(),
     points: z.array(accented({label: z.string().min(1), value: z.number()}))
       .min(2)
       .max(20),
   });
   ```

   `sceneSchema` adds the fields every scene carries (`id`, `durationInFrames`,
   `narration`, `chapterTitle`, `accent`, `railStage`) and makes the result
   strict, so a typo is rejected rather than persisted.

2. Register it in `packages/core/src/spec/scenes/index.ts` — add it to
   `SCENE_SCHEMAS` and to the `SceneUnion` list.

3. Build the component in `packages/render-kit/src/scenes/`, using `useTheme()`
   for colour and `useLayout()` for aspect-aware layout. Its props type comes
   from the schema:

   ```ts
   import type {StepChartScene} from '@video-kit/core/spec';
   export const StepChart: React.FC<{scene: StepChartScene}> = ({scene}) => …
   ```

4. Register the component in `packages/render-kit/src/scenes/registry.ts`.

Forgetting step 4 fails the build, not the render: `SCENES` is typed as an
exhaustive `Record<SceneType, …>`, so `tsc` names the missing component, and a
test asserts the two registries hold the same set.

Two optional extras: add editorial rules (pacing, wording) in
`packages/cli/src/validation-lib.mjs`, which answers a different question from
the schema — "is this well-formed" versus "is this good" — and add the scene to
the channel style guides in `packages/catalog/src/videos/style-guides/` so it
shows up in visual QA.

### Cross-field rules

Anything that depends on more than one field — an index pointing into a list, a
reference to another element's id — cannot be expressed structurally. Add it to
the `superRefine` on `SceneSchema` in `scenes/index.ts`, where the quiz answer
check and the motion-canvas element/action/anchor checks already live. Members
of the union stay plain objects so the discriminator can narrow on `type` and
report a useful error instead of "no variant matched".

### Changing an existing scene type

Tightening a schema can invalidate specs already in someone's database, which
is re-parsed on every read. Before shipping:

```bash
npm run db:check-specs    # which stored specs would fail to load, and why
npm run db:repair-specs   # drop stale fields; report what needs editing
npm run db:repair-specs -- --apply
```

`db:migrate` runs the check automatically and warns, so an upgrade tells you
before the studio does. Repair only drops fields the schema no longer
recognises — missing content is reported, never invented, because a spec filled
with placeholders would still fail while looking fixed.

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

- **Editorial rules still live apart from the schemas.**
  `packages/cli/src/validation-lib.mjs` checks pacing and wording for
  source-controlled specs, which is a different question from "is this
  well-formed", but it covers only fourteen scene types and does not run on
  studio projects at all.
- **`FormatId` still exists** as an alias of `AspectId` in
  `packages/core/src/design/formats.ts`, because `renderProfile` is threaded
  through the studio, the job pipeline and the composition props. It is one
  table now, not two, so this is naming debt rather than drift.
- **`StudioRepository` is one 1,800-line class.** `catalog` and `artifacts` are
  extracted into `packages/datasource/src/sqlite/domains/`, and the rest stays
  put deliberately: seven of the eighteen `database.transaction(...)` sites
  straddle projects/variants/translations, so those 900 lines cannot be
  separated without unpicking the transactions. Extracting the remainder was
  measured at +16% total code for no boundary change, because `Repository` is
  `MaybeAsync<StudioRepository>` dispatched over the wire by flat method name —
  any split can only ever be delegation behind the same 62 flat methods.
- **Blob storage assumes a shared filesystem.** The datasource service can run
  on its own port, but job artifacts are written by the backend and recorded by
  the datasource, so both must see the same `.video-kit/`. A remote blob store
  is the next step if the two ever need to run on different machines.
