/**
 * Effects module
 * Unified interface for all audio effects
 */

import { createReverb, clearReverbCache } from './reverb';
import { createDelay, createPingPongDelay } from './delay';
import { createFilter, createMultiModeFilter, mapResonanceToQ, FILTER_TYPES } from './filter';
import { createDistortion, createBitcrusher, createOverdrive } from './distortion';
import type { SoundParams, EffectChain, EffectNode } from '../types';

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
 */
export function hasEffects(params: SoundParams): boolean {
  return (
    params.room !== undefined ||
    params.delay !== undefined ||
    params.shape !== undefined ||
    params.crush !== undefined ||
    params.hcutoff !== undefined ||
    params.bandf !== undefined
  );
}

interface EffectNodeWithIO {
  input: GainNode | AudioNode;
  output: GainNode | AudioNode;
}

/**
 * Create an effects chain from parameters
 * Returns null if no effects are specified
 */
export function createEffectsChain(
  audioContext: AudioContext,
  params: SoundParams = {}
): EffectChain | null {
  const effects: EffectNode[] = [];
  const nodes: EffectNodeWithIO[] = [];

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
      effects.push({ type: 'filter', input: filter.input, output: filter.output });
      nodes.push(filter);
    }
  }

  // 2. Distortion/Bitcrusher
  if (params.crush !== undefined && params.crush < 16) {
    const crusher = createBitcrusher(audioContext, params);
    if (crusher) {
      effects.push({ type: 'bitcrusher', input: crusher.input, output: crusher.output });
      nodes.push(crusher);
    }
  }

  if (params.shape !== undefined && params.shape > 0) {
    const dist = createDistortion(audioContext, params);
    if (dist) {
      effects.push({ type: 'distortion', input: dist.input, output: dist.output });
      nodes.push(dist);
    }
  }

  // 3. Delay
  if (params.delay !== undefined && params.delay > 0) {
    const delay = createDelay(audioContext, params);
    if (delay) {
      effects.push({ type: 'delay', input: delay.input, output: delay.output });
      nodes.push(delay);
    }
  }

  // 4. Reverb
  if (params.room !== undefined && params.room > 0) {
    const reverb = createReverb(audioContext, params);
    if (reverb) {
      effects.push({ type: 'reverb', input: reverb.input, output: reverb.output });
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
  let lastNode: AudioNode = input;
  for (const node of nodes) {
    lastNode.connect(node.input as AudioNode);
    lastNode = node.output as AudioNode;
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
          if (effect.input) (effect.input as AudioNode).disconnect();
          if (effect.output) (effect.output as AudioNode).disconnect();
        }
      } catch (_e) {
        // Already disconnected
      }
    }
  };
}

/**
 * Apply effects chain between source and destination
 * If no effects, connects source directly to destination
 */
export function applyEffects(
  audioContext: AudioContext,
  source: AudioNode,
  destination: AudioNode,
  params: SoundParams
): EffectChain | null {
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
