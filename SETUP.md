# Setup — local and cloud

Two ways to run this kit:

- **Local** — author, preview, voice, render, and package entirely on your
  machine. This is the default and covers everything.
- **Cloud** — optionally render on Remotion Lambda for large batches, and
  publish through the YouTube / Instagram APIs. Cloud pieces are additive;
  nothing requires them.

---

## Part 1 — Local

### Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js | **22.18 or newer** | everything (validation and tests use Node's native TypeScript support) |
| npm | ships with Node | dependency install |
| ffmpeg + ffprobe | any recent | voiceover loudness pipeline only |
| Python | 3.10+ on Apple Silicon | local Kokoro TTS only |
| uv (`brew install uv`) | any recent | optional IndicTrans2 translation and My Voice engines |

### Install and verify

```bash
git clone https://github.com/YuvarajTana/video-programetically-edtech.git
cd video-programetically-edtech
npm ci

npm run typecheck   # tsc over the whole project
npm test            # both suites: spec/pipeline (.mjs) and studio/server (.ts)
npm run validate    # every production spec, ~0.3s, no browser
```

These are the same checks CI runs. If they pass, the toolchain works.

### Choose your workflow

**Browser production studio** — point-and-click projects, AI-assisted
scripts, voice routes, rendering, QA, and downloadable packages:

```bash
npm run app:build
npm run app          # UI + API at http://127.0.0.1:4311
npm run app:dev      # hot-reload UI on :4310, API on :4311
```

Studio state lives in SQLite under `.video-kit/` (gitignored). AI script
generation needs `OPENAI_API_KEY` in `.env`; everything else works without it.

**Spec-driven CLI** — videos as typed data files:

```bash
npm run studio                                  # Remotion Studio preview
npm run new -- --channel tech --template concept-explainer my-slug "My title"
npm run validate -- tech/my-slug
npm run render -- tech/my-slug                  # renders to out/tech/my-slug/
npm run produce -- tech/my-slug --silent        # full pipeline without voiceover
```

The first render downloads Remotion's headless Chrome automatically
(one-time). Fonts are pre-baked; no font setup needed.

### Optional local extras

```bash
# Kokoro voiceover (Apple Silicon only)
brew install ffmpeg
python3 -m venv .venv-tts && source .venv-tts/bin/activate
pip install mlx-audio numpy soundfile
npm run voice -- tech/my-slug

# Indian-language translation and local My Voice engines
npm run ai:setup
npm run voice:setup
```

The full local reference — section by section, with troubleshooting — is
[`docs/local-setup.md`](docs/local-setup.md).

---

## Part 2 — Cloud

### Cloud rendering on Remotion Lambda (optional)

Local rendering is the default. Lambda is for larger batches: the same
compositions render remotely and download into the normal `out/` paths, so
packaging is unchanged.

**One-time AWS setup**

1. Create an AWS account and an IAM user for Remotion, following the
   [Remotion Lambda setup guide](https://www.remotion.dev/docs/lambda/setup)
   (it generates the exact IAM policies).
2. Put the credentials in your shell or `.env`:

   ```dotenv
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```

3. Deploy a compatible function once per region:

   ```bash
   npx remotion lambda functions deploy \
     --region ap-south-1 \
     --memory 3009 \
     --disk 2048 \
     --timeout 240
   ```

4. Record the returned function name and configure the adapter (flags
   override env vars):

   ```dotenv
   REMOTION_LAMBDA_REGION=ap-south-1
   REMOTION_LAMBDA_FUNCTION_NAME=remotion-render-...
   # Optional; discovered or created automatically when omitted:
   REMOTION_LAMBDA_BUCKET_NAME=remotionlambda-...
   REMOTION_LAMBDA_SITE_NAME=video-kit
   REMOTION_LAMBDA_CONCURRENCY=10
   # Required for commercial use per Remotion's licensing:
   REMOTION_LICENSE_KEY=...
   ```

**Per-video workflow**

```bash
# Prepare captions/voice assets locally first:
npm run captions -- tech/my-video        # or: npm run voice -- tech/my-video

# Dry run: prints the full remote job plan, uploads nothing:
npm run cloud:render -- tech/my-video

# Execute after reviewing the plan:
npm run cloud:render -- tech/my-video --execute
```

`--execute` deploys the current bundle plus `public/` assets, renders every
unique video profile and cover, downloads the private outputs, and runs the
normal packager. Progress, render IDs, output sizes, and estimated billing
duration land in `out/<channel>/<slug>/cloud.json`; AWS credentials are never
written. Useful flags: `--region`, `--function-name`, `--bucket-name`,
`--site-name`, `--serve-url` (reuse an already-deployed site), and
`--concurrency` (1–200).

Cloud rendering incurs AWS costs and may require a
[Remotion license](https://www.remotion.dev/license) for your usage.

### Publishing to platforms (optional)

Publishing is review-gated: without `--execute` it only prints what would be
uploaded. Credentials go in `.env` (copy `.env.example`); the scripts read
plain environment variables, so run them with Node's env-file support:

```bash
# YouTube: OAuth access token, defaults to a private upload
node --env-file=.env scripts/publish.mjs tech/my-video \
  --delivery youtube-short --privacy private --execute

# Instagram: Reel must be fetchable from a public HTTPS URL
node --env-file=.env scripts/publish.mjs tech/my-video \
  --delivery instagram-reel --video-url https://your-cdn.example/video.mp4 --execute
```

```dotenv
YOUTUBE_ACCESS_TOKEN=...
META_ACCESS_TOKEN=...
INSTAGRAM_ACCOUNT_ID=...
META_GRAPH_VERSION=vNN.N
```

Results are recorded in `out/<channel>/<slug>/publishing.json`; tokens are
never written. An unchanged delivery cannot be published twice without
`--force`.

### Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: dependency
install, typecheck, both test suites, the studio app build, and full spec
validation. No cloud credentials are needed — validation reads the spec
registries directly and never launches a browser, so CI stays fast and
secret-free.
