export type MusicTrackSource =
  | 'audio/music/quiet-circuit-ambient.m4a'
  | 'audio/music/momentum-grid.m4a'
  | 'audio/music/playful-orbit.m4a';

export type MusicTrackCatalogItem = {
  id: string;
  label: string;
  description: string;
  mood: string;
  recommendedFor: string;
  src: MusicTrackSource;
  durationSeconds: number;
  credit: string;
  license: string;
  defaultVolume: number;
  loop: boolean;
};

export const MUSIC_TRACKS: MusicTrackCatalogItem[] = [
  {
    id: 'quiet-circuit',
    label: 'Quiet Circuit',
    description: 'A calm ambient bed that leaves plenty of room for detailed visuals.',
    mood: 'Calm · focused · minimal',
    recommendedFor: 'Architecture, LLM, RAG, and long-form explainers',
    src: 'audio/music/quiet-circuit-ambient.m4a',
    durationSeconds: 300,
    credit: 'Video Kit — Quiet Circuit Ambient',
    license: 'Original project-generated instrumental',
    defaultVolume: 0.92,
    loop: true,
  },
  {
    id: 'momentum-grid',
    label: 'Momentum Grid',
    description: 'A steady electronic pulse for quick technical flows and code animations.',
    mood: 'Energetic · modern · precise',
    recommendedFor: 'Programming Reels, comparisons, and runtime traces',
    src: 'audio/music/momentum-grid.m4a',
    durationSeconds: 60,
    credit: 'Video Kit — Momentum Grid',
    license: 'Original project-generated instrumental',
    defaultVolume: 0.9,
    loop: true,
  },
  {
    id: 'playful-orbit',
    label: 'Playful Orbit',
    description: 'A bright looping melody for colorful, friendly learning animations.',
    mood: 'Playful · bright · curious',
    recommendedFor: 'Kids, students, flashcards, counting, and fun videos',
    src: 'audio/music/playful-orbit.m4a',
    durationSeconds: 60,
    credit: 'Video Kit — Playful Orbit',
    license: 'Original project-generated instrumental',
    defaultVolume: 0.88,
    loop: true,
  },
];

export const musicTrackById = (id: string) =>
  MUSIC_TRACKS.find((track) => track.id === id);
