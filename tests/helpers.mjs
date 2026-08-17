/** Minimal channel profile for exercising validation without the registries. */
export const makeChannel = (overrides = {}) => ({
  id: 'tech',
  defaultDeliveries: ['youtube-long', 'instagram-reel'],
  editorial: {
    minSeconds: 20,
    maxSeconds: 480,
    maxNarrationWpm: 220,
    ...(overrides.editorial ?? {}),
  },
  ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'editorial')),
});

/** A spec that validates cleanly against makeChannel(). */
export const makeSpec = (overrides = {}) => ({
  channel: 'tech',
  slug: 'test-video',
  title: 'Test video',
  template: 'concept-explainer',
  scenes: [
    {
      type: 'title',
      durationInFrames: 90,
      title: 'A claim, not a label',
      narration: 'A short hook line.',
    },
    {
      type: 'steps',
      durationInFrames: 600,
      items: [{label: 'One'}, {label: 'Two'}],
      narration: 'Two easy steps explained at a comfortable pace.',
    },
    {type: 'outro', durationInFrames: 90, narration: 'That is the recap.'},
  ],
  ...overrides,
});

export const errorsOf = (issues) => issues.filter((issue) => issue.severity === 'error');
export const warningsOf = (issues) => issues.filter((issue) => issue.severity === 'warning');
