import { noteToFreq } from '../utils/note-to-freq.js';
import { clamp } from '../utils/db-to-gain.js';
import { applyADSR } from './envelope.js';
import { applyEffects, hasEffects } from '../effects/index.js';

/**
 * Create and play an oscillator synth
 * @param {AudioContext} audioContext - The audio context
 * @param {AudioNode} destination - Where to connect the output
 * @param {Object} params - Synth parameters
 * @param {string} params.type - Oscillator type: 'sine', 'square', 'sawtooth', 'triangle'
 * @param {number} params.note - MIDI note number (0-127)
 * @param {number} params.freq - Frequency in Hz (alternative to note)
 * @param {number} params.amp - Amplitude 0-1 (default: 0.5)
 * @param {number} params.gain - Gain multiplier (default: 1.0)
 * @param {number} params.pan - Stereo pan -1 to 1 (default: 0)
 * @param {number} params.attack - Attack time in seconds
 * @param {number} params.decay - Decay time in seconds
 * @param {number} params.sustain - Sustain level 0-1
 * @param {number} params.release - Release time in seconds
 * @param {number} params.duration - Total note duration in seconds
 * @param {number} params.cutoff - Filter cutoff frequency in Hz
 * @param {number} params.resonance - Filter resonance/Q 0-1
 * @param {number} startTime - When to start (audio context time, default: now)
 */
export function playOscillator(audioContext, destination, params, startTime = null) {
  const now = startTime ?? audioContext.currentTime;

  // Get frequency
  let frequency;
  if (params.freq !== undefined) {
    frequency = params.freq;
  } else if (params.note !== undefined) {
    frequency = noteToFreq(params.note);
  } else {
    frequency = 440; // Default A4
  }

  // Create oscillator
  const osc = audioContext.createOscillator();
  osc.type = params.type || 'sine';
  osc.frequency.setValueAtTime(frequency, now);

  // Create gain node for amplitude
  const gainNode = audioContext.createGain();
  const amp = clamp(params.amp ?? 0.5, 0, 1);
  const gain = params.gain ?? 1.0;
  const totalGain = amp * gain;

  // Create filter if cutoff is specified
  let filterNode = null;
  if (params.cutoff !== undefined) {
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(params.cutoff, now);

    if (params.resonance !== undefined) {
      // Map resonance 0-1 to Q value 0.0001-30
      const q = 0.0001 + (params.resonance * 29.9999);
      filterNode.Q.setValueAtTime(q, now);
    }
  }

  // Create panner if pan is specified
  let panNode = null;
  if (params.pan !== undefined && params.pan !== 0) {
    panNode = audioContext.createStereoPanner();
    panNode.pan.setValueAtTime(clamp(params.pan, -1, 1), now);
  }

  // Connect nodes
  let currentNode = osc;

  if (filterNode) {
    currentNode.connect(filterNode);
    currentNode = filterNode;
  }

  currentNode.connect(gainNode);
  currentNode = gainNode;

  if (panNode) {
    currentNode.connect(panNode);
    currentNode = panNode;
  }

  // Apply effects chain if any effect parameters are present
  let effectsChain = null;
  if (hasEffects(params)) {
    effectsChain = applyEffects(audioContext, currentNode, destination, params);
  } else {
    currentNode.connect(destination);
  }

  // Apply ADSR envelope
  const envelopeParams = {
    attack: params.attack,
    decay: params.decay,
    sustain: params.sustain,
    release: params.release,
    duration: params.duration,
    peak: totalGain
  };

  const totalDuration = applyADSR(gainNode, audioContext, envelopeParams, now);

  // Start and stop oscillator
  osc.start(now);
  osc.stop(now + totalDuration);

  // Cleanup after sound finishes
  osc.onended = () => {
    if (filterNode) filterNode.disconnect();
    if (panNode) panNode.disconnect();
    if (effectsChain) effectsChain.disconnect();
    gainNode.disconnect();
    osc.disconnect();
  };

  return {
    oscillator: osc,
    gainNode,
    filterNode,
    panNode,
    effectsChain,
    stopTime: now + totalDuration
  };
}

/**
 * Synth types mapping
 */
export const SYNTH_TYPES = {
  sine: 'sine',
  saw: 'sawtooth',
  sawtooth: 'sawtooth',
  square: 'square',
  tri: 'triangle',
  triangle: 'triangle'
};
