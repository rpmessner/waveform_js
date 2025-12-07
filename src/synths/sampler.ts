/**
 * Sample playback synth
 * Plays AudioBuffer sources with SuperDirt-compatible parameters
 */

import { applyEffects, hasEffects } from '../effects/index';
import type { SoundParams, PlaybackNodes, EffectChain } from '../types';

interface EnvelopeResult {
  releaseTime: number;
  stopTime: number;
}

/**
 * Apply ADSR envelope to gain parameter
 */
function applyADSR(
  gainParam: AudioParam,
  totalGain: number,
  params: { attack?: number; decay?: number; sustain?: number; release?: number; duration?: number },
  startTime: number
): EnvelopeResult {
  const attack = params.attack ?? 0.01;
  const decay = params.decay ?? 0.1;
  const sustain = params.sustain ?? 0.7;
  const release = params.release ?? 0.3;
  const duration = params.duration ?? (attack + decay + 0.1);

  const attackEnd = startTime + attack;
  const decayEnd = attackEnd + decay;
  const sustainEnd = startTime + duration;
  const releaseEnd = sustainEnd + release;

  gainParam.setValueAtTime(0, startTime);
  gainParam.linearRampToValueAtTime(totalGain, attackEnd);
  gainParam.linearRampToValueAtTime(sustain * totalGain, decayEnd);
  gainParam.setValueAtTime(sustain * totalGain, sustainEnd);
  gainParam.linearRampToValueAtTime(0, releaseEnd);

  return {
    releaseTime: release,
    stopTime: releaseEnd
  };
}

/**
 * Play a sample (AudioBuffer) with parameters
 */
export function playSample(
  audioContext: AudioContext,
  destination: AudioNode,
  audioBuffer: AudioBuffer,
  params: SoundParams = {},
  startTime: number | null = null
): PlaybackNodes {
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
    gainNode.gain.setValueAtTime(totalGain, start);
  }

  // Create panner for stereo positioning
  const panNode = audioContext.createStereoPanner();
  panNode.pan.setValueAtTime(pan, start);

  // Create filter if cutoff is specified
  let filterNode: BiquadFilterNode | undefined;
  if (params.cutoff !== undefined) {
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(params.cutoff, start);

    if (params.resonance !== undefined) {
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
  let effectsChain: EffectChain | null = null;
  if (hasEffects(params)) {
    effectsChain = applyEffects(audioContext, panNode, destination, params);
  } else {
    panNode.connect(destination);
  }

  // Schedule playback
  if (begin > 0 || end < 1) {
    source.start(start, startOffset, endOffset - startOffset);
  } else {
    source.start(start);
  }

  // Schedule cleanup after release completes
  const cleanupTime = stopTime + 0.1;
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
    } catch (_e) {
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
 */
export function playSampleWithNote(
  audioContext: AudioContext,
  destination: AudioNode,
  audioBuffer: AudioBuffer,
  params: SoundParams = {},
  startTime: number | null = null
): PlaybackNodes {
  // If note parameter is specified, calculate speed from it
  // Assume sample is recorded at C4 (MIDI note 60) by default
  const baseNote = params.baseNote ?? 60;
  const note = params.note;

  let adjustedParams = params;

  if (note !== undefined && note !== null) {
    // Calculate speed from note
    const semitoneOffset = note - baseNote;
    const calculatedSpeed = Math.pow(2, semitoneOffset / 12);

    // Multiply by any explicit speed parameter
    const explicitSpeed = params.speed ?? 1.0;
    adjustedParams = {
      ...params,
      speed: calculatedSpeed * explicitSpeed
    };
  }

  return playSample(audioContext, destination, audioBuffer, adjustedParams, startTime);
}
