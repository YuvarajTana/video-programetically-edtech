# Three-Channel Video Kit Plan

## Goal

Turn the current single-brand tech explainer kit into one programmatic video
engine that serves three distinct content brands:

1. **Tech** — visual explanations of technology, AI, and programming.
2. **Learn** — fast, age-appropriate learning for kids and students.
3. **Fun** — short, energetic, entertaining and loopable videos.

Each brand publishes to its own YouTube and Instagram channels. The engine,
rendering primitives, responsive layouts, and QA tooling remain shared; brand
identity, content rules, templates, and publishing metadata are separate.

The working channel IDs in this document are `tech`, `learn`, and `fun`.
Public channel names and handles can be chosen later without changing the
architecture.

## Current State

The project already has a good foundation:

- Videos are typed data (`VideoSpec`) rather than one-off React compositions.
- One spec produces landscape and portrait renders.
- Twelve reusable scenes cover most technical explainers.
- Narration drives the burned-in caption, SRT file, and voiceover cue sheet.
- Fonts are local and renders are reproducible.
- Existing videos render at 30 fps and the project currently passes TypeScript
  validation.

The main limitations are structural rather than rendering problems:

- The `VideoSpec`, scaffold command, design tokens, watermark, progress bar,
  and outros assume one `@AIDataDynamics` brand.
- Scene colors are physical names such as `amber` and `teal`, so content is
  coupled to the current visual theme.
- The style guide is registered with production videos and is rendered by the
  default batch command.
- `youtube`, `reel`, and `square` mix aspect ratio with publishing destination.
  A 9:16 asset should be reusable as both a YouTube Short and an Instagram Reel.
- Covers are screenshots from a video frame. The portrait cover can include
  burned captions and does not have platform-specific title-safe areas.
- Audio supports one optional track, but there is no first-class voiceover,
  background music, sound effects, ducking, or loudness policy.
- Captions are one cue per scene, so a long sentence remains visible for the
  entire scene instead of following the spoken words.
- There is no content validation for hook length, reading speed, age band,
  duration, missing narration, claims/sources, or platform metadata.
- Outputs are a flat folder with no channel, platform, publish status, or upload
  manifest.

## Product Model

Separate four concepts that are currently mixed together:

```text
Channel -> Content template -> Video spec -> Delivery target
```

- **Channel** owns brand, audience, voice, defaults, safe areas, CTA, and handles.
- **Content template** owns storytelling rules and recommended scene sequence.
- **Video spec** owns the topic, facts, narration, scenes, sources, and assets.
- **Delivery target** owns platform, aspect ratio, duration limits, captions,
  cover rules, encoding, and publish metadata.

One topic may create several deliverables:

```text
tech/how-vector-search-works
  -> youtube-long   16:9
  -> youtube-short   9:16
  -> instagram-reel  9:16
  -> instagram-feed  1:1 (optional)
```

The two 9:16 targets may reuse the same encoded video initially, while still
receiving different titles, descriptions, hashtags, covers, and upload records.

## Channel Profiles

### Tech

Audience: curious developers, technical professionals, and AI learners.

- Keep the current dark editorial visual language as the starting theme.
- Tone: precise, visual, confident, jargon explained rather than avoided.
- Default short duration: 35–90 seconds.
- Optional long-form duration: 3–8 minutes.
- Required structure: hook, mental model, visual walkthrough, implication,
  recap/CTA.
- Require sources for time-sensitive facts, benchmarks, or statistics.
- Preferred scenes: architecture, flow, code, terminal, compare, chart,
  algorithm, formula, timeline.

Initial templates:

- `concept-explainer`
- `algorithm-visualized`
- `system-design-walkthrough`
- `ai-paper-in-60-seconds`
- `code-before-after`

### Learn

Audience: kids and students. Every video must declare an age band or grade
range, because a single "kids" style is too broad.

- Bright, friendly theme with rounded geometry, large type, simple vocabulary,
  illustrations, and restrained motion.
- Tone: encouraging, concrete, curious, never babyish.
- Default duration: 25–60 seconds.
- Required structure: question/hook, one learning objective, concrete example,
  quick check, memorable recap.
- Limit each scene to one idea and enforce age-based reading-speed thresholds.
- Add a short pause before revealing quiz answers.
- Avoid manipulative CTAs and store a safety/content-review status in the spec.
- Preferred scenes: illustrated concept, flashcard, worked example, number line,
  labeled diagram, timeline/map, quiz, memory recap.

Initial templates:

- `why-does-this-happen`
- `word-or-concept-of-the-day`
- `math-in-one-minute`
- `science-visualized`
- `quick-quiz`

### Fun

Audience: broad social audience looking for quick entertainment.

