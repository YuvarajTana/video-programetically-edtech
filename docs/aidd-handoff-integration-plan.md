# AIDD Handoff Integration Plan

Source documents: `HANDOFF-SPEC.md`, `INDEX.md`, `LLM-REEL-PROMPT.md` — the
specification of a parallel "aidd-video-kit" reel factory (21 blocks, brand
linting, VO pacing, measured themes, synthesized music, carousels).

This repo already implements a large share of that system under different
names. The goal is **not** to port the zip wholesale — it is to absorb the
ideas that this kit lacks, into this kit's architecture, without maintaining
two parallel systems. This plan maps every handoff capability to a verdict
and sequences the work.

## How the two systems line up

| Handoff concept | This repo's equivalent |
| --- | --- |
| `Reel` data file, no JSX in content | `VideoSpec` in `src/videos/` — same philosophy |
| 21 blocks | 23 scene types (different grain: blocks compose within a scene; scenes are full-frame) |
| `lint.mjs` gating `build` | `validate.mjs` gating `produce` |
| VO lines rendered as captions | narration + word-timed animated captions |
| `<Id>Cover` compositions | per-delivery `--cover` compositions |
| dark / light / paper themes | tech / learn / fun channel themes |
| music beds in `public/` | licensed `soundtrack` assets with credit/license |
| `npm run vo` pacing tool | `voiceover.md` cue sheet + WPM validation |
| `--chunk` rendering | queue + Lambda adapters |

Semantic colors map cleanly: handoff `amber/teal/coral/faint` =
`attention/success` (focus/correct), `attention`-vs-`primary` nuance aside —
this kit's accent roles already encode the same "semantics never change" rule.

## Verdicts

### Already covered — do not port

