import {z} from 'zod';

export const SupportedLocaleSchema = z.enum([
  'en-US',
  'hi-IN',
  'ta-IN',
  'te-IN',
  'kn-IN',
  'ml-IN',
  'bn-IN',
]);

export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>;

export type LanguageDefinition = {
  locale: SupportedLocale;
  label: string;
  nativeLabel: string;
  indicTransCode: string;
  script: string;
  fontFamily: string;
  captionWordsPerPage: {landscape: number; portrait: number};
  providers: {
    translation: Array<'indictrans2'>;
    tts: Array<'kokoro' | 'chatterbox' | 'f5tts' | 'indicf5' | 'elevenlabs'>;
  };
};

export const LANGUAGES: readonly LanguageDefinition[] = [
  {
    locale: 'en-US',
    label: 'English',
    nativeLabel: 'English',
    indicTransCode: 'eng_Latn',
    script: 'Latin',
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
    captionWordsPerPage: {landscape: 8, portrait: 5},
    providers: {
      translation: ['indictrans2'],
      tts: ['kokoro', 'chatterbox'],
    },
  },
  {
    locale: 'hi-IN',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    indicTransCode: 'hin_Deva',
    script: 'Devanagari',
    fontFamily: "'Noto Sans Devanagari', 'Kohinoor Devanagari', sans-serif",
    captionWordsPerPage: {landscape: 7, portrait: 4},
    providers: {translation: ['indictrans2'], tts: []},
  },
  {
    locale: 'ta-IN',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    indicTransCode: 'tam_Taml',
    script: 'Tamil',
    fontFamily: "'Noto Sans Tamil', 'Tamil Sangam MN', sans-serif",
    captionWordsPerPage: {landscape: 7, portrait: 4},
    providers: {translation: ['indictrans2'], tts: []},
  },
  {
    locale: 'te-IN',
    label: 'Telugu',
    nativeLabel: 'తెలుగు',
    indicTransCode: 'tel_Telu',
    script: 'Telugu',
    fontFamily: "'Noto Sans Telugu', 'Kohinoor Telugu', sans-serif",
    captionWordsPerPage: {landscape: 7, portrait: 4},
    providers: {translation: ['indictrans2'], tts: []},
  },
  {
    locale: 'kn-IN',
    label: 'Kannada',
    nativeLabel: 'ಕನ್ನಡ',
    indicTransCode: 'kan_Knda',
    script: 'Kannada',
    fontFamily: "'Noto Sans Kannada', 'Noto Sans Kannada UI', sans-serif",
    captionWordsPerPage: {landscape: 7, portrait: 4},
    providers: {translation: ['indictrans2'], tts: []},
  },
  {
    locale: 'ml-IN',
    label: 'Malayalam',
    nativeLabel: 'മലയാളം',
    indicTransCode: 'mal_Mlym',
    script: 'Malayalam',
    fontFamily: "'Noto Sans Malayalam', 'Malayalam Sangam MN', sans-serif",
    captionWordsPerPage: {landscape: 6, portrait: 4},
    providers: {translation: ['indictrans2'], tts: []},
  },
  {
    locale: 'bn-IN',
    label: 'Bengali',
    nativeLabel: 'বাংলা',
    indicTransCode: 'ben_Beng',
    script: 'Bengali',
    fontFamily: "'Noto Sans Bengali', 'Bangla Sangam MN', sans-serif",
    captionWordsPerPage: {landscape: 7, portrait: 4},
    providers: {translation: ['indictrans2'], tts: []},
  },
] as const;

export const languageFor = (locale: string) => {
  const candidate = locale.toLowerCase().startsWith('en') ? 'en-US' : locale;
  const parsed = SupportedLocaleSchema.parse(candidate);
  return LANGUAGES.find((language) => language.locale === parsed)!;
};

export const isIndicLocale = (locale: string) =>
  SupportedLocaleSchema.safeParse(locale).success && locale !== 'en-US';