- High-energy theme with bold sans typography, saturated color, punchier motion,
  and sound-led timing.
- Tone: playful, surprising, concise.
- Default duration: 8–30 seconds.
- Prefer loopable endings that visually or verbally reconnect to the hook.
- Narration is optional; music and sound effects may drive timing.
- Store music/SFX license provenance with every external media asset.
- Preferred scenes: kinetic text, this-or-that, countdown, reveal, meme card,
  emoji/icon burst, randomizer, image/video montage, satisfying loop.

Initial templates:

- `did-you-know`
- `this-or-that`
- `guess-before-the-reveal`
- `mini-challenge`
- `satisfying-loop`

## Target Architecture

```text
src/
  channels/
    types.ts
    registry.ts
    tech.ts
    learn.ts
    fun.ts
  content/
    tech/
    learn/
    fun/
    registry.ts
  templates/
    tech/
    learn/
    fun/
  themes/
    shared.ts
    tech.ts
    learn.ts
    fun.ts
    ThemeProvider.tsx
  scenes/
    shared/
    tech/
    learn/
    fun/
  media/
    Asset.tsx
    audio.ts
    types.ts
  publishing/
    types.ts
    metadata.ts
  validation/
    spec.ts
    editorial.ts
    delivery.ts
  Video.tsx
  Root.tsx
scripts/
  new-video.mjs
  validate.mjs
  render.mjs
  package.mjs
  qa.mjs
out/
  <channel>/
    <slug>/
      youtube-long/
      youtube-short/
      instagram-reel/
      instagram-feed/
      manifest.json
```

Avoid three separate Remotion applications. That would duplicate responsive
layout, rendering, captions, media handling, and QA. A shared engine with
channel profiles provides separation where it matters without tripling
maintenance.

## Data Contract Changes

Replace brand fields directly on `VideoSpec` with a channel reference and
structured editorial/delivery metadata:

```ts
type ChannelId = 'tech' | 'learn' | 'fun';

type VideoSpec = {
  channel: ChannelId;
  slug: string;
  title: string;
  summary: string;
  template: string;
  audience: {
    ageBand?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
  };
  editorial: {
    language: string;
    objective?: string;
    sources?: Source[];
    safetyStatus?: 'draft' | 'reviewed' | 'approved';
  };
  media?: MediaManifest;
  deliveries?: DeliveryId[];
  scenes: Scene[];
};
```

Channel defaults supply the handle, logo, CTA, theme, caption style, preferred
formats, and publishing accounts. A video may override them only through
explicit, typed fields.

Change `Accent` from palette names to semantic roles:

```ts
type AccentRole =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'attention'
  | 'info';
```

Each theme maps those roles to its own colors. This lets the same `compare`,
`steps`, or `stats` scene feel native to all three channels.

## Rendering and Packaging Changes

1. Add channel to composition IDs:
   `<channel>--<slug>--<render-profile>`.
2. Replace format-only registration with render profiles:
   `landscape`, `portrait`, and `square`.
3. Map platform deliveries to render profiles so one portrait render can be
   packaged for YouTube Shorts and Instagram Reels.
4. Move style guides into a non-production registry. Default rendering must
   render published content only.
5. Add a dedicated thumbnail/cover composition rather than taking an arbitrary
   video frame.
6. Write outputs into channel/topic/platform directories.
7. Generate a `manifest.json` containing:
   - source spec and checksum
   - rendered files and dimensions
   - duration and caption paths
   - title, description, hashtags, CTA, and cover
   - channel and target platform
   - sources and media licenses
   - validation result and publish status
8. Keep uploading separate from rendering. First make a deterministic,
   reviewable publish package; add YouTube/Instagram API uploaders only after
   the packages are stable and credentials are intentionally configured.

## Scene and Media Roadmap

Build only the scenes needed by the first production batch.

Shared first:

- `image` / `videoClip` with crop, fit, attribution, and deterministic timing
- `kineticText`
- `quiz` with question, pause, and answer reveal
- `formula` / worked example
- `chart`
- `timeline`
- `iconGrid` / labeled illustration

Then channel-specific:

- Tech: code diff, tree/network, model/pipeline visualization.
- Learn: number line, labeled diagram, map, mascot/guide, memory recap.
- Fun: countdown, randomizer, reaction/reveal, collage, seamless loop.

Add a typed media manifest rather than scattering paths through scene objects:

```ts
type MediaManifest = {
  voiceover?: AudioAsset;
  music?: AudioAsset & {volume: number};
  sfx?: TimedAudioAsset[];
  images?: ImageAsset[];
  clips?: VideoAsset[];
};
```

