/**
 * waveform-js
 * Web Audio transport layer for browser-based live coding
 */

export { createWaveform } from './waveform';

// Export sample management
export { Samples, createSampleManager } from './samples/index';

// Export scheduler for advanced usage
export { createScheduler } from './scheduler';

// Export effects for advanced usage
export {
  createReverb,
  createDelay,
  createFilter,
  createDistortion,
  createEffectsChain
} from './effects/index';

// Export utilities for advanced usage
export { noteToFreq, noteNameToFreq } from './utils/note-to-freq';
export { dbToGain, gainToDb, clamp } from './utils/db-to-gain';
export { bpmToCps, cpsToBpm } from './utils/timing';

// Export FM synth presets for customization
export { FM_PRESETS, playFMSynth, isFMSynth } from './synths/fm-synth';

// Export types
export type {
  SoundParams,
  TimeSpan,
  SourceLocation,
  HapContext,
  Hap,
  HapQueryFn,
  SchedulerConfig,
  WaveformOptions,
  WaveformInstance,
  SchedulerInstance,
  SampleManager,
  PlaybackNodes,
  EffectChain,
  Unsubscribe,
  PlayFn,
  ProgressCallback
} from './types';

// Export Hap utility functions
export { getHapOnset, getHapDuration } from './types';

// For UMD builds, export default as createWaveform
export { createWaveform as default } from './waveform';
