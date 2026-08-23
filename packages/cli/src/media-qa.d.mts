export type MediaProbe = {
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    duration?: string | number;
    width?: string | number;
    height?: string | number;
  }>;
  format?: {duration?: string | number};
};

export type MediaQaOptions = {
  expectedDurationSeconds?: number;
  requireAudio?: boolean;
  toleranceSeconds?: number;
};

export type MediaQaReport = {
  valid: boolean;
  expectedDurationSeconds: number | null;
  formatDurationSeconds: number | null;
  videoDurationSeconds: number | null;
  audioDurationSeconds: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number | null;
  height: number | null;
  issues: string[];
};

export const analyzeMediaProbe: (
  probe: MediaProbe,
  options?: MediaQaOptions,
) => MediaQaReport;
export const probeMediaFile: (path: string) => MediaProbe;
export const assertMediaFile: (
  path: string,
  options?: MediaQaOptions,
) => MediaQaReport;