The audio layer should support voiceover, music ducking, SFX timing, fade
in/out, and a consistent loudness target. Captions should progress from
scene-level cues to phrase- or word-timed cues once voiceover generation or
transcription is introduced.

## Authoring Workflow

The target command should be channel-aware:

```bash
npm run new -- --channel tech --template concept-explainer \
  how-rag-works "How RAG works"

npm run validate -- tech/how-rag-works
npm run studio
npm run render -- tech/how-rag-works
npm run package -- tech/how-rag-works
```

`new-video` should:

- validate the channel and template
- create the spec inside the matching content directory
- apply channel defaults without copying handles into every file
- include required metadata for that channel
- register the spec through a safe generated index or deterministic discovery
- fail on duplicate `<channel>/<slug>`

## Validation and QA

Add validation before expensive rendering.

Structural checks:

- valid channel, slug, scene type, asset path, delivery, and duration
- unique scene IDs and valid diagram references
- no missing narration when a template requires voiceover
- no production spec accidentally marked as a style guide

Editorial checks:

- hook appears within the first 1–2 seconds
- narration fits scene duration at the channel's speaking-rate range
- on-screen text fits reading time and safe areas
- Learn videos declare age band, objective, quiz/check, and review status
- Tech statistics and time-sensitive claims include sources
- Fun external media includes license provenance

Render checks:

- TypeScript validation
- representative stills for every channel × aspect ratio
- visual regression against each channel style guide
- no text or captions in platform UI exclusion zones
- audio stream present when required, with clipping and loudness checks
- output dimensions, fps, duration, and file-size limits
- thumbnail title is legible at small size and contains no burned caption bar

## Phased Implementation

### Phase 1 — Multi-channel foundation

- Add channel profiles and registry.
- Add `channel` to `VideoSpec`.
- Introduce theme context and semantic accents.
- Migrate the two existing production videos to `content/tech`.
- Make watermark, CTA, captions, and progress treatment channel-driven.
- Separate production and style-guide registries.
- Update `new-video` and composition IDs.
- Keep existing output filenames available temporarily as a compatibility path.

Exit criteria: both existing videos render unchanged under the Tech profile,
while empty Learn and Fun style guides render with visibly different themes.

### Phase 2 — Delivery and publishing packages

- Separate render profiles from platform targets.
- Add dedicated cover compositions and platform safe zones.
- Organize outputs by channel/topic/platform.
- Generate platform metadata and `manifest.json`.
- Add spec and editorial validation.

Exit criteria: one topic produces a reviewable YouTube and Instagram package
with correct channel identity, video, cover, captions, metadata, and sources.

### Phase 3 — Learn production capability

- Add Learn templates and the quiz, worked-example, labeled-diagram, and
  flashcard/recap scenes.
- Add age band, reading-speed, learning-objective, and review validation.
- Produce three pilot videos for different age bands.

Exit criteria: the Learn channel can produce a coherent batch without using
Tech-only components or manual JSX.

### Phase 4 — Fun production capability

- Add music/SFX mixing and media licensing metadata.
- Add kinetic-text, countdown/reveal, collage, and seamless-loop scenes.
- Produce three pilot formats: challenge, surprising fact, and loop.

Exit criteria: Fun videos are recognizably distinct, sound-led, and loop cleanly
in both platform packages.

### Phase 5 — Production automation

- Add batch queues, content statuses, and deterministic build manifests.
- Add CI for validation, representative stills, and approved renders.
- Add upload adapters only after manual package review is reliable.
- Record platform video IDs, URLs, publish timestamps, and upload errors without
  placing credentials in specs or output manifests.

Exit criteria: approved specs can be rendered and packaged in batches, with a
clear audit trail and optional controlled publishing.

## Recommended First Implementation Slice

Do Phase 1 plus the smallest useful part of Phase 2:

1. Channel registry and profiles.
2. Theme provider with semantic accents.
3. Migrate current content to `tech`.
4. Separate style guides from publishable videos.
5. Channel-aware scaffold and render commands.
6. Dedicated covers and organized output folders.
7. A minimal validation command.

Do not start with automatic publishing or a large scene library. First prove
that one engine can render one representative video for each channel with the
correct identity and package structure. Those three pilot specs will expose
which new scenes are genuinely reusable.

## Decisions Needed Before Phase 1 Is Finished

- Public names and handles for the Learn and Fun channels.
- Primary age bands for Learn (for example 6–8, 9–12, and 13–16).
- Whether YouTube means Shorts only, long-form only, or both for each channel.
- Default narration language and whether more languages are planned.
- Whether voiceover will be recorded, generated, or both.
- Whether Fun videos may use licensed stock/media, generated media, or only
  original graphic elements.

These choices belong in channel configuration, not scattered through video
specs, so implementation can begin with placeholders and update them later.
