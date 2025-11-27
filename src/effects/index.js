/**
 * Effects module
 * Unified interface for all audio effects
 */

import { createReverb, clearReverbCache } from './reverb.js';
import { createDelay, createPingPongDelay } from './delay.js';
import { createFilter, createMultiModeFilter, mapResonanceToQ, FILTER_TYPES } from './filter.js';
import { createDistortion, createBitcrusher, createOverdrive } from './distortion.js';

// Re-export individual effect creators
export {
  createReverb,
  clearReverbCache,
  createDelay,
  createPingPongDelay,
  createFilter,
  createMultiModeFilter,
  mapResonanceToQ,
  FILTER_TYPES,
  createDistortion,
  createBitcrusher,
  createOverdrive
};

/**
 * Check if params contain any effect parameters
 * @param {Object} params - Sound parameters
 * @returns {boolean}
 */
export function hasEffects(params) {
  return (
    params.room !== undefined ||
    params.delay !== undefined ||
    params.shape !== undefined ||
    params.crush !== undefined ||
    params.hcutoff !== undefined ||
    params.bandf !== undefined
  );
}

/**
 * Create an effects chain from parameters
 * Returns null if no effects are specified
 *
 * @param {AudioContext} audioContext - The audio context
 * @param {Object} params - Sound parameters with effect values
 * @param {number} params.room - Reverb wet amount (0-1)
 * @param {number} params.size - Reverb size (0-1)
 * @param {number} params.delay - Delay wet amount (0-1)
 * @param {number} params.delaytime - Delay time in seconds
 * @param {number} params.delayfeedback - Delay feedback (0-1)
 * @param {number} params.shape - Distortion amount (0-1)
 * @param {number} params.crush - Bitcrusher depth (1-16)
 * @param {number} params.hcutoff - Highpass cutoff Hz
 * @param {number} params.bandf - Bandpass center frequency Hz
 * @param {number} params.bandq - Bandpass Q
 * @returns {Object|null} { input, output, effects[] } or null
 */
export function createEffectsChain(audioContext, params = {}) {
  const effects = [];
  const nodes = [];

  // Order: Filter -> Distortion -> Delay -> Reverb
  // (This is a common effects chain order)

  // 1. Additional filters (hcutoff, bandf)
  // Note: Basic cutoff/resonance are handled in oscillator/sampler
  if (params.hcutoff !== undefined || params.bandf !== undefined) {
    const filter = createMultiModeFilter(audioContext, {
      hcutoff: params.hcutoff,
      bandf: params.bandf,
      bandq: params.bandq
    });
    if (filter) {
      effects.push({ type: 'filter', ...filter });
      nodes.push(filter);
    }
  }

  // 2. Distortion/Bitcrusher
  if (params.crush !== undefined && params.crush < 16) {
    const crusher = createBitcrusher(audioContext, params);
    if (crusher) {
      effects.push({ type: 'bitcrusher', ...crusher });
      nodes.push(crusher);
    }
  }

  if (params.shape !== undefined && params.shape > 0) {
    const dist = createDistortion(audioContext, params);
    if (dist) {
      effects.push({ type: 'distortion', ...dist });
      nodes.push(dist);
    }
  }

  // 3. Delay
  if (params.delay !== undefined && params.delay > 0) {
    const delay = createDelay(audioContext, params);
    if (delay) {
      effects.push({ type: 'delay', ...delay });
      nodes.push(delay);
    }
  }

  // 4. Reverb
  if (params.room !== undefined && params.room > 0) {
    const reverb = createReverb(audioContext, params);
    if (reverb) {
      effects.push({ type: 'reverb', ...reverb });
      nodes.push(reverb);
    }
  }

  // If no effects, return null
  if (nodes.length === 0) {
    return null;
  }

  // Create input and output gain nodes
  const input = audioContext.createGain();
  const output = audioContext.createGain();

  // Chain effects together
  let lastNode = input;
  for (const node of nodes) {
    lastNode.connect(node.input);
    lastNode = node.output;
  }
  lastNode.connect(output);

  return {
    input,
    output,
    effects,
    /**
     * Disconnect all effect nodes
     */
    disconnect() {
      try {
        input.disconnect();
        output.disconnect();
        for (const effect of effects) {
          if (effect.input) effect.input.disconnect();
          if (effect.output) effect.output.disconnect();
        }
      } catch (e) {
        // Already disconnected
      }
    }
  };
}

/**
 * Apply effects chain between source and destination
 * If no effects, connects source directly to destination
 *
 * @param {AudioContext} audioContext
 * @param {AudioNode} source - Source node to process
 * @param {AudioNode} destination - Final destination
 * @param {Object} params - Effect parameters
 * @returns {Object|null} Effects chain or null if no effects
 */
export function applyEffects(audioContext, source, destination, params) {
  const chain = createEffectsChain(audioContext, params);

  if (chain) {
    source.connect(chain.input);
    chain.output.connect(destination);
    return chain;
  } else {
    source.connect(destination);
    return null;
  }
}
