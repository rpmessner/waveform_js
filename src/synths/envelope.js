/**
 * Apply ADSR envelope to a gain node
 * @param {GainNode} gainNode - The gain node to apply envelope to
 * @param {AudioContext} audioContext - The audio context
 * @param {Object} params - Envelope parameters
 * @param {number} params.attack - Attack time in seconds (default: 0.01)
 * @param {number} params.decay - Decay time in seconds (default: 0.1)
 * @param {number} params.sustain - Sustain level 0-1 (default: 0.7)
 * @param {number} params.release - Release time in seconds (default: 0.3)
 * @param {number} params.peak - Peak level during attack (default: 1.0)
 * @param {number} startTime - When to start the envelope (audio context time)
 * @returns {number} Total duration of the envelope
 */
export function applyADSR(gainNode, audioContext, params, startTime) {
  const attack = params.attack ?? 0.01;
  const decay = params.decay ?? 0.1;
  const sustain = params.sustain ?? 0.7;
  const release = params.release ?? 0.3;
  const peak = params.peak ?? 1.0;
  const duration = params.duration ?? (attack + decay + 0.1); // Default short note

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

/**
 * Apply a simple exponential decay envelope
 * Useful for percussion sounds
 * @param {GainNode} gainNode - The gain node
 * @param {AudioContext} audioContext - The audio context
 * @param {number} decayTime - Decay time in seconds
 * @param {number} startTime - Start time
 * @returns {number} Duration
 */
export function applyDecay(gainNode, audioContext, decayTime = 0.3, startTime) {
  const now = startTime;

  gainNode.gain.setValueAtTime(1, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

  return decayTime;
}
