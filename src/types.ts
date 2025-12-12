/**
 * Shared types for waveform-js
 */

/** SuperDirt-compatible sound parameters */
export interface SoundParams {
  /** Sample/synth name */
  s?: string;
  /** Sample variant number */
  n?: number;
  /** MIDI note number (0-127) */
  note?: number;
  /** Base note for sample pitch calculation */
  baseNote?: number;
  /** Frequency in Hz (alternative to note) */
  freq?: number;
  /** Volume (0.0-2.0, default 1.0) */
  gain?: number;
  /** Amplitude (0.0-1.0, default 0.5) */
  amp?: number;
  /** Stereo position (-1.0 to 1.0) */
  pan?: number;
  /** Playback speed (0.125-4.0, default 1.0) */
  speed?: number;
  /** Sample start position (0.0-1.0) */
  begin?: number;
  /** Sample end position (0.0-1.0) */
  end?: number;
  /** Filter cutoff frequency (Hz) */
  cutoff?: number;
  /** Low-pass filter frequency */
  lpf?: number;
  /** High-pass filter frequency */
  hpf?: number;
  /** High-pass cutoff frequency */
  hcutoff?: number;
  /** Bandpass filter frequency */
  bandf?: number;
  /** Bandpass Q */
  bandq?: number;
  /** Filter resonance (0.0-1.0) */
  resonance?: number;
  /** Reverb amount (0.0-1.0) */
  room?: number;
  /** Reverb size */
  size?: number;
  /** Delay amount (0.0-1.0) */
  delay?: number;
  /** Delay time in seconds */
  delaytime?: number;
  /** Delay feedback (0.0-1.0) */
  delayfeedback?: number;
  /** Attack time */
  attack?: number;
  /** Decay time */
  decay?: number;
  /** Sustain level */
  sustain?: number;
  /** Release time */
  release?: number;
  /** Duration in seconds */
  dur?: number;
  /** Explicit duration */
  duration?: number;
  /** Distortion/shape amount */
  shape?: number;
  /** Bit crush amount */
  crush?: number;
  /** Coarse (sample rate reduction) */
  coarse?: number;
  /** Vowel filter */
  vowel?: string;
  /** Orbit/channel number */
  orbit?: number;
  /** Cut group */
  cut?: number;
  /** Oscillator type */
  type?: OscillatorType;
  /** FM preset name */
  preset?: string;
  /** FM modulation index override */
  fm?: number;
  /** FM harmonicity (modulator ratio) override */
  fmh?: number;
  /** Distortion type */
  distortionType?: 'soft' | 'hard';
  /** Filter type override */
  filterType?: BiquadFilterType;
  /** Peak level for envelope */
  peak?: number;
  /** Drive amount for overdrive */
  drive?: number;
  /** Tone control */
  tone?: number;
}

/** Time interval with begin/end */
export interface TimeSpan {
  begin: number;
  end: number;
}

/** Source location for editor highlighting */
export interface SourceLocation {
  start: number;
  end: number;
}

/** Hap context with metadata */
export interface HapContext {
  locations: SourceLocation[];
  tags: string[];
}

/** Hap - a happening in a pattern (Strudel-compatible format) */
export interface Hap {
  /** True event extent, null for continuous signals */
  whole: TimeSpan | null;
  /** Portion intersecting the query window */
  part: TimeSpan;
  /** Sound parameters (s, n, note, gain, pan, etc.) */
  value: SoundParams & Record<string, unknown>;
  /** Metadata (source locations, tags) */
  context: HapContext;
}

/** Query function for dynamic patterns - returns Haps */
export type HapQueryFn = (cycle: number) => Hap[];

/** Get onset time from a Hap */
export const getHapOnset = (hap: Hap): number =>
  hap.whole?.begin ?? hap.part.begin;

/** Get duration from a Hap */
export const getHapDuration = (hap: Hap): number =>
  hap.part.end - hap.part.begin;

/** Scheduler configuration */
export interface SchedulerConfig {
  /** How far ahead to schedule (seconds) */
  lookahead?: number;
  /** How often to check for events (ms) */
  scheduleInterval?: number;
  /** Cycles per second (default 0.5 = 120 BPM) */
  cps?: number;
}

/** Waveform options */
export interface WaveformOptions {
  /** Scheduler configuration */
  scheduler?: SchedulerConfig;
  /** AudioContext options */
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory | number;
}

/** Callback unsubscribe function */
export type Unsubscribe = () => void;

/** Play function signature for scheduler */
export type PlayFn = (params: SoundParams, startTime: number) => void;

/** Progress callback for sample loading */
export type ProgressCallback = (loaded: number, total: number, name: string, error?: Error) => void;

/** ADSR envelope parameters */
export interface EnvelopeParams {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  duration?: number;
  peak?: number;
}

/** Effect chain interface */
export interface EffectChain {
  input: GainNode;
  output: GainNode;
  effects: EffectNode[];
  disconnect: () => void;
}

/** Generic effect node interface */
export interface EffectNode {
  type: string;
  input: GainNode | AudioNode;
  output: GainNode | AudioNode;
  [key: string]: unknown;
}

/** Audio nodes returned from play functions */
export interface PlaybackNodes {
  source?: AudioBufferSourceNode;
  oscillator?: OscillatorNode;
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  panNode?: StereoPannerNode;
  effectsChain?: EffectChain | null;
  stopTime: number;
  releaseTime?: number;
}

