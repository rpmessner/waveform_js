/**
 * ADSR envelope utilities
 */

import type { EnvelopeParams } from '../types';

/**
 * Apply ADSR envelope to a gain node
 * @returns Total duration of the envelope
 */
export function applyADSR(
  gainNode: GainNode,
  _audioContext: AudioContext,
  params: EnvelopeParams,
  startTime: number
): number {
  const attack = params.attack ?? 0.01;
  const decay = params.decay ?? 0.1;
  const sustain = params.sustain ?? 0.7;
  const release = params.release ?? 0.3;
  const peak = params.peak ?? 1.0;
  const duration = params.duration ?? (attack + decay + 0.1);

  const now = startTime;
  const attackEnd = now + attack;
  const decayEnd = attackEnd + decay;
  const sustainEnd = now + duration;
  const releaseEnd = sustainEnd + release;

  // Start from 0
  gainNode.gain.setValueAtTime(0, now);

  // Attack: ramp to peak
  gainNode.gain.linearRampToValueAtTime(peak, attackEnd);

  // Decay: ramp down to sustain level
  gainNode.gain.linearRampToValueAtTime(sustain * peak, decayEnd);

  // Sustain: hold at sustain level
  gainNode.gain.setValueAtTime(sustain * peak, sustainEnd);

  // Release: ramp down to 0
  gainNode.gain.linearRampToValueAtTime(0, releaseEnd);

  return releaseEnd - now;
}

