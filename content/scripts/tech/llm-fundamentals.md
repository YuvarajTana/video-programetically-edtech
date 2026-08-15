# LLM Fundamentals: From Prompt to Prediction — production script

- Series: Python to AI Engineer
- Runtime: exactly 5:00 at 30 FPS
- Deliveries: YouTube 16:9 and Instagram Reel 9:16
- Audience: beginners learning AI engineering
- Narration: 823 words, approximately 165 WPM
- Learning objective: understand how text becomes tokens, how prompts and context guide inference, how sampling controls affect output, and why hallucinations require grounding and guardrails.
- Background music: “Quiet Circuit Ambient,” an original locally generated instrumental, mixed under narration with fades and ducking.

## Timed narration and scenes

| # | Time | Length | Scene | Visual direction | Exact narration |
| --- | --- | ---: | --- | --- | --- |
| 1 | 0:00–0:03 | 3s | Title | Reveal the central question, then land on “one token at a time.” | An answer emerges one token at a time. |
| 2 | 0:03–0:21 | 18s | Flow | Trace instructions and context through inference, sampling, and checks. | Here is the complete mental model. Instructions and information enter the model. The model calculates probabilities for what could come next. A decoding strategy chooses one token, adds it to the context, and repeats. Around that loop, applications add checks to improve safety and reliability. |
| 3 | 0:21–0:45 | 24s | Flow | Split an illustrative word into token pieces, then convert the pieces to token IDs. | First, tokens. An L L M does not directly read words or characters. A tokenizer breaks text into model-specific pieces called tokens, then maps those pieces to numbers. A token might be a whole word, part of a word, punctuation, or even whitespace. The exact split depends on the tokenizer. Token counts matter because they affect context limits, generation length, latency, and cost. |
| 4 | 0:45–1:11 | 26s | Architecture | Merge system instructions, user input, history, and supplied knowledge into the context window. | Context means the tokens available to the model for this response. It can include the system prompt, the user request, conversation history, retrieved documents, examples, and tool results. The context window has a maximum size. If an application sends too much, it must trim, summarize, or select what matters. Context is temporary working information, not proof that the model permanently learned something. |
| 5 | 1:11–1:36 | 25s | Steps | Reveal goal, relevant context, constraints, and output format in order. | A prompt is input that tells the model what to do. Good prompts usually make four things clear: the goal, the relevant context, the constraints, and the desired output format. Examples can demonstrate a pattern more precisely than a long description. But prompting is not magic. A polished instruction can focus the model’s behavior; it cannot guarantee facts that are missing, uncertain, or outside the supplied evidence. |
| 6 | 1:36–2:01 | 25s | Compare | Contrast application-level system instructions with the immediate user request. | The system prompt and user prompt have different jobs. The system prompt sets application-level behavior: role, tone, policies, tool rules, and boundaries. The user prompt contains the immediate request. Applications combine both with other context before inference. Instruction priority depends on the model and A P I, so a system prompt is an important control, but it should not be treated as a perfect security boundary. |
| 7 | 2:01–2:31 | 30s | Architecture | Animate the autoregressive loop: input tokens, model scores, probabilities, decoder, chosen token, repeat. | Inference is the process of running a trained model to produce an output. For text generation, the model reads the current tokens and produces a score for every possible next token. Those scores become a probability distribution. A decoder selects one candidate. The new token is appended to the context, and the model runs again. This autoregressive loop continues until a stop token, a length limit, or another stopping rule ends the response. The model is predicting sequence continuations, not consulting a built-in truth database. |
| 8 | 2:31–2:55 | 24s | Stats | Compare illustrative lower, neutral, and higher temperature values. | Temperature reshapes the probability distribution before sampling. Lower values sharpen it, making already likely tokens even more dominant. Outputs usually become more focused and repeatable. Higher values flatten the distribution, giving less likely candidates more opportunity and increasing variation. Temperature does not add intelligence or facts. The displayed numbers are illustrative, not universal recommendations. Exact behavior depends on the model, provider, and whether sampling is enabled. |
| 9 | 2:55–3:19 | 24s | Flow | Sort candidates, accumulate probability mass, stop at p equals 0.9, and sample. | Top p, also called nucleus sampling, keeps the smallest group of high-probability tokens whose combined probability reaches a threshold. With top p set to zero point nine, the candidate count can change at every step. When the model is confident, only a few tokens may be needed. When uncertainty is spread out, the set can grow. Lower top p is more selective; higher top p allows a wider probability mass. |
| 10 | 3:19–3:43 | 24s | Compare | Contrast fixed shortlists of k equals 5 and k equals 50. | Top k keeps a fixed number of the most probable next tokens, then removes everything else before sampling. A top k of five keeps five candidates. A top k of fifty keeps fifty. Unlike top p, the shortlist size does not adapt to how concentrated the distribution is. Lower k restricts choice; higher k permits more variety. Some systems expose top k, some do not, and defaults vary. |
| 11 | 3:43–4:02 | 19s | Steps | Show temperature reshaping, top-k filtering, top-p filtering, then sampling. | These controls can work together. Temperature reshapes probabilities, while top k and top p filter the candidate pool. Then sampling chooses from what remains. Aggressively restricting every control can make output repetitive or brittle. Opening everything can increase variation and mistakes. Start from provider defaults, change one setting at a time, and evaluate on real tasks instead of assuming one perfect combination. |
| 12 | 4:02–4:28 | 26s | Steps | Connect weak evidence to pattern completion, confident wording, and unsupported output. | A hallucination, also called a confabulation, is output that sounds plausible but is false, unsupported, inconsistent, or disconnected from the prompt. It happens because the model is optimized to produce likely continuations, not to guarantee truth. Weak context, ambiguous questions, missing knowledge, and pressure to answer can all contribute. Lower temperature may reduce variation, but it does not solve factual reliability. A confidently repeated error is still an error. |
| 13 | 4:28–4:52 | 24s | Architecture | Trace input checks, grounding, generation, output checks, and human review. | Guardrails are controls around the model, not a single magic prompt. Input checks can limit scope, detect attacks, and protect sensitive data. Grounding can supply trusted evidence. Tool permissions restrict actions. Output checks can validate structure, policy, citations, or business rules. High-risk decisions may require a human. Logs, evaluations, rate limits, and monitoring complete the system. Guardrails reduce risk, but no fixed layer makes every adaptive input safe. |
| 14 | 4:52–5:00 | 8s | Outro | Recap the loop and end on the engineering takeaway. | Remember the loop: tokenize the context, predict the next token, sample, repeat, then verify. That is the foundation beneath modern L L M applications. |

## Primary sources

- [Hugging Face Transformers — Generation](https://huggingface.co/docs/transformers/main_classes/text_generation)
- [NIST AI 600-1 — Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1)
- [OpenAI Model Spec — Instructions and levels of authority](https://model-spec.openai.com/2025-10-27.html#instructions-and-levels-of-authority)

## Production commands

```bash
npm run typecheck
npm run validate -- tech/llm-fundamentals
npm run render -- tech/llm-fundamentals
npm run package -- tech/llm-fundamentals
```
