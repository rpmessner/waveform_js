/**
 * waveform-js
 * Web Audio transport layer for browser-based live coding
 */

export { Waveform } from './waveform.js';

// Export utilities for advanced usage
export { noteToFreq, noteNameToFreq } from './utils/note-to-freq.js';
export { dbToGain, gainToDb, clamp } from './utils/db-to-gain.js';
export { bpmToCps, cpsToBpm } from './utils/timing.js';

// For UMD builds, export default as Waveform
export { Waveform as default } from './waveform.js';
