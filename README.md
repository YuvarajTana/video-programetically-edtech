# Programmatic Video Kit

A typed, multi-channel Remotion system. Write a video as data once, then render
and package it for YouTube and Instagram.

The engine serves three independent content brands:

- **Tech** — visual explanations of technology, AI, and programming.
- **Learn** — quick, age-appropriate lessons for kids and students.
- **Fun** — energetic, short, entertaining, and loop-friendly videos.

Each channel owns its theme, handles, editorial rules, platform defaults, and
CTA. Scene rendering, responsive layout, captions, validation, and packaging
remain shared.

```bash
npm install
npm run studio
npm run validate
npm run render -- tech/selection-sort
```

## Core model

A production video is a typed `VideoSpec`:

```ts
export const example: VideoSpec = {
  channel: 'tech',
  slug: 'how-rag-works',
  title: 'How RAG works',
  template: 'concept-explainer',
  summary: 'Retrieval, context, and generation in one visual walkthrough.',
  deliveries: ['youtube-long', 'instagram-reel'],
  audience: {level: 'beginner'},
  editorial: {
    language: 'en',
    objective: 'Explain how retrieved context changes an LLM response.',
    sources: [{title: 'Source title', url: 'https://example.com'}],
  },
  scenes: [
    {
      type: 'title',
      durationInFrames: 80,
      title: 'How RAG works',
      narration: 'RAG gives a model relevant context before it answers.',
    },
    {
      type: 'flow',
      durationInFrames: 180,
      steps: [
        {label: 'Question'},
        {label: 'Retrieve'},
        {label: 'Generate'},
      ],
      narration: 'A question retrieves matching material and sends it to the model.',
    },
    {
      type: 'outro',
      durationInFrames: 90,
      narration: 'Retrieve first, generate second.',
    },
  ],
};
```

Video files contain data, not custom JSX. If several videos need a visual the
scene kit cannot express, add a reusable scene type.

## Channels and themes

Channel configuration lives in `src/channels/registry.ts`.

| Channel | Default deliveries | Editorial focus |
| --- | --- | --- |
| `tech` | YouTube 16:9 + Instagram Reel | precision, sources, visual mental models |
| `learn` | YouTube Short + Instagram Reel | age band, objective, review status |
| `fun` | YouTube Short + Instagram Reel | speed, surprise, loopability |

Themes live in `src/themes/`. Scenes use semantic accent roles:

- `primary`
- `secondary`
- `success`
- `attention`
- `info`

The same scene therefore uses Tech, Learn, or Fun colors automatically.

The Learn and Fun channel names and handles are placeholders. Update them once
the public accounts are chosen:

```ts
// src/channels/registry.ts
handle: '@LearnChannel'
handle: '@FunChannel'
```

## Deliveries versus render profiles

Publishing destinations are separate from aspect ratios.

| Delivery | Platform | Render profile | Size |
| --- | --- | --- | --- |
| `youtube-long` | YouTube | `landscape` | 1920×1080 |
| `youtube-short` | YouTube | `portrait` | 1080×1920 |
| `instagram-reel` | Instagram | `portrait` | 1080×1920 |
| `instagram-feed` | Instagram | `square` | 1080×1080 |

If a spec requests both a YouTube Short and an Instagram Reel, the portrait
video is rendered once and packaged twice with platform-specific metadata and
covers.

Composition IDs use:

```text
<channel>--<slug>--<render-profile>
<channel>--<slug>--<delivery>--cover
```

Examples:

```text
tech--selection-sort--landscape
learn--style-guide--portrait
tech--selection-sort--instagram-reel--cover
```

## Authoring commands

Create a video:

```bash
npm run new -- --channel tech --template concept-explainer \
  how-jwt-works "How JWT refresh works"

npm run new -- --channel learn --template quick-quiz \
  why-leaves-are-green "Why are leaves green?"

npm run new -- --channel fun --template this-or-that \
  ocean-or-space "Ocean or space?"
```

The scaffold is written to `src/videos/<channel>/` and registered in that
channel's registry.

Validate before rendering:

```bash
npm run validate
npm run validate -- tech/how-jwt-works
npm run validate -- --studio
```

Validation checks structure, delivery IDs, duplicate scenes, diagram
references, narration speed, duration, hook length, quiz timing, audio paths,
and channel-specific editorial requirements. It reads the spec registries
directly through Node's native TypeScript support, so it needs no bundling or
browser and finishes in well under a second (Node 22.18+).

Run the unit tests:

```bash
npm test
```

The suite covers spec validation, chapter generation, caption/SRT output, and
delivery mapping, and re-validates every registered spec. CI
(`.github/workflows/ci.yml`) runs type checking, the tests, and full spec
validation on every push and pull request.

Render:

```bash
npm run render
npm run render -- tech/selection-sort
npm run render -- tech/selection-sort --profile portrait
npm run render -- tech/selection-sort --still
```

`--still` renders dedicated platform covers without rendering MP4 files.
`--format` remains an alias for `--profile` during migration.

Regenerate captions without rendering:

```bash
npm run captions
npm run captions -- tech/selection-sort
```

Rebuild publish packages from existing renders:

```bash
npm run package
npm run package -- tech/selection-sort
```

## Output packages

Outputs are organized by channel and topic:

```text
out/
  tech/
    selection-sort/
      renders/
        landscape.mp4
        portrait.mp4
      youtube-long/
        video.mp4
        cover.png
        captions.srt
        metadata.json
      instagram-reel/
        video.mp4
        cover.png
        captions.srt
        metadata.json
      captions.srt
      voiceover.md
      spec.json
      manifest.json
```

`manifest.json` records the source checksum, sources, deliveries, packaged
files, and whether each delivery is ready, cover-only, or incomplete.

Uploading is intentionally separate from rendering. The package is reviewable
before credentials or platform APIs are introduced.

## Scene types

| Type | Use it for |
| --- | --- |
| `title` | opener and hook |
| `steps` | numbered mental model |
| `flow` | journey, lifecycle, or pipeline |
| `architecture` | system diagrams with animated request traces |
| `code` | annotated source snippets |
| `terminal` | typed command demonstrations |
| `compare` | A versus B |
| `stats` | two to four metric cards |
| `bigStat` | headline number, answer, or formula |
| `chart` | animated column chart for magnitude comparisons |
| `timeline` | ordered events on a spine, revealed in sequence |
| `kineticText` | phrase-by-phrase kinetic typography for hooks and reveals |
| `callout` | one memorable sentence |
| `arrayViz` | selection and bubble sort |
| `quiz` | question, options, thinking pause, answer reveal |
| `outro` | recap and channel-driven CTA |

Chart bars share one hue because they encode magnitude — identity lives in the
label under each bar, and `highlightIndex` spotlights the bar the narration is
about while muting the rest. Kinetic beats hold the screen for `holdFrames`
each (beats without one split the remaining time evenly); validation warns when
a beat is too short to read.

A quiz reveals its answer at `revealAtFrame` (default: 60% through the scene).
Validation warns when the reveal comes without a thinking pause or leaves less
than a second to show the answer. The `quick-quiz` and
`guess-before-the-reveal` templates scaffold a quiz scene automatically.

## Style guides and visual QA

Style guides appear in Studio but are excluded from production batch renders:

```text
tech--style-guide--landscape
learn--style-guide--portrait
fun--style-guide--portrait
```

Render representative frames:

```bash
npm run qa -- learn--style-guide--portrait 40 120 220 340
npm run qa -- fun--style-guide--portrait 30 100 180 260
```

QA stills are written to `out/qa/`.

## Adding a scene

1. Add the typed scene variant in `src/types.ts`.
2. Build the component inside `src/scenes/`.
3. Use `useTheme()` for channel colors and fonts.
4. Use `useLayout()` for aspect-aware layout.
5. Register it in `src/scenes/registry.ts`.
6. Add it to relevant channel style guides.

Structural sizing belongs in `src/design/tokens.ts`; brand color and typography
belong in `src/themes/`.

## Voiceover

Narration drives burned captions, SRT cues, and the voiceover cue sheet.
Channel voice defaults live in `src/channels/registry.ts`. Generate a
scene-aligned Kokoro track locally:

```bash
source .venv-tts/bin/activate
npm run voice -- tech/context-vs-harness-engineering
```

Override the channel preset or speaking speed for one run:

```bash
npm run voice -- learn/ten-colors --voice af_sky --speed 0.95
```

The command regenerates captions, synthesizes each cue independently, performs
measured two-pass loudness normalization, verifies duration and peak levels,
and writes the final track to the `public/` path declared by `spec.audio`.
Normalized tracks are cached by narration, model, voice settings, and generator
version, so unchanged voiceovers are reused. Pass `--force` to synthesize again.
The cache, intermediate clips, and raw masters are ignored by Git.

New video specs also declare a `captionTimings` path. Voice generation writes
per-word timing JSON there from each cue's actual synthesized duration. During
rendering, captions show a short word group and animate the currently spoken
word using frame-derived timing. The packaged file is named
`captions.words.json`; regular SRT captions remain available for platforms.

### YouTube chapters

`captions` and `package` also derive `chapters.txt` from scene boundaries.
The generator starts at `00:00`, keeps every chapter at least 10 seconds long,
and only emits a list when at least three valid chapters exist. You can override
an individual scene title with `chapterTitle`.

YouTube delivery descriptions receive the chapter list automatically; Instagram
metadata does not. This follows YouTube's manual chapter requirements while
keeping the source of truth in the video spec.

Produce and verify every configured delivery in one command:

```bash
npm run produce -- tech/context-vs-harness-engineering
```

This runs type checking, spec validation, local voice generation, every required
video and cover render, packaging, and a final ready-state check. It writes a
machine-readable run report to `out/<channel>/<slug>/production.json`.

Reuse an already generated master with `--skip-voice`, or intentionally create
a silent production with `--silent`.

### Music and sound effects

Declare traceable audio assets in the video spec. Paths are relative to
`public/`, and every asset must include its credit and license:

```ts
soundtrack: {
  music: {
    src: 'audio/music/bright-loop.wav',
    credit: 'Your Studio',
    license: 'original',
    volume: 0.16,
    loop: true,
    fadeInFrames: 15,
    fadeOutFrames: 30,
  },
  effects: [
    {
      src: 'audio/sfx/reveal.wav',
      credit: 'Your Studio',
      license: 'original',
      startFrame: 270,
      volume: 0.7,
    },
  ],
  ducking: {
    gain: 0.3,
    attackFrames: 6,
    releaseFrames: 12,
  },
},
```

Music is automatically ducked while narrated scenes are active. Validation
rejects missing files, unsafe paths, invalid timeline cues, and assets without
credit/license metadata. Packages include the same audio credits in both
`metadata.json` and `manifest.json`.

## Batch production queue

Define an ordered queue in JSON and validate it without starting any work:

```bash
npm run queue -- queues/example.json --dry-run
```

Run the queue locally:

```bash
npm run queue -- queues/example.json
```

Jobs run sequentially to keep memory and Chromium usage predictable. State is
written atomically after every job to `out/queues/<queue-id>/state.json`.
Rerunning the command skips completed jobs whose configuration has not changed.
Use `--restart` to run every job again or `--continue-on-error` to finish the
remaining jobs after a failure.

Each job supports `skipVoice`, `silent`, `force`, and voice overrides:

```json
{
  "id": "tech-episode",
  "ref": "tech/my-video",
  "voice": {"preset": "am_adam", "speed": 0.98}
}
```

## Controlled publishing

Publishing is a separate, review-gated command. Without `--execute`, it only
prints the exact package, metadata, and platform options:

```bash
npm run publish -- tech/context-vs-harness-engineering \
  --delivery youtube-short
```

YouTube uses an OAuth access token from the environment and defaults to
`private`. The uploader creates a resumable session and sends 8 MB chunks:

```bash
export YOUTUBE_ACCESS_TOKEN='...'
npm run publish -- tech/context-vs-harness-engineering \
  --delivery youtube-short \
  --privacy private \
  --execute
```

