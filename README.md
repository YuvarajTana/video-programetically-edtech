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

## Local Video Production Studio

The browser studio lets you create, preview, voice, render, and download videos
without editing TypeScript. Projects, templates, themes, categories, immutable
revisions, job history, and artifact metadata are stored locally in SQLite.

```bash
npm install
npm run app:build
npm run app
```

Open [http://127.0.0.1:4311](http://127.0.0.1:4311). The production server
serves both the interface and API. For interface development with hot reload,
use:

```bash
npm run app:dev
```

By default, the development interface runs at `http://127.0.0.1:4310` and
proxies API calls to the local server on port `4311`. Both ports can be changed
in `.env` with `VIDEO_KIT_WEB_PORT` and `VIDEO_KIT_PORT`; Vite reads the same
file as the backend, so the proxy stays aligned.

### AI-assisted script generation

Script generation is a runtime backend integration with the OpenAI Responses
API. The browser never receives the API key. Create a local environment file,
add an API key, and restart the Studio:

```bash
cp .env.example .env
```

```dotenv
OPENAI_API_KEY=your_api_key_here
OPENAI_SCRIPT_MODEL=gpt-5.6-sol
```

```bash
npm run app:dev
```

Open **New video**, choose a 60-second Reel or a 5, 10, 15, 20, 25, or
30-minute long-form video, and then
choose **Generate with AI** or **Paste my script**. AI drafts use structured
scene output plus the committed teaching context in
`content/script-generation/context.json`. The context defines the Python-to-AI
curriculum, runtime-first teaching style, pacing, examples, and visual grammar.
Drafts remain fully editable and cannot be submitted to production until the
manual-review checkbox is selected. Under **Choose the audio**, select either:

- **Voiceover** — Kokoro, an approved My Voice profile, or finished uploaded narration.
- **Music only · visual explanation** — no TTS or spoken captions; the approved
  ideas are communicated by titles, diagrams, labels, code, and animation.

Music-only AI drafts use shorter planning copy and require every scene to work
without speech. The three bundled original tracks are **Quiet Circuit** (calm),
**Momentum Grid** (technical and energetic), and **Playful Orbit** (kids and
fun). Each can be previewed before selection, loops automatically when needed,
and carries its license credit into the production manifest.

The final CTA creates an immutable project revision, resolves the selected
audio route, and queues rendering, QA, and packaging.

OpenAI API billing is separate from ChatGPT subscriptions. Do not commit `.env`
or place an API key in frontend code.

Studio data lives under `.video-kit/`; generated render inputs live under
`public/generated/`. Both are intentionally ignored by Git. Existing videos in
`packages/catalog/src/videos/` appear in the studio as read-only examples and can be cloned into
editable projects without changing their source files.

Every Studio and CLI production now follows one canonical path:

```text
TOPIC → SCRIPT → SCENE BREAKDOWN → TTS → WORD/SENTENCE TIMESTAMPS
      → MASTER TIMELINE → VISUALS + MOTION + CAPTIONS
      → AUDIO + SFX → FINAL RENDER → QA
```

Topic, approved script, and scene breakdown are pre-production gates. The job
then freezes word/sentence timing and motion anchors into
`master-timeline.json`. Remotion renders visuals, diagrams, code, animation,
captions, music, and sound effects against that single frame clock. Music-only
jobs use the same path while marking TTS and spoken timestamps as intentionally
skipped.

English voice generation can use the existing `.venv-tts` Kokoro setup or an
explicitly approved local **My Voice** profile. Music-only rendering is
available directly from the New video workflow. Successful jobs include
delivery-specific MP4s and covers, the approved script, scene breakdown,
captions, optional audio and word timings, the master timeline, a manifest,
checksums, and a downloadable ZIP package.

### Indian languages and My Voice

The studio supports English, Hindi, Tamil, Telugu, Kannada, Malayalam, and
Bengali. Any variant can become the master. Translations are field-level
drafts, preserve glossary terms, expose the English pivot for Indic-to-Indic
translation, and require approval before production.

Install the separate Python 3.11 environment for local IndicTrans2 translation:

```bash
brew install uv ffmpeg
npm run ai:setup
```

Install the local English **My Voice** engine separately:

```bash
npm run voice:setup
```

Models download into `.video-kit/models/` on first use. Open **Voice & audio**
to attest ownership and adulthood, record the consent phrase, provide a clean
6–15 second English reference, generate a preview, listen to it, and accept it.
Only then does **My Voice** appear in the New video voice chooser. It synthesizes
the approved scene narration; it never copies the reference recording into a
finished video and never silently falls back to Kokoro.

The Chatterbox route currently supports English. Indian-language voice cloning
is withheld from the production chooser until its reference validation and
pronunciation quality meet the same standard; complete uploaded narration is
still supported for those locales.

Recordings are normalized to private mono 24 kHz WAV files beneath
`.video-kit/voices/`. They are not public assets or package contents. Revocation
blocks new narration and invalidates intermediate cache data.

Cloud voice cloning is not enabled in the current production chooser.

## CLI quick start

Everything the browser studio does is also scriptable. The spec-driven CLI
workflow needs only:

```bash
npm install
npm run studio      # Remotion Studio (composition preview)
npm run validate
npm run render -- tech/selection-sort
```

Requires Node 22.18+. [`SETUP.md`](SETUP.md) covers both local setup and the
optional cloud pieces (Lambda rendering, platform publishing);
[`docs/local-setup.md`](docs/local-setup.md) is the detailed local reference.

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

### Photos and PNG graphics

In the browser editor, open a scene and choose **Add photo to this scene** in
the inspector. PNG, JPEG, and WebP files up to 15 MB are copied into the local,
gitignored `public/generated/project-assets/` store. A regular scene is safely
converted to a motion canvas when its first photo is added. Each photo can use
cover or contain fitting plus a finite slow zoom or pan, and the same result is
shown in the live preview and final render.

Source-authored motion canvases can use the same element directly:

```ts
{
  id: 'retrieval-photo',
  kind: 'image',
  src: 'images/rag/retrieval.png',
  alt: 'Documents flowing into a retrieval system',
  x: 50,
  y: 57,
  width: 82,
  height: 58,
  fit: 'cover',
  motion: 'ken-burns-in',
  focalX: 50,
  focalY: 45,
}
```

Tracked assets belong beneath `public/images/`; Studio uploads belong beneath
`public/generated/`. Absolute paths, traversal paths, SVG, and MIME-spoofed
uploads are rejected.

## Channels and themes

Channel configuration lives in `packages/core/src/channels/registry.ts`.

| Channel | Default deliveries | Editorial focus |
| --- | --- | --- |
| `tech` | YouTube 16:9 + Instagram Reel | precision, sources, visual mental models |
| `learn` | YouTube Short + Instagram Reel | age band, objective, review status |
| `fun` | YouTube Short + Instagram Reel | speed, surprise, loopability |

Themes live in `packages/core/src/themes/`. Scenes use semantic accent roles:

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
| `instagram-carousel` | Instagram | `carousel` (stills) | 1080×1350 |

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

### Python to AI Engineer series

The committed curriculum in `content/ai-engineer-roadmap.json` is the source of
truth for the learning order. It currently covers Python fundamentals,
advanced Python, FastAPI, MySQL, LLM fundamentals, RAG, agents, Agentic RAG,
agent orchestration, small language models, fine-tuning, Edge AI, Physical AI,
and a production capstone.

List the complete path, inspect one topic, or find the next lesson:

```bash
npm run roadmap
npm run roadmap -- show python.async-await
npm run roadmap -- next python.async-await
```

Scaffold a roadmap topic using its recommended video preset:

```bash
npm run topic:new -- --topic python.decorators
npm run topic:new -- --topic python.async-await
npm run topic:new -- --topic agents.agentic-rag --preset youtube-deep-dive
```

Use `--dry-run` to inspect the selected paths, runtime, deliveries, and preset
without writing files:

```bash
npm run topic:new -- --topic python.async-await --dry-run
```

Each scaffold creates two tracked files:

```text
content/scripts/tech/<slug>.md  # timed writing and production brief
packages/catalog/src/videos/tech/<slug>.ts       # render-ready VideoSpec scene structure
```

The source spec is registered automatically. Replace every `TODO:` marker,
verify the code examples, and add primary documentation sources before voice
generation.

| Preset | Runtime | Best for | Default outputs |
| --- | ---: | --- | --- |
| `reel-concept` | 59s | mental models and flows | YouTube Short + Instagram Reel |
| `reel-code` | 59s | async/await, decorators, syntax and runtime behavior | YouTube Short + Instagram Reel |
| `reel-compare` | 59s | two commonly confused engineering choices | YouTube Short + Instagram Reel |
| `youtube-deep-dive` | 5m | architecture, implementation and production tradeoffs | YouTube 16:9 + Instagram Reel |

The content-authoring path feeds the same master production pipeline:

```text
roadmap → scaffold → write/verify → topic → script → scene breakdown
        → TTS → timestamps → master timeline → render tracks → QA
```

```bash
npm run validate -- tech/python-async-await
npm run voice -- tech/python-async-await
npm run render -- tech/python-async-await
npm run qa -- tech--python-async-await--portrait 45 300 900 1500
npm run package -- tech/python-async-await
```

The same four presets are seeded into the browser studio template library as
`tech-reel-concept`, `tech-reel-code`, `tech-reel-compare`, and
`tech-youtube-deep-dive`.

### Ad-hoc videos

Create a video:

```bash
npm run new -- --channel tech --template concept-explainer \
  how-jwt-works "How JWT refresh works"

npm run new -- --channel learn --template quick-quiz \
  why-leaves-are-green "Why are leaves green?"

npm run new -- --channel fun --template this-or-that \
  ocean-or-space "Ocean or space?"
```

The scaffold is written to `packages/catalog/src/videos/<channel>/` and registered in that
channel's registry.

Validate before rendering:

```bash
npm run validate
npm run validate -- tech/how-jwt-works
npm run validate -- --studio
```

Validation checks structure, delivery IDs, duplicate scenes, diagram
references, narration pace (a channel WPM band, not just a ceiling), duration,
hook length and hook-vs-topic naming, accent rotation, static text-led scenes,
quiz timing, audio paths, and channel-specific editorial requirements. The
editorial rules themselves are documented in
[`docs/authoring.md`](docs/authoring.md), and
[`docs/llm-authoring-prompt.md`](docs/llm-authoring-prompt.md) is a paste-ready
prompt for drafting a spec with a model. It reads the spec registries
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

### Carousels, cover QA, and music beds

A spec that declares the `instagram-carousel` delivery ships as stills — one
1080×1350 slide per scene, captured at 80% through the scene, plus a PDF for
LinkedIn document posts (validation warns past Instagram's 10-slide cap):

```bash
npm run render -- tech/my-video --variant instagram-carousel-pdf
```

Rendered covers can be audited against the Instagram grid crop — content must
keep ≥140px side margins and, on portrait covers, stay inside the centered
800×1100 safe box:

```bash
npm run cover:check -- tech/my-video
```

Copyright-free music beds are synthesized in-repo (numpy required), RMS-
normalized to −22 dBFS with 1.2s fades, and declared in specs with
`license: 'original'`:

```bash
npm run music -- calm-plucks 60
npm run music     # lists the presets
```

The baked font set includes Noto fallback faces for ₹, ✓, ✕, and → — glyphs
the latin brand subsets lack — and a test fails CI if coverage regresses.

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
| `countdown` | 3… 2… 1… with a payoff reveal |
| `numberLine` | ticks, marked values, and an animated hop for arithmetic |
| `labeledDiagram` | emoji illustration with connected callout labels |
| `image` | full-bleed licensed still with optional push-in |
| `videoClip` | full-bleed licensed footage, muted by default |

Media scenes follow the same traceability rules as audio: every `image` and
`videoClip` asset lives under `public/`, must declare `credit` and `license`,
is attributed on frame automatically (`hideCredit` opts out of the overlay,
never the metadata), and is listed under "Media credits" in packaged
`metadata.json` and `manifest.json`. Sample assets for the style guides live
in `public/media/samples/`.
| `callout` | one memorable sentence |
| `arrayViz` | selection and bubble sort |
| `algorithm` | synced array + status + code, one step clock |
| `tokens` | chips flipping text → id |
| `meter` | one quantity filling toward a visible limit |
| `quiz` | question, options, thinking pause, answer reveal |
| `outro` | recap and channel-driven CTA |

A spec may declare a `rail` — a persistent stage pipeline rendered above every
scene. Scenes advance it with `railStage` (omitted scenes carry the previous
stage forward), turning a sequence of cuts into one visible journey.

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

1. Add the typed scene variant in `packages/core/src/spec/index.ts` and add it
   to the `Scene` union.
2. Add it to `SceneTypeSchema` in `packages/core/src/contracts.ts`.
3. Add validation rules in `packages/cli/src/validation-lib.mjs`.
4. Build the component inside `packages/render-kit/src/scenes/`, using
   `useTheme()` for channel colors and `useLayout()` for aspect-aware layout.
5. Register it in `packages/render-kit/src/scenes/registry.ts`.
6. Add it to the relevant channel style guides in `packages/catalog/`.

Structural sizing belongs in `packages/core/src/design/tokens.ts`; brand color and typography
belong in `packages/core/src/themes/`.

## Voiceover

Narration drives burned captions, SRT cues, and the voiceover cue sheet.
Channel voice defaults live in `packages/core/src/channels/registry.ts`. Generate a
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

The kit is an npm workspaces monorepo. Each package installs, type-checks and
runs on its own, and `npm run deps:check` enforces the boundaries between them.

```text
packages/
  core/           domain types, zod contracts, aspects, output variants, config
                  the dependency leaf; imports no other package
  catalog/        the source-controlled video specs (tech, learn, fun)
  render-kit/     Remotion compositions, scenes, themes, layout
  render-engine/  bundling, and the producers that turn variants into files
  datasource/     repository port, SQLite adapter, migrations, HTTP service
  backend/        the Studio API and the production job runner
  frontend/       the Studio browser app
  cli/            command-line production, plus the Python voice workers
public/           shared asset root: Remotion staticFile(), Vite, and the API
content/          curriculum roadmap and the LLM script-generation context
docs/             operating.md, extending.md, authoring guides, design notes
tests/            one suite across all packages
```

Three processes can run separately or together:

```bash
npm run app          # API on 4311, serving the built studio
npm run app:dev      # API + studio with hot reload
npm run app:dev:all  # datasource on 4312 + API + studio
npm run datasource   # the store alone
```

The API keeps SQLite in its own process by default. Point it at the datasource
service with `VIDEO_KIT_DATASOURCE=http://127.0.0.1:4312`; both sides implement
the same repository port, and a contract test runs the same assertions against
each.

### Adding outputs

Producing a poster, a carousel, a GIF or a PDF is one entry in the output
variant registry (`packages/core/src/output/variants.ts`) — the CLI, the API,
the manifest and the studio picker all read it. Render any registered variant
without editing a spec:

```bash
npm run render -- tech/selection-sort --variant loop-gif
npm run render -- tech/selection-sort --variant instagram-carousel-pdf
```

See [`docs/extending.md`](docs/extending.md) for the full recipes: a new output
variant, a new aspect ratio, and a new scene type.

[`docs/operating.md`](docs/operating.md) is the runbook — how the three
processes fit together, the fourteen job stages, where each model runs, the API
and database, and a symptom-to-fix table for when something breaks.

The broader roadmap and later audio/media/publishing phases are documented in
[`docs/three-channel-plan.md`](docs/three-channel-plan.md).