/** FM synth nodes */
export interface FMPlaybackNodes extends PlaybackNodes {
  carrier: OscillatorNode;
  modulator: OscillatorNode;
  modulator2?: OscillatorNode;
  carrierGain: GainNode;
  outputGain: GainNode;
}

/** Oscillator playback nodes */
export interface OscillatorPlaybackNodes extends PlaybackNodes {
  oscillator: OscillatorNode;
}

/** Sample manager interface */
export interface SampleManager {
  init: (ctx: AudioContext) => void;
  load: (name: string, url: string) => Promise<AudioBuffer>;
  loadMultiple: (sampleMap: Record<string, string>) => Promise<Record<string, AudioBuffer>>;
  loadWithProgress: (sampleMap: Record<string, string>, onProgress: ProgressCallback) => Promise<Record<string, AudioBuffer>>;
  loadBank: (manifestUrl: string, onProgress?: ProgressCallback) => Promise<Record<string, AudioBuffer>>;
  get: (name: string, n?: number | null) => AudioBuffer | null;
  has: (name: string, n?: number | null) => boolean;
  list: () => string[];
  count: () => number;
  remove: (name: string) => boolean;
  clear: () => void;
  getByPrefix: (prefix: string) => Record<string, AudioBuffer>;
  getVariantCount: (name: string) => number;
}

/** Scheduler instance interface */
export interface SchedulerInstance {
  getCps: () => number;
  setCps: (cps: number) => void;
  getBpm: () => number;
  setBpm: (bpm: number) => void;
  getCurrentCycle: () => number;
  getCurrentCycleNumber: () => number;
  schedulePattern: (id: string, hapsOrQueryFn: Hap[] | HapQueryFn) => void;
  updatePattern: (id: string, hapsOrQueryFn: Hap[] | HapQueryFn) => void;
  stopPattern: (id: string) => boolean;
  hush: () => void;
  getPatternIds: () => string[];
  hasPattern: (id: string) => boolean;
  getPattern: (id: string) => { queryFn: HapQueryFn | null; haps: Hap[] | null } | undefined;
  getPatterns: () => Map<string, { queryFn: HapQueryFn | null; haps: Hap[] | null }>;
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  onCycle: (callback: (cycle: number) => void) => Unsubscribe;
  onHap: (callback: (hap: Hap, startTime: number, cycle: number) => void) => Unsubscribe;
  onStart: (callback: () => void) => Unsubscribe;
  onStop: (callback: () => void) => Unsubscribe;
  dispose: () => void;
}

/** Waveform instance interface */
export interface WaveformInstance {
  init: () => Promise<WaveformInstance>;
  play: (params: SoundParams, startTime?: number | null) => PlaybackNodes;
  suspend: () => Promise<void>;
  resume: () => Promise<void>;
  close: () => Promise<void>;
  getContext: () => AudioContext | null;
  getState: () => string;
  setMasterGain: (gain: number, rampTime?: number) => void;
  getMasterGain: () => number;
  getAnalyser: () => AnalyserNode | null;
  getFrequencyData: () => Uint8Array | null;
  getTimeDomainData: () => Uint8Array | null;
  loadSample: (name: string, url: string) => Promise<AudioBuffer>;
  loadSamples: (samples: Record<string, string>) => Promise<Record<string, AudioBuffer>>;
  loadSamplesWithProgress: (samples: Record<string, string>, onProgress: ProgressCallback) => Promise<Record<string, AudioBuffer>>;
  loadSampleBank: (manifestUrl: string, onProgress?: ProgressCallback) => Promise<Record<string, AudioBuffer>>;
  getSamples: () => SampleManager;
  getScheduler: () => SchedulerInstance | null;
  schedulePattern: (id: string, hapsOrQueryFn: Hap[] | HapQueryFn) => void;
  updatePattern: (id: string, hapsOrQueryFn: Hap[] | HapQueryFn) => void;
  stopPattern: (id: string) => boolean;
  hush: () => void;
  startScheduler: () => void;
  stopScheduler: () => void;
  isSchedulerRunning: () => boolean;
  setCps: (cps: number) => void;
  getCps: () => number;
  setBpm: (bpm: number) => void;
  getBpm: () => number;
  getCurrentCycle: () => number;
  onCycle: (callback: (cycle: number) => void) => Unsubscribe;
  onHap: (callback: (hap: Hap, startTime: number, cycle: number) => void) => Unsubscribe;
}

/** Audio context state */
export type AudioContextState = 'uninitialized' | 'suspended' | 'running' | 'closed';

/** FM preset configuration */
export interface FMPreset {
  carrier: { ratio: number; level: number };
  modulator: { ratio: number; index: number; indexDecay: number };
  modulator2?: { ratio: number; index: number; indexDecay: number };
  envelope: EnvelopeParams;
}

/** Sample bank manifest */
export interface SampleBankManifest {
  baseUrl?: string;
  samples: Record<string, string[]>;
}

/** Reverb effect nodes */
export interface ReverbNodes {
  input: GainNode;
  output: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
  convolver: ConvolverNode;
}

/** Delay effect nodes */
export interface DelayNodes {
  input: GainNode;
  output: GainNode;
  delayNode: DelayNode;
  feedbackGain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
}

/** Distortion effect nodes */
export interface DistortionNodes {
  input: GainNode;
  output: GainNode;
  waveshaper: WaveShaperNode;
  makeupGain?: GainNode;
}

/** Filter result */
export interface FilterResult {
  filter: BiquadFilterNode;
  type: BiquadFilterType;
}
