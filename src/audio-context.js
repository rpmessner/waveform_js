/**
 * Manages the Web Audio API AudioContext lifecycle
 * Handles browser autoplay policy and state management
 */

let audioContext = null;
let masterGain = null;
let analyser = null;
let state = 'uninitialized'; // 'uninitialized', 'suspended', 'running', 'closed'

/**
 * Initialize the audio context
 * Must be called from a user gesture (click, keypress, etc.)
 * @param {Object} options - AudioContext options
 * @returns {Promise<AudioContext>} The initialized audio context
 */
export async function init(options = {}) {
  if (audioContext && state !== 'closed') {
    console.warn('AudioContext already initialized');
    return audioContext;
  }

  // Create audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)(options);

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
  state = audioContext.state;

  // Resume if needed (handles autoplay policy)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
    state = 'running';
  }

  // Listen for state changes
  audioContext.addEventListener('statechange', () => {
    state = audioContext.state;
  });

  return audioContext;
}

/**
 * Get the current audio context
 * @returns {AudioContext|null} The audio context or null if not initialized
 */
export function getContext() {
  return audioContext;
}

/**
 * Get the master gain node
 * @returns {GainNode|null} The master gain node or null if not initialized
 */
export function getMasterGain() {
  return masterGain;
}

/**
 * Get the current state
 * @returns {string} Current state
 */
export function getState() {
  return state;
}

/**
 * Suspend the audio context (pause audio processing)
 * @returns {Promise<void>}
 */
export async function suspend() {
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
 * @returns {Promise<void>}
 */
export async function resume() {
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
 * @returns {Promise<void>}
 */
export async function close() {
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
 * @param {number} gain - Gain value (0-2, default 1)
 * @param {number} rampTime - Time to ramp to new value in seconds (default: 0.01)
 */
export function setMasterGain(gain, rampTime = 0.01) {
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
 * @returns {number} Current master gain
 */
export function getMasterGainValue() {
  if (!masterGain) {
    throw new Error('AudioContext not initialized');
  }
  return masterGain.gain.value;
}

/**
 * Get the analyser node for visualizations
 * @returns {AnalyserNode|null} The analyser node or null if not initialized
 */
export function getAnalyser() {
  return analyser;
}

/**
 * Get frequency data from the analyser
 * @returns {Uint8Array|null} Frequency data array or null if not initialized
 */
export function getFrequencyData() {
  if (!analyser) return null;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  return data;
}

/**
 * Get time domain (waveform) data from the analyser
 * @returns {Uint8Array|null} Time domain data array or null if not initialized
 */
export function getTimeDomainData() {
  if (!analyser) return null;
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  return data;
}
