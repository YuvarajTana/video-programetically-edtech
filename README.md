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
references, narration speed, duration, hook length, and channel-specific
editorial requirements.

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
| `callout` | one memorable sentence |
| `arrayViz` | selection and bubble sort |
| `outro` | recap and channel-driven CTA |

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

Produce and verify every configured delivery in one command:

```bash
npm run produce -- tech/context-vs-harness-engineering
```

This runs type checking, spec validation, local voice generation, every required
video and cover render, packaging, and a final ready-state check. It writes a
machine-readable run report to `out/<channel>/<slug>/production.json`.

Reuse an already generated master with `--skip-voice`, or intentionally create
a silent production with `--silent`.

For a separately recorded voiceover, mux it after rendering:

```bash
ffmpeg -i out/tech/my-video/renders/portrait.mp4 -i vo.mp3 \
  -c:v copy -c:a aac -b:a 192k -shortest \
  out/tech/my-video/renders/portrait.vo.mp4
```

The first implementation still uses scene-level caption cues. Phrase- or
word-level timing and first-class music/SFX mixing are planned next.

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
  qa.mjs
```

The broader roadmap and later audio/media/publishing phases are documented in
[`docs/three-channel-plan.md`](docs/three-channel-plan.md).