- Data-not-JSX architecture, spec registry, Studio auto-registration
- Lint-gates-build (`produce` refuses on validation errors)
- Covers as first-class compositions; caption-carrying muted playback
- Chunked/cloud rendering; theme switching; structural brand chrome
  (the handoff renders handles/eyebrow in `Scene.tsx` so content cannot drop
  them — this kit's `Chrome` component already works exactly that way)

### Adopt — Phase 1: editorial rules as validation (cheap, high value)

1. **VO pacing band, not just a ceiling.** Handoff: 2.2–2.8 words/sec with
   per-line flags; measured as the single most-triggered check ("2–9 fixes on
   every first pass"). Today validation only warns above `maxNarrationWpm`.
   Add `minNarrationWpm` to channel editorial (tech: ~130 ≈ 2.2 w/s) and warn
   below it; flag per-scene pace in `voiceover.md` (`SLOW/OK/FAST` column).
2. **Accent rotation.** "No two adjacent scenes share an accent" — add a
   validation warning when consecutive scenes resolve to the same accent.
3. **Hook-vs-topic rule.** First frame is a claim, not a label: warn when
   `scenes[0]` is a `title` scene whose title text equals `spec.title`.
   (The topic already lives in the Chrome handle/eyebrow analogue.)
4. **Text-only scene warning.** "Every scene must show a mechanism": warn when
   a middle scene (not first/last) is `title`/`callout`/`bigStat` for more
   than ~6 seconds — the static-scene retention leak the handoff measured.
5. **Authoring guide** (`docs/authoring.md`): simple-English caption rules
   (≤10 words/line, active voice, no idioms, say the number), the house cast
   (Ravi/Priya/Meera, Chennai/Pune/Bengaluru, ₹ and GST, the e-commerce
   schema), topic-vs-hook naming, front-load-the-payoff, visual change every
   3–5s. Port the LLM-REEL-PROMPT as `docs/llm-authoring-prompt.md`, rewritten
   against `VideoSpec` + a reference spec attachment table, and fold its rules
   into the studio's `content/script-generation/context.json` so AI drafts
   inherit them.
6. **Second handle.** Handoff requires `@AIDataDynamics` + `@YuvarajTana` on
   every frame. Add optional `secondaryHandle` to `ChannelProfile`, rendered
   by `Chrome` — config, not per-video content. *(Needs the real handle
   decision from the channel owner.)*

### Adopt — Phase 2: the missing scene mechanics

7. **`rail` — persistent stage pipeline.** The handoff's retention mechanism:
   the same rail on every scene with `active` advancing. Implement as
   spec-level `rail: {stages: string[]}` plus per-scene `railStage?: number`,
   rendered by `Chrome` above the safe area so it survives scene cuts.
   Validation: railStage in range, non-decreasing warning.
8. **`algorithm` scene — synced array + status + code.** The signature
   technique. This kit's `arrayViz` hard-codes selection/bubble sort; the
   handoff's version is generic: per-step cell states (`.` idle, `a`
   comparing, `g` found, `x` eliminated), pointer labels, a status readout,
   and a code block whose active line advances on the same step clock. One
   scene type with `steps: [{atFrame, states, status?, codeLine?}]`.
   Validation: states string length matches values, frames within scene.
9. **`tokens` scene.** Chips that flip text → id; purpose-built for the LLM
   curriculum (tokenization, embeddings, cost). Small, distinct mechanism.
10. **`meter` scene.** One bar filling from→to with a label — capacity and
    budget metaphors (context window fill, token budget). Distinct from
    `chart` (comparison) — this is a single quantity over time.

### Adopt — Phase 3: packaging and QA depth

11. **Carousel deliveries.** 1080×1350 stills, one per "slide", packaged as a
    PNG set (Instagram) and a PDF (LinkedIn document post). Fits the existing
    delivery model: new render profile `carousel (4:5)` + a still-sequence
    render mode + PDF assembly in the packager. The handoff's two deck shapes
    (reference / workflow, every step with its verification) become authoring
    templates.
12. **Cover safe-box check.** Verify rendered covers keep content inside a
    centered 800×1100 box with ≥140px side margins, and write a simulated
    grid-crop preview. Requires PNG pixel analysis — pure-Node decode or a
    small Python helper, wired into `npm run qa`.
13. **Synthesized music beds.** In-repo generator (Python + numpy) producing
    copyright-free beds normalized to a target loudness, registered as
    `license: 'original'` soundtrack assets. Port the 12-preset design
    (tempo, progression, voice, percussion) rather than the exact files —
    the zip is not part of this handoff.
14. **Glyph-coverage guard.** The handoff shipped tofu for ₹ and ✓ before
    adding Noto fallbacks. Audit this kit's three brand fonts for ₹, ✓, ✕,
    →; add a Noto fallback face to `gen-fonts.mjs` if any are missing.

### Defer / skip — with reasons

- **`character` presenter block** — five-pose vector art is an asset-creation
  project; this kit's emoji illustration language covers the need for now.
- **Light/paper theme variants** — this kit's themes are per-channel brands,
  not per-medium variants; revisit only when print/PDF output matters, and
  then with measured contrast per the handoff's method (every token ≥4.5:1,
  or ≥3:1 large-only).
- **Blocks that duplicate existing scenes** — `card/keyrows/chips/note/stamp/
  badges/box/stack/lanes/nodes` map onto existing `steps`, `flashcards`,
  `callout`, `stats`, `architecture`, `compare`; port none until a real spec
  needs a capability those lack.
- **The −22 dBFS audio target** — this kit normalizes to −14 LUFS (platform
  standard for uploads); keep LUFS.
- **Publishing cadence/platform findings** — recorded here for reference;
  they are strategy, not code.

## Sequencing

| Phase | Contents | Effort |
| --- | --- | --- |
| 1 | ✅ **done** — validation rules (pace band, accent rotation, hook, text-only), authoring guide + LLM prompt, secondaryHandle, voiceover.md pace column, AI-context rules | small — landed first |
| 2 | ✅ **done** — rail, algorithm, tokens, meter scenes + validation + style guides + QA stills + tests | the core build |
| 3 | ✅ **done** — carousel deliveries + PDF, cover safe-box QA, music generator, glyph audit + baked Noto fallbacks | independent items, all landed |

Each phase ships with unit tests and style-guide coverage, matching how the
scene kit was built. Phase 1 needs no design work and can merge alone.

## Open decisions for the channel owner

1. The real second handle (`@YuvarajTana`?) and whether it appears on all
   three channels or only tech.
2. Whether the Lakshya brand green (`#059669`) should influence the tech
   theme, or the handoff's palette stays with its original project.
3. Carousel priority: the handoff calls the tall-poster/carousel gap its
   biggest format gap — pull Phase 3's carousel work forward if publishing
   carousels is imminent.
