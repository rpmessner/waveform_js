/**
 * Sample playback synth
 * Plays AudioBuffer sources with SuperDirt-compatible parameters
 */

import { applyADSR } from './envelope.js';
import { applyEffects, hasEffects } from '../effects/index.js';

/**
 * Play a sample (AudioBuffer) with parameters
 * @param {AudioContext} audioContext - The audio context
 * @param {AudioNode} destination - The destination node (usually master gain)
 * @param {AudioBuffer} audioBuffer - The sample to play
 * @param {Object} params - Playback parameters
 * @param {number} params.speed - Playback rate/speed (default: 1.0)
 * @param {number} params.begin - Start position 0.0-1.0 (default: 0.0)
 * @param {number} params.end - End position 0.0-1.0 (default: 1.0)
 * @param {number} params.gain - Volume 0-2 (default: 1.0)
 * @param {number} params.amp - Amplitude 0-1 (default: 0.5)
 * @param {number} params.pan - Stereo pan -1 to 1 (default: 0)
 * @param {number} params.attack - Envelope attack in seconds
 * @param {number} params.decay - Envelope decay in seconds
 * @param {number} params.sustain - Envelope sustain level 0-1
 * @param {number} params.release - Envelope release in seconds
 * @param {number} params.cutoff - Filter cutoff frequency in Hz
 * @param {number} params.resonance - Filter resonance 0-1
 * @param {number} startTime - When to start playback (audio context time)
 * @returns {Object} Created audio nodes for potential manipulation
 */
export function playSample(audioContext, destination, audioBuffer, params = {}, startTime = null) {
  const now = audioContext.currentTime;
  const start = startTime !== null ? startTime : now;

  // Extract parameters with defaults
  const speed = params.speed ?? 1.0;
  const begin = params.begin ?? 0.0;
  const end = params.end ?? 1.0;
  const gain = params.gain ?? 1.0;
  const amp = params.amp ?? 0.5;
  const pan = params.pan ?? 0.0;

  // Calculate sample duration
  const sampleDuration = audioBuffer.duration;
  const startOffset = begin * sampleDuration;
  const endOffset = end * sampleDuration;
  const playDuration = (endOffset - startOffset) / Math.abs(speed);

  // Create source node
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = speed;

  // Create gain node
  const gainNode = audioContext.createGain();
  const totalGain = gain * amp;

  // Check if we have envelope parameters
  const hasEnvelope = params.attack !== undefined ||
                      params.decay !== undefined ||
                      params.sustain !== undefined ||
                      params.release !== undefined;

  let releaseTime = 0;
  let stopTime = start + playDuration;

  if (hasEnvelope) {
    // Use ADSR envelope
    const envelopeParams = {
      attack: params.attack,
      decay: params.decay,
      sustain: params.sustain,
      release: params.release,
      duration: playDuration
    };

    const envelope = applyADSR(gainNode.gain, totalGain, envelopeParams, start);
    releaseTime = envelope.releaseTime;
    stopTime = envelope.stopTime;
  } else {
    // No envelope - just set constant gain
    gainNode.gain.setValueAtTime(totalGain, start);
  }

  // Create panner for stereo positioning
  const panNode = audioContext.createStereoPanner();
  panNode.pan.setValueAtTime(pan, start);

  // Create filter if cutoff is specified
  let filterNode = null;
  if (params.cutoff !== undefined) {
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(params.cutoff, start);

    if (params.resonance !== undefined) {
      // Map 0-1 resonance to 0.0001-20 Q value
      const q = 0.0001 + (params.resonance * 19.9999);
      filterNode.Q.setValueAtTime(q, start);
    }
  }

  // Connect nodes
  source.connect(gainNode);

  if (filterNode) {
    gainNode.connect(filterNode);
    filterNode.connect(panNode);
  } else {
    gainNode.connect(panNode);
  }

  // Apply effects chain if any effect parameters are present
  let effectsChain = null;
  if (hasEffects(params)) {
    effectsChain = applyEffects(audioContext, panNode, destination, params);
  } else {
    panNode.connect(destination);
  }

  // Schedule playback
  if (begin > 0 || end < 1) {
    // Play a slice of the sample
    source.start(start, startOffset, endOffset - startOffset);
  } else {
    // Play entire sample
    source.start(start);
  }

  // Schedule cleanup after release completes
  const cleanupTime = stopTime + 0.1; // Small buffer after stop time
  source.stop(stopTime);

  setTimeout(() => {
    try {
      source.disconnect();
      gainNode.disconnect();
      panNode.disconnect();
      if (filterNode) {
        filterNode.disconnect();
      }
      if (effectsChain) {
        effectsChain.disconnect();
      }
    } catch (e) {
      // Already disconnected, ignore
    }
  }, (cleanupTime - now) * 1000);

  return {
    source,
    gainNode,
    panNode,
    filterNode,
    effectsChain,
    stopTime,
    releaseTime
  };
}

/**
 * Convenience function to play a sample with note parameter
 * Note parameter adjusts playback speed to pitch the sample
 * @param {AudioContext} audioContext - The audio context
 * @param {AudioNode} destination - The destination node
 * @param {AudioBuffer} audioBuffer - The sample to play
 * @param {Object} params - Playback parameters (includes note)
 * @param {number} startTime - When to start playback
 * @returns {Object} Created audio nodes
 */
export function playSampleWithNote(audioContext, destination, audioBuffer, params = {}, startTime = null) {
  // If note parameter is specified, calculate speed from it
  // Assume sample is recorded at C4 (MIDI note 60) by default
  const baseNote = params.baseNote ?? 60;
  const note = params.note;

  if (note !== undefined && note !== null) {
    // Calculate speed from note
    // Each semitone is 2^(1/12) ratio
    const semitoneOffset = note - baseNote;
    const calculatedSpeed = Math.pow(2, semitoneOffset / 12);

    // Multiply by any explicit speed parameter
    const explicitSpeed = params.speed ?? 1.0;
    params = {
      ...params,
      speed: calculatedSpeed * explicitSpeed
    };
  }

  return playSample(audioContext, destination, audioBuffer, params, startTime);
}
