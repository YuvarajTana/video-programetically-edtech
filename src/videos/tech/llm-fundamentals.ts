import type {VideoSpec} from '../../types';

/**
 * Five-minute beginner explainer.
 *
 * The scene timeline is exactly 9,000 frames at 30 fps. Narration lives beside
 * the visuals so captions, chapters, TTS, and the final render cannot drift.
 */
export const llmFundamentals: VideoSpec = {
  channel: 'tech',
  slug: 'llm-fundamentals',
  title: 'LLM Fundamentals: From Prompt to Prediction',
  template: 'long-form-concept-explainer',
  summary:
    'A visual guide to tokens, context, prompts, inference, sampling controls, hallucinations, and guardrails.',
  fps: 30,
  deliveries: ['youtube-long', 'instagram-reel'],
  audience: {level: 'beginner'},
  captions: true,

  // Generated locally by `npm run voice -- tech/llm-fundamentals`.
  audio: 'audio/tech/llm-fundamentals/master.wav',
  captionTimings: 'audio/tech/llm-fundamentals/words.json',

  editorial: {
    language: 'en',
    objective:
      'Build an accurate mental model of how an LLM turns instructions and context into sampled output, and where reliability controls fit.',
    sources: [
      {
        title: 'Hugging Face Transformers — Generation',
        url: 'https://huggingface.co/docs/transformers/main_classes/text_generation',
      },
      {
        title:
          'NIST AI 600-1 — Artificial Intelligence Risk Management Framework: Generative AI Profile',
        url: 'https://doi.org/10.6028/NIST.AI.600-1',
      },
      {
        title: 'OpenAI API — Realtime system messages',
        url: 'https://platform.openai.com/docs/api-reference/realtime-server-events/input_audio_buffer/committed',
      },
    ],
  },

  scenes: [
    {
      id: 'hook',
      type: 'title',
      durationInFrames: 90,
      kicker: 'LLM fundamentals, visually',
      title: 'How does an LLM answer?',
      subtitle: 'One token at a time.',
      narration: 'An answer emerges one token at a time.',
    },

    {
      id: 'mental-model',
      type: 'flow',
      durationInFrames: 540,
      chapterTitle: 'The complete mental model',
      kicker: 'Start with the whole system',
      title: 'Input → prediction → checks',
      steps: [
        {
          label: 'Instructions',
          detail: 'system prompt + user prompt',
          accent: 'info',
        },
        {
          label: 'Context',
          detail: 'conversation + supplied knowledge',
          accent: 'primary',
        },
        {
          label: 'Inference',
          detail: 'predict the next token',
          accent: 'attention',
        },
        {
          label: 'Sampling',
          detail: 'temperature + top-p + top-k',
          accent: 'secondary',
        },
        {
          label: 'Checks',
          detail: 'guardrails + verification',
          accent: 'success',
        },
      ],
      narration:
        'Here is the complete mental model. Instructions and information enter the model. The model calculates probabilities for what could come next. A decoding strategy chooses one token, adds it to the context, and repeats. Around that loop, applications add checks to improve safety and reliability.',
    },

    {
      id: 'tokens',
      type: 'flow',
      durationInFrames: 720,
      chapterTitle: 'Tokens: the model’s units',
      kicker: 'Foundation one',
      title: 'Text becomes tokens',
      steps: [
        {
          label: '“unbelievable!”',
          detail: 'human-readable text',
          accent: 'info',
        },
        {
          label: 'Tokenizer',
          detail: 'model-specific rules',
          accent: 'primary',
        },
        {
          label: '“un” · “believ” · “able” · “!”',
          detail: 'illustrative pieces',
          accent: 'attention',
        },
        {
          label: 'Token IDs',
          detail: 'numbers used by the model',
          accent: 'success',
        },
      ],
      narration:
        'First, tokens. An L L M does not directly read words or characters. A tokenizer breaks text into model-specific pieces called tokens, then maps those pieces to numbers. A token might be a whole word, part of a word, punctuation, or even whitespace. The exact split depends on the tokenizer. Token counts matter because they affect context limits, generation length, latency, and cost.',
    },

    {
      id: 'context',
      type: 'architecture',
      durationInFrames: 780,
      chapterTitle: 'Context: what the model can see',
      kicker: 'Foundation two',
      title: 'Context is the working input',
      nodes: [
        {
          id: 'system',
          label: 'System Prompt',
          sub: 'behavior and boundaries',
          col: 0,
          row: 0,
          accent: 'primary',
        },
        {
          id: 'user',
          label: 'User Prompt',
          sub: 'the current request',
          col: 0,
          row: 1,
          accent: 'info',
        },
        {
          id: 'history',
          label: 'History',
          sub: 'earlier messages',
          col: 1,
          row: 0,
          accent: 'secondary',
        },
        {
          id: 'knowledge',
          label: 'Knowledge',
          sub: 'documents and tool results',
          col: 1,
          row: 1,
          accent: 'attention',
        },
        {
          id: 'window',
          label: 'Context Window',
          sub: 'the tokens available now',
          col: 2,
          row: 0,
          span: 1,
          accent: 'success',
        },
      ],
      edges: [
        {from: 'system', to: 'window'},
        {from: 'user', to: 'window'},
        {from: 'history', to: 'window'},
        {from: 'knowledge', to: 'window'},
      ],
      reveal: [
        ['system', 'user'],
        ['history', 'knowledge'],
        ['window'],
      ],
      trace: {
        path: ['user', 'window'],
        label: 'the request joins the working context',
      },
      narration:
        'Context means the tokens available to the model for this response. It can include the system prompt, the user request, conversation history, retrieved documents, examples, and tool results. The context window has a maximum size. If an application sends too much, it must trim, summarize, or select what matters. Context is temporary working information, not proof that the model permanently learned something.',
    },

    {
      id: 'prompt',
      type: 'steps',
      durationInFrames: 750,
      chapterTitle: 'Prompts: specify the task',
      kicker: 'Direct the model',
      items: [
        {
          label: 'Goal',
          detail: 'Say what successful output should achieve',
          accent: 'primary',
        },
        {
          label: 'Relevant context',
          detail: 'Supply facts, examples, and definitions',
          accent: 'info',
        },
        {
          label: 'Constraints',
          detail: 'State boundaries and exclusions',
          accent: 'attention',
        },
        {
          label: 'Output format',
          detail: 'Describe the shape you need',
          accent: 'success',
        },
      ],
      footnote: 'Clear prompts reduce ambiguity; they do not create knowledge.',
      narration:
        'A prompt is input that tells the model what to do. Good prompts usually make four things clear: the goal, the relevant context, the constraints, and the desired output format. Examples can demonstrate a pattern more precisely than a long description. But prompting is not magic. A polished instruction can focus the model’s behavior; it cannot guarantee facts that are missing, uncertain, or outside the supplied evidence.',
    },

    {
      id: 'system-prompt',
      type: 'compare',
      durationInFrames: 750,
      chapterTitle: 'System prompt versus user prompt',
      kicker: 'Different jobs',
      title: 'Behavior versus request',
      left: {
        heading: 'System Prompt',
        points: [
          'sets role and operating rules',
          'defines tone and boundaries',
          'usually controlled by the application',
        ],
        accent: 'primary',
      },
      right: {
        heading: 'User Prompt',
        points: [
          'states the immediate task',
          'supplies request-specific details',
          'changes from turn to turn',
        ],
        accent: 'info',
      },
      narration:
        'The system prompt and user prompt have different jobs. The system prompt sets application-level behavior: role, tone, policies, tool rules, and boundaries. The user prompt contains the immediate request. Applications combine both with other context before inference. Instruction priority depends on the model and A P I, so a system prompt is an important control, but it should not be treated as a perfect security boundary.',
    },

    {
      id: 'inference',
      type: 'architecture',
      durationInFrames: 900,
      chapterTitle: 'Inference: predicting one token',
      kicker: 'Inside generation',
      title: 'One prediction becomes a loop',
      nodes: [
        {
          id: 'input',
          label: 'Input Tokens',
          sub: 'current context',
          col: 0,
          row: 0,
          accent: 'info',
        },
        {
          id: 'model',
          label: 'LLM',
          sub: 'compute next-token scores',
          col: 1,
          row: 0,
          accent: 'primary',
        },
        {
          id: 'distribution',
          label: 'Probabilities',
          sub: 'possible next tokens',
          col: 2,
          row: 0,
          accent: 'attention',
        },
        {
          id: 'decoder',
          label: 'Decoder',
          sub: 'filter and sample',
          col: 2,
          row: 1,
          accent: 'secondary',
        },
        {
          id: 'next',
          label: 'Chosen Token',
          sub: 'append to context',
          col: 1,
          row: 1,
          accent: 'success',
        },
      ],
      edges: [
        {from: 'input', to: 'model'},
        {from: 'model', to: 'distribution'},
        {from: 'distribution', to: 'decoder'},
        {from: 'decoder', to: 'next'},
        {from: 'next', to: 'input', label: 'repeat', dashed: true},
      ],
      reveal: [
        ['input'],
        ['model'],
        ['distribution'],
        ['decoder'],
        ['next'],
      ],
      trace: {
        path: ['input', 'model', 'distribution', 'decoder', 'next', 'input'],
        label: 'autoregressive generation',
      },
      narration:
        'Inference is the process of running a trained model to produce an output. For text generation, the model reads the current tokens and produces a score for every possible next token. Those scores become a probability distribution. A decoder selects one candidate. The new token is appended to the context, and the model runs again. This autoregressive loop continues until a stop token, a length limit, or another stopping rule ends the response. The model is predicting sequence continuations, not consulting a built-in truth database.',
    },

    {
      id: 'temperature',
      type: 'stats',
      durationInFrames: 720,
      chapterTitle: 'Temperature: reshape probabilities',
      kicker: 'Sampling control one',
      title: 'Temperature changes sharpness',
      cards: [
        {
          label: 'Lower',
          value: '0.2',
          note: 'sharper and more repeatable',
          accent: 'info',
        },
        {
          label: 'Neutral example',
          value: '1.0',
          note: 'use the model’s relative scores',
          accent: 'primary',
        },
        {
          label: 'Higher',
          value: '1.2',
          note: 'flatter and more varied',
          accent: 'attention',
        },
      ],
      narration:
        'Temperature reshapes the probability distribution before sampling. Lower values sharpen it, making already likely tokens even more dominant. Outputs usually become more focused and repeatable. Higher values flatten the distribution, giving less likely candidates more opportunity and increasing variation. Temperature does not add intelligence or facts. The displayed numbers are illustrative, not universal recommendations. Exact behavior depends on the model, provider, and whether sampling is enabled.',
    },

    {
      id: 'top-p',
      type: 'flow',
      durationInFrames: 720,
      chapterTitle: 'Top-p: keep enough probability mass',
      kicker: 'Sampling control two',
      title: 'Top-p adapts the candidate set',
      steps: [
        {
          label: 'Sort candidates',
          detail: 'highest probability first',
          accent: 'info',
        },
        {
          label: 'Add probabilities',
          detail: 'build cumulative mass',
          accent: 'primary',
        },
        {
          label: 'Reach p = 0.9',
          detail: 'keep the smallest sufficient set',
          accent: 'attention',
        },
        {
          label: 'Sample',
          detail: 'choose only from that set',
          accent: 'success',
        },
      ],
      narration:
        'Top p, also called nucleus sampling, keeps the smallest group of high-probability tokens whose combined probability reaches a threshold. With top p set to zero point nine, the candidate count can change at every step. When the model is confident, only a few tokens may be needed. When uncertainty is spread out, the set can grow. Lower top p is more selective; higher top p allows a wider probability mass.',
    },

    {
      id: 'top-k',
      type: 'compare',
      durationInFrames: 720,
      chapterTitle: 'Top-k: keep a fixed candidate count',
      kicker: 'Sampling control three',
      title: 'Top-k uses a fixed-size shortlist',
      left: {
        heading: 'k = 5',
        points: [
          'keep five candidates',
          'discard every token below rank five',
          'narrower shortlist',
        ],
        accent: 'info',
      },
      right: {
        heading: 'k = 50',
        points: [
          'keep fifty candidates',
          'probabilities are normalized again',
          'broader shortlist',
        ],
        accent: 'attention',
      },
      narration:
        'Top k keeps a fixed number of the most probable next tokens, then removes everything else before sampling. A top k of five keeps five candidates. A top k of fifty keeps fifty. Unlike top p, the shortlist size does not adapt to how concentrated the distribution is. Lower k restricts choice; higher k permits more variety. Some systems expose top k, some do not, and defaults vary.',
    },

    {
      id: 'sampling-together',
      type: 'steps',
      durationInFrames: 570,
      chapterTitle: 'Using sampling controls together',
      kicker: 'Tune deliberately',
      items: [
        {
          label: 'Temperature',
          detail: 'reshape the distribution',
          accent: 'primary',
        },
        {
          label: 'Top-k',
          detail: 'keep a fixed number',
          accent: 'info',
        },
        {
          label: 'Top-p',
          detail: 'keep enough probability mass',
          accent: 'attention',
        },
        {
          label: 'Sample',
          detail: 'choose from the remaining candidates',
          accent: 'success',
        },
      ],
      footnote: 'Providers may apply these controls differently.',
      narration:
        'These controls can work together. Temperature reshapes probabilities, while top k and top p filter the candidate pool. Then sampling chooses from what remains. Aggressively restricting every control can make output repetitive or brittle. Opening everything can increase variation and mistakes. Start from provider defaults, change one setting at a time, and evaluate on real tasks instead of assuming one perfect combination.',
    },

    {
      id: 'hallucination',
      type: 'steps',
      durationInFrames: 780,
      chapterTitle: 'Hallucination: plausible but unsupported',
      kicker: 'The reliability gap',
      items: [
        {
          label: 'Weak or missing evidence',
          detail: 'the context does not contain a reliable answer',
          accent: 'attention',
        },
        {
          label: 'Pattern completion',
          detail: 'the model still predicts plausible text',
          accent: 'primary',
        },
        {
          label: 'Confident wording',
          detail: 'fluency can hide uncertainty',
          accent: 'secondary',
        },
        {
          label: 'Unsupported output',
          detail: 'facts, citations, or details may be wrong',
          accent: 'info',
        },
      ],
      footnote: 'Fluent is not the same as factual.',
      narration:
        'A hallucination, also called a confabulation, is output that sounds plausible but is false, unsupported, inconsistent, or disconnected from the prompt. It happens because the model is optimized to produce likely continuations, not to guarantee truth. Weak context, ambiguous questions, missing knowledge, and pressure to answer can all contribute. Lower temperature may reduce variation, but it does not solve factual reliability. A confidently repeated error is still an error.',
    },

    {
      id: 'guardrails',
      type: 'architecture',
      durationInFrames: 720,
      chapterTitle: 'Guardrails: controls around the model',
      kicker: 'Build checks around inference',
      title: 'Reliable systems use layers',
      nodes: [
        {
          id: 'input-checks',
          label: 'Input Checks',
          sub: 'scope, policy, injection',
          col: 0,
          row: 0,
          accent: 'info',
        },
        {
          id: 'grounding',
          label: 'Grounding',
          sub: 'trusted evidence',
          col: 1,
          row: 0,
          accent: 'primary',
        },
        {
          id: 'model',
          label: 'LLM',
          sub: 'generate a candidate',
          col: 2,
          row: 0,
          accent: 'attention',
        },
        {
          id: 'output-checks',
          label: 'Output Checks',
          sub: 'format, safety, citations',
          col: 1,
          row: 1,
          accent: 'secondary',
        },
        {
          id: 'human',
          label: 'Approve or Escalate',
          sub: 'match the level of risk',
          col: 0,
          row: 1,
          accent: 'success',
        },
      ],
      edges: [
        {from: 'input-checks', to: 'grounding'},
        {from: 'grounding', to: 'model'},
        {from: 'model', to: 'output-checks'},
        {from: 'output-checks', to: 'human'},
        {
          from: 'output-checks',
          to: 'grounding',
          label: 'retry',
          dashed: true,
        },
      ],
      reveal: [
        ['input-checks'],
        ['grounding'],
        ['model'],
        ['output-checks'],
        ['human'],
      ],
      trace: {
        path: ['input-checks', 'grounding', 'model', 'output-checks', 'human'],
        label: 'defense in depth',
      },
      narration:
        'Guardrails are controls around the model, not a single magic prompt. Input checks can limit scope, detect attacks, and protect sensitive data. Grounding can supply trusted evidence. Tool permissions restrict actions. Output checks can validate structure, policy, citations, or business rules. High-risk decisions may require a human. Logs, evaluations, rate limits, and monitoring complete the system. Guardrails reduce risk, but no fixed layer makes every adaptive input safe.',
    },

    {
      id: 'outro',
      type: 'outro',
      durationInFrames: 240,
      chapterTitle: 'The complete LLM loop',
      recap: [
        'tokens + context → model input',
        'inference + sampling → generated output',
        'grounding + guardrails → safer system',
      ],
      tagline: 'Understand the loop. Then engineer the system.',
      narration:
        'Remember the loop: tokenize the context, predict the next token, sample, repeat, then verify. That is the foundation beneath modern L L M applications.',
    },
  ],
};
