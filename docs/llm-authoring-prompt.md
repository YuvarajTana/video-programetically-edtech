# The LLM prompt — generating a new video spec

Paste everything between the lines into any capable model, replace
`TOPIC HERE` and `CHANNEL HERE`, then attach two files from this repo:

1. `src/types.ts` — the full scene type definitions
2. One existing spec that matches the shape you want, from `src/videos/`

The second attachment matters more than the first: a model copies a working
example far more reliably than it follows a spec.

**Which example to attach:**

| You want | Attach |
| --- | --- |
| A concept explainer | `src/videos/tech/llm-fundamentals.ts` |
| An algorithm walkthrough | `src/videos/tech/selection-sort.ts` |
| A system/architecture piece | `src/videos/tech/cdn-to-container.ts` |
| A kids/students lesson | `src/videos/learn/moon-phases.ts` |
| A short, loopable Fun video | `src/videos/fun/cloud-vs-elephant.ts` |

---

```
You are writing a vertical explainer video for a multi-channel education
system. Output ONE TypeScript file exporting a `VideoSpec` object matching
the schema I have attached. Output only the file — no commentary, no
markdown fences.

TOPIC: TOPIC HERE
CHANNEL: CHANNEL HERE        (tech | learn | fun)

═══════════════════════════════════════════════════════════════════
STRUCTURE
═══════════════════════════════════════════════════════════════════

5–8 scenes at 30fps:
  1. Hook           60–96 frames. A claim or question, never a definition.
  2–n. Concept      150–330 frames each, ONE idea per scene.
  last. Outro       60–90 frames, with a recap.

Narrative arc: what it is → what breaks → how it is fixed.
Front-load the payoff. If the useful part only lands at 40 seconds,
everyone who left at 20 seconds got nothing.

═══════════════════════════════════════════════════════════════════
THE TWO NAMING RULES — these are different and both matter
═══════════════════════════════════════════════════════════════════

1. `title` (the video title) is the SUBJECT NAME — what someone would type
   into a search box. Good: "KV Cache", "Binary Search". Bad: "Token 500
   Should Be Slow".
2. The FIRST SCENE's title is a HOOK, not a label. It makes a claim, asks a
   question, or shows something wrong. A validator warns when it merely
   repeats the video title.

═══════════════════════════════════════════════════════════════════
NARRATION — most scenes need it
═══════════════════════════════════════════════════════════════════

Each scene's `narration` is synthesized as voiceover AND rendered as the
on-screen caption. Most viewers watch muted; the caption carries the video.

SIMPLE ENGLISH — this is the format, not a style preference:
  • Max ~10 words per sentence. If it needs a comma to survive, split it.
  • One idea per line. Active voice.
  • No idioms, no phrasal verbs. "Budget for that", not "factor that in".
  • Say the number: "three times the tokens", not "significantly more".
  • The reader may have English as a second or third language.

PACE — 2.2 to 2.8 spoken words per second. A scene's narration word count
divided by its seconds must stay inside the channel band (tech: 130–165
words per minute). Err slow; a validator flags every violation.

═══════════════════════════════════════════════════════════════════
EVERY SCENE MUST SHOW A MECHANISM
═══════════════════════════════════════════════════════════════════

Something must move, fill, travel, flip, get eliminated or get blocked.
Use for concept scenes: flow, architecture, chart, timeline, arrayViz,
algorithm, tokens, meter, numberLine, code, terminal, compare, stats, quiz,
counting, flashcards, labeledDiagram.

TWO HIGH-VALUE PATTERNS:

• Synced execution — the `algorithm` scene runs array cells, pointer labels,
  a status readout, and a highlighted code line on ONE step clock. Keep each
  step's atFrame, states, status, and codeLine aligned — that alignment is
  the entire effect.

• Rail — for any topic with ordered stages, declare `rail: {stages: [...]}`
  on the spec and advance `railStage` scene by scene. It turns six cuts into
  one journey.
Use title / callout / bigStat only for the hook, a verdict, or the recap —
a validator warns when one of them holds the frame for more than 6 seconds
mid-video.

═══════════════════════════════════════════════════════════════════
BRAND — validators enforce this
═══════════════════════════════════════════════════════════════════

• Accent roles are semantic and never swapped:
    success   = correct / works
    attention = the problem, the thing to watch
    info      = explanation / neutral emphasis
• When you set scene accents explicitly, rotate them — no two adjacent
  scenes may declare the same accent.
• Reuse the house examples: Ravi, Priya, Meera; Chennai, Pune, Bengaluru;
  ₹ and GST; the e-commerce schema (users, orders, order_items). Do not
  invent a parallel cast.
• learn-channel videos must include audience.ageBand,
  editorial.objective, and editorial.safetyStatus.

═══════════════════════════════════════════════════════════════════
ACCURACY
═══════════════════════════════════════════════════════════════════

• Never present an invented number as measured. Round, illustrative figures
  are fine — start the file with a comment listing which numbers are
  illustrative and which are exact.
• If the topic has a commonly repeated oversimplification, say the correct
  thing. If you are unsure of a detail, leave it out rather than guess.
• tech videos that show statistics must list editorial.sources.

═══════════════════════════════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════════════════════════════

One file. A block comment naming the video and its illustrative numbers,
then the export. Match the style of the attached example file exactly.
```

---

## After the model gives you the file

```bash
# 1. save to src/videos/<channel>/, register it in that channel's registry
npm run validate -- <channel>/<slug>    # fix every error, then the warnings
npm run captions -- <channel>/<slug>    # check the pace column in voiceover.md
npm run studio                          # scrub it; look for collisions
npm run produce -- <channel>/<slug>
```

**Expect to fix things.** The most common failures, in order:

1. **Narration too fast.** Models write dense prose. The validator and the
   `voiceover.md` pace column catch it — split lines, lengthen scenes.
2. **A text-only middle scene.** Replace with a mechanism scene, or merge it
   into a neighbour.
3. **The opening title written as a label.** Rename it into a claim; the
   topic already lives in the video title.
4. **learn videos missing the editorial gate fields.** Add ageBand,
   objective, and safetyStatus — validation blocks production without them.

## Iterating

To change one scene, give the model that scene's object plus what is wrong
with it. Do not regenerate the whole file — you will lose fixes you already
made.

- "Scene 3 is only text. Replace it with a chart comparing X and Y."
- "Every narration line in scene 4 is too fast. Rewrite shorter, same meaning."
- "Rewrite the scene 1 title as a claim rather than a topic name."
