export type ChunkWord = {text: string; startMs: number; endMs: number};
export type Chunk = {startMs: number; endMs: number; showUntilMs: number; words: ChunkWord[]};

export type Stamp = {atMs: number; text: string; style: 'number' | 'word' | 'chip'};

export type Scene = {
  id: string;
  startMs: number;
  endMs: number;
  line: string;
  visual: string;
  trigger: string | null;
  triggerMs: number | null;
  stamps: Stamp[];
  pulsesMs: number[];
  sfx: string | null;
  captionChunks: string[];
};

export type Episode = {
  title: string;
  slug: string;
  hook: {text: string; highlight?: string[]; startMs: number; endMs: number};
  narrationDurationMs: number;
  lastWordEndMs: number;
  endCardMs: number;
  cta: string;
  music: {src: string; title: string; source: string; license: string; attribution: string};
};

export type VideoProps = {
  narrationSrc: string;
  musicSrc: string; // MUSIC_PATH: file in /public, '' to disable
  musicVolume: number; // linear gain in pauses (speech is ~10 dB lower)
  title: string;
  episode: Episode;
  chunks: Chunk[];
  scenes: Scene[];
};
