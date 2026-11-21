import type {Chunk} from '../types';

const db = (x: number) => Math.pow(10, x / 20);

/**
 * Per-frame music gain envelope.
 * - While the narrator speaks: pauseGain − SPEECH_DUCK_DB (≈ 17–18 dB under the voice overall)
 * - In pauses longer than MERGE_GAP_MS: rises to pauseGain (≈ 8 dB under the voice)
 * - Fast attack (~60 ms), slow release (~500 ms), word gaps merged so it never pumps.
 * - 1 s fade-in, fade-out across the end card.
 */
export function musicEnvelope(opts: {
  chunks: Chunk[];
  fps: number;
  totalFrames: number;
  pauseGain: number;
  speechDuckDb?: number;
  mergeGapMs?: number;
}): number[] {
  const {chunks, fps, totalFrames, pauseGain} = opts;
  const duck = db(-(opts.speechDuckDb ?? 10));
  const mergeGap = opts.mergeGapMs ?? 700;

  // speech intervals from word timings, merged across short gaps
  const iv: [number, number][] = [];
  for (const c of chunks) {
    for (const w of c.words) {
      const s = w.startMs - 80;
      const e = w.endMs + 120;
      const last = iv[iv.length - 1];
      if (last && s - last[1] < mergeGap) last[1] = Math.max(last[1], e);
      else iv.push([s, e]);
    }
  }
  const target = new Array(totalFrames).fill(1);
  for (const [s, e] of iv) {
    const a = Math.max(0, Math.floor((s / 1000) * fps));
    const b = Math.min(totalFrames, Math.ceil((e / 1000) * fps));
    for (let f = a; f < b; f++) target[f] = duck;
  }
  // first sentence (hook) stays clearly ducked from frame 0
  const env: number[] = new Array(totalFrames);
  let g = duck;
  const attack = 1 - Math.exp(-1 / (0.06 * fps));
  const release = 1 - Math.exp(-1 / (0.5 * fps));
  for (let f = 0; f < totalFrames; f++) {
    const t = target[f];
    g += (t - g) * (t < g ? attack : release);
    const fadeIn = Math.min(1, f / fps);
    const fadeOut = Math.min(1, (totalFrames - f) / (1.6 * fps));
    env[f] = Math.max(0, g * pauseGain * fadeIn * fadeOut);
  }
  return env;
}
