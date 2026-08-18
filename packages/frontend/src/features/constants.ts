import {LANGUAGES, type SupportedLocale} from '@video-kit/core/languages';

export const CONSENT_PHRASE =
  'I confirm that I am an adult, this is my own voice, and I consent to Video Kit creating synthetic speech for projects I authorize. I can revoke this permission at any time.';

export const REFERENCE_PASSAGE =
  'Technology can make difficult ideas easier to understand when we explain them one step at a time. In this recording I am speaking naturally, clearly, and at a comfortable pace. My voice changes slightly as I ask a question, share an exciting idea, and finish a thoughtful sentence. This private sample will only be used for video projects that I choose to create on this computer.';

export const F5_REFERENCE_PASSAGE =
  'Clear explanations turn complex technology into simple steps. I speak naturally, pause between ideas, and emphasize the words that matter most.';

export type EnrollmentProvider = 'chatterbox' | 'f5tts' | 'indicf5' | 'elevenlabs';

export const localesForVoiceProvider = (provider: EnrollmentProvider) =>
  provider === 'chatterbox'
    ? (['en-US'] as SupportedLocale[])
    : provider === 'f5tts'
    ? LANGUAGES.map((language) => language.locale)
    : provider === 'indicf5'
      ? LANGUAGES.filter((language) => language.locale !== 'en-US').map(
          (language) => language.locale,
        )
      : (['en-US', 'hi-IN', 'ta-IN'] as SupportedLocale[]);
