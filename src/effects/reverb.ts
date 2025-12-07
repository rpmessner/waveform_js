/**
 * Reverb effect using ConvolverNode
 * Generates impulse responses procedurally (no external files needed)
 */

import type { SoundParams, ReverbNodes } from '../types';

/**
 * Generate a simple impulse response for reverb
 */
export function generateImpulseResponse(
  audioContext: AudioContext,
  duration: number = 2.0,
  decay: number = 2.0
): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const buffer = audioContext.createBuffer(2, length, sampleRate);

  const leftChannel = buffer.getChannelData(0);
  const rightChannel = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Exponential decay envelope
    const envelope = Math.exp(-decay * t);
    // Noise with slight stereo variation
    leftChannel[i] = (Math.random() * 2 - 1) * envelope;
    rightChannel[i] = (Math.random() * 2 - 1) * envelope;
  }

  return buffer;
}

/**
 * Map room size (0-1) to impulse response parameters
 */
function roomToParams(room: number): { duration: number; decay: number } {
  // room 0.0 = tiny room (0.3s, fast decay)
  // room 0.5 = medium room (1.5s, medium decay)
  // room 1.0 = large hall (4s, slow decay)
  const duration = 0.3 + room * 3.7;
  const decay = 4 - room * 3;
  return { duration, decay };
}

/**
 * Cache for generated impulse responses
 */
const irCache = new Map<string, AudioBuffer>();

/**
 * Get or create impulse response for given parameters
 */
function getImpulseResponse(
  audioContext: AudioContext,
  room: number,
  size: number | null = null
): AudioBuffer {
  const { duration, decay } = roomToParams(room);
  const actualDuration = size !== null ? size : duration;

  // Cache key based on parameters (rounded for cache efficiency)
  const key = `${Math.round(actualDuration * 10)}_${Math.round(decay * 10)}`;

  if (!irCache.has(key)) {
    irCache.set(key, generateImpulseResponse(audioContext, actualDuration, decay));
  }

  return irCache.get(key)!;
}

/**
 * Create a reverb effect node
 */
export function createReverb(
  audioContext: AudioContext,
  params: SoundParams = {}
): ReverbNodes | null {
  const room = params.room ?? 0;
  const size = params.size ?? null;

  // If room is 0, return a passthrough
  if (room <= 0) {
    return null;
  }

  // Create nodes
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const convolver = audioContext.createConvolver();
  const wetGain = audioContext.createGain();
  const dryGain = audioContext.createGain();

  // Get impulse response
  const ir = getImpulseResponse(audioContext, size ?? room, size);
  convolver.buffer = ir;

  // Set wet/dry mix
  // room parameter controls wet amount (0 = all dry, 1 = all wet)
  wetGain.gain.value = room;
  dryGain.gain.value = 1 - room * 0.5; // Keep some dry signal even at max

  // Connect: input -> dry -> output
  //          input -> convolver -> wet -> output
  input.connect(dryGain);
  input.connect(convolver);
  convolver.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  return {
    input,
    output,
    wetGain,
    dryGain,
    convolver
  };
}

/**
 * Clear the impulse response cache
 */
export function clearReverbCache(): void {
  irCache.clear();
}
