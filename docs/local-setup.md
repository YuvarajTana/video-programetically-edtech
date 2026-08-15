# Local setup

Everything except voiceover generation works on any macOS, Linux, or WSL
machine. Voiceover uses Apple's MLX and therefore needs an Apple Silicon Mac —
every other step degrades gracefully without it.

## 1. Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js | **22.18 or newer** | everything (`validate`/`test` rely on Node's native TypeScript support) |
| npm | ships with Node | dependency install |
| ffmpeg + ffprobe | any recent | voiceover loudness pipeline only |
| Python | 3.10+ on Apple Silicon | local Kokoro TTS only |

Check your Node version first — `node --version` must print `v22.18` or later.
On older Node, `npm run validate` and `npm test` fail with TypeScript syntax
errors because they import the spec registries directly.

## 2. Clone and install

```bash
git clone https://github.com/YuvarajTana/video-programetically-edtech.git
cd video-programetically-edtech

# The latest improvements live on this branch until it is merged:
git checkout claude/project-review-improvements-bb21u4

npm ci
```

## 3. Verify the toolchain (no browser needed)

```bash
npm run typecheck   # tsc over the whole project
npm test            # 50 unit tests (validation, chapters, captions, packaging)
npm run validate    # validates every production spec in ~0.3s
```

All three are the same checks CI runs. If they pass, authoring and validation
work end to end.

## 4. Open Remotion Studio

```bash
npm run studio
```

The first launch downloads Remotion's Chrome Headless Shell automatically
(one-time, needs network). Studio lists every composition:
`<channel>--<slug>--<profile>` plus one `--cover` per delivery. The three
`*--style-guide--*` compositions preview every scene type in each channel's
theme.

Fonts are pre-baked into `src/design/fontFaces.ts`, so no font setup is
needed. Only re-run `npm run fonts` if you swap the faces in `public/fonts/`.

## 5. Render

```bash
npm run render -- tech/selection-sort              # all profiles for one video
npm run render -- tech/selection-sort --profile portrait
npm run render -- tech/selection-sort --still      # covers only
npm run qa -- learn--style-guide--portrait 40 220  # single frames to out/qa/
```

Outputs land in `out/<channel>/<slug>/`. Rendering uses the same
auto-downloaded headless Chrome as Studio; nothing extra to install.

## 6. Author a new video

```bash
npm run new -- --channel learn --template quick-quiz why-is-rain-wet "Why is rain wet?"
npm run validate -- learn/why-is-rain-wet
npm run studio          # iterate on the spec visually
```

Specs are data files in `src/videos/<channel>/`. Learn videos must declare
`audience.ageBand`, `editorial.objective`, and a `safetyStatus` of
`reviewed`/`approved` before validation passes — that gate is intentional.

## 7. Voiceover (optional — Apple Silicon Mac only)

The Kokoro TTS pipeline runs on MLX. One-time setup:

```bash
brew install ffmpeg
python3 -m venv .venv-tts
source .venv-tts/bin/activate
pip install mlx-audio numpy soundfile
```

Then, with the venv active:

```bash
npm run voice -- tech/context-vs-harness-engineering
```

This synthesizes each narration cue, loudness-normalizes to the channel
target, writes word-timing JSON for animated captions, and caches results so
unchanged narration is reused. On non-Mac machines, skip this step: render
silent (`npm run produce -- <ref> --silent`) or mux a separately recorded
track with the ffmpeg command in the README.

## 8. Full production run

```bash
npm run produce -- tech/context-vs-harness-engineering              # everything
npm run produce -- tech/context-vs-harness-engineering --skip-voice # reuse audio
npm run produce -- tech/context-vs-harness-engineering --silent     # no VO
npm run queue -- queues/example.json --dry-run                      # batches
```

`produce` chains typecheck → validate → voice → renders → covers → packaging
and writes a run report to `out/<channel>/<slug>/production.json`.

## 9. Publishing credentials (optional)

```bash
cp .env.example .env   # fill in tokens; .env is gitignored
```

The scripts read plain environment variables (there is no dotenv loader), so
either export them in your shell or use Node's built-in env-file support:

```bash
node --env-file=.env scripts/publish.mjs tech/my-video --delivery youtube-short
```

Without `--execute`, publish is always a dry run that prints exactly what
would be uploaded. The same applies to Lambda cloud rendering
(`npm run cloud:render`) — see the README for the AWS one-time setup.

## Troubleshooting

- **`npm run validate` throws TypeScript syntax errors** → your Node is older
  than 22.18. Upgrade (nvm: `nvm install 22`).
- **Chrome download fails behind a proxy/firewall** → set
  `REMOTION_BROWSER_EXECUTABLE=/path/to/chrome` to use an installed
  Chrome/Chromium, and `REMOTION_CHROME_MODE=chrome-for-testing` if it is a
  full Chrome build rather than the headless shell.
- **`npm run voice` fails immediately** → check `ffmpeg` is on PATH and the
  `.venv-tts` virtualenv is active; on Intel Macs/Linux the MLX model cannot
  load — use `--silent` or `--skip-voice` instead.
