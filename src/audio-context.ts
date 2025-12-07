/**
 * Manages the Web Audio API AudioContext lifecycle
 * Handles browser autoplay policy and state management
 */

import type { AudioContextState, WaveformOptions } from './types';

// Extend Window for webkit prefix
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let state: AudioContextState = 'uninitialized';

/**
 * Initialize the audio context
 * Must be called from a user gesture (click, keypress, etc.)
 */
export async function init(options: WaveformOptions = {}): Promise<AudioContext> {
  if (audioContext && state !== 'closed') {
    console.warn('AudioContext already initialized');
    return audioContext;
  }

  // Create audio context
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContextClass(options);

  // Create master gain node
  masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(1.0, audioContext.currentTime);
  masterGain.connect(audioContext.destination);

  // Create analyser node for visualizations (taps master output)
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  masterGain.connect(analyser);

  // Update state
  state = audioContext.state as AudioContextState;

  // Resume if needed (handles autoplay policy)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
    state = 'running';
  }

  // Listen for state changes
  audioContext.addEventListener('statechange', () => {
    if (audioContext) {
      state = audioContext.state as AudioContextState;
    }
  });

  return audioContext;
}

/**
 * Get the current audio context
 */
export function getContext(): AudioContext | null {
  return audioContext;
}

/**
 * Get the master gain node
 */
export function getMasterGain(): GainNode | null {
  return masterGain;
}

/**
 * Get the current state
 */
export function getState(): AudioContextState {
  return state;
}

/**
 * Suspend the audio context (pause audio processing)
 */
export async function suspend(): Promise<void> {
  if (!audioContext) {
    throw new Error('AudioContext not initialized');
  }

  if (audioContext.state === 'running') {
    await audioContext.suspend();
    state = 'suspended';
  }
}

/**
 * Resume the audio context
 */
export async function resume(): Promise<void> {
  if (!audioContext) {
    throw new Error('AudioContext not initialized');
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
    state = 'running';
  }
}

/**
 * Close the audio context
 */
export async function close(): Promise<void> {
  if (!audioContext) {
    throw new Error('AudioContext not initialized');
  }

  await audioContext.close();
  state = 'closed';
  audioContext = null;
  masterGain = null;
  analyser = null;
}

/**
 * Set the master gain (volume)
 */
export function setMasterGain(gain: number, rampTime: number = 0.01): void {
  if (!masterGain || !audioContext) {
    throw new Error('AudioContext not initialized');
  }

  const now = audioContext.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(gain, now + rampTime);
}

/**
 * Get the current master gain value
 */
export function getMasterGainValue(): number {
  if (!masterGain) {
    throw new Error('AudioContext not initialized');
  }
  return masterGain.gain.value;
}

/**
 * Get the analyser node for visualizations
 */
export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

/**
 * Get frequency data from the analyser
 */
export function getFrequencyData(): Uint8Array | null {
  if (!analyser) return null;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  return data;
}

/**
 * Get time domain (waveform) data from the analyser
 */
export function getTimeDomainData(): Uint8Array | null {
  if (!analyser) return null;
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  return data;
}