Instagram must fetch the Reel from a public HTTPS URL; the Graph API cannot read
the local package directly. Set the current Graph version explicitly:

```bash
export META_ACCESS_TOKEN='...'
export INSTAGRAM_ACCOUNT_ID='...'
export META_GRAPH_VERSION='vNN.N'

npm run publish -- tech/context-vs-harness-engineering \
  --delivery instagram-reel \
  --video-url https://your-cdn.example/video.mp4

# After reviewing the dry run:
npm run publish -- tech/context-vs-harness-engineering \
  --delivery instagram-reel \
  --video-url https://your-cdn.example/video.mp4 \
  --execute
```

The Instagram adapter creates a Reel container, polls until processing reports
`FINISHED`, then publishes it. Successful IDs, URLs, timestamps, and failures
are recorded in `out/<channel>/<slug>/publishing.json`; access tokens are never
written. An unchanged delivery cannot be published twice unless `--force` is
provided.

Protocol references:
[YouTube resumable uploads](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
and
[Meta's Instagram API collection](https://www.postman.com/meta/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00).

## Optional cloud rendering

Local rendering remains the default. For larger batches, the same compositions
can render on Remotion Lambda and download into the normal `out/` paths.

One-time AWS setup follows Remotion's Lambda setup guide. After configuring AWS
credentials and policies, deploy a compatible function:

```bash
npx remotion lambda functions deploy \
  --region ap-south-1 \
  --memory 3009 \
  --disk 2048 \
  --timeout 240
```

Record the returned function name, then configure the adapter:

```bash
export REMOTION_LAMBDA_REGION='ap-south-1'
export REMOTION_LAMBDA_FUNCTION_NAME='remotion-render-...'
# Optional; the adapter discovers or creates the Remotion bucket if omitted.
export REMOTION_LAMBDA_BUCKET_NAME='remotionlambda-...'
export REMOTION_LAMBDA_CONCURRENCY='10'
```

Prepare voice and timing assets locally, then review the remote job plan:

```bash
npm run voice -- tech/context-vs-harness-engineering
npm run cloud:render -- tech/context-vs-harness-engineering
```

Submit only after reviewing it:

```bash
npm run cloud:render -- tech/context-vs-harness-engineering --execute
```

The command validates the spec, deploys the current bundle and `public/` assets,
renders each unique video profile plus every cover, downloads private outputs,
and runs the normal packager. Progress, render IDs, output sizes, and estimated
billing duration are recorded in `out/<channel>/<slug>/cloud.json`; AWS
credentials are not. Use `--serve-url` only when intentionally reusing an
already deployed, current site.

See the official
[Remotion Lambda setup](https://www.remotion.dev/docs/lambda/setup) and
[`renderMediaOnLambda()` reference](https://www.remotion.dev/docs/lambda/rendermediaonlambda).
Cloud rendering incurs AWS costs and may require a Remotion license for your
usage.

For a separately recorded voiceover, mux it after rendering:

```bash
ffmpeg -i out/tech/my-video/renders/portrait.mp4 -i vo.mp3 \
  -c:v copy -c:a aac -b:a 192k -shortest \
  out/tech/my-video/renders/portrait.vo.mp4
```

## Project layout

```text
src/
  channels/       channel identity, defaults, editorial policy
  themes/         Tech, Learn, and Fun visual systems
  publishing/     delivery-to-render-profile mapping
  design/         shared size, spacing, layout, and animation tokens
  components/     shared primitives
  scenes/         reusable visual scenes
  videos/
    tech/          production Tech specs
    learn/         production Learn specs
    fun/           production Fun specs
    style-guides/  non-production visual references
  Cover.tsx        dedicated platform cover
  Video.tsx        spec-to-scenes renderer
  Root.tsx         compositions
scripts/
  new-video.mjs
  validate.mjs
  render.mjs
  package.mjs
  captions.mjs
  voice.mjs
  produce.mjs
  queue.mjs
  publish.mjs
  cloud-render.mjs
  qa.mjs
```

The broader roadmap and later audio/media/publishing phases are documented in
[`docs/three-channel-plan.md`](docs/three-channel-plan.md).
