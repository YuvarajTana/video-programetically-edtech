const SPOKEN_CODE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\*\*kwargs\b/giu, 'keyword arguments'],
  [/\*args\b/giu, 'positional arguments'],
  [/\bkwargs\b/giu, 'keyword arguments'],
  [/\bargs\b/giu, 'arguments'],
  [/!=/gu, ' is not equal to '],
  [/==/gu, ' equals '],
  [/=>/gu, ' becomes '],
  [/->/gu, ' returns '],
];

/**
 * Converts narration into speech-friendly text without changing the approved
 * captions. This is intentionally conservative: it fixes Markdown and common
 * programming tokens while leaving ordinary prose and identifiers intact.
 */
export const narrationForSpeech = (input: string) => {
  let text = input
    .replace(/```[\w-]*\n?/gu, ' ')
    .replace(/```/gu, ' ')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/[“”]/gu, '"')
    .replace(/[‘’]/gu, "'")
    .replace(/[—–]/gu, ', ');

  for (const [pattern, replacement] of SPOKEN_CODE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/@([A-Za-z_]\w*)/gu, 'the $1 decorator')
    .replace(/\*{2,}/gu, ' ')
    .replace(/_+/gu, ' ')
    .replace(/\s+([,.;!?])/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim();
};

export const narrationSpeechMap = (narrations: string[]) =>
  narrations.map((text) => narrationForSpeech(text));
