/**
 * Filter effects using BiquadFilterNode
 * SuperDirt-compatible parameters: cutoff, resonance, hcutoff, bandf, bandq
 */

import type { SoundParams, FilterResult } from '../types';

/**
 * Filter types
 */
export const FILTER_TYPES: Record<string, BiquadFilterType> = {
  lowpass: 'lowpass',
  highpass: 'highpass',
  bandpass: 'bandpass',
  notch: 'notch',
  allpass: 'allpass',
  peaking: 'peaking',
  lowshelf: 'lowshelf',
  highshelf: 'highshelf'
};

interface FilterNodeParams {
  frequency?: number;
  Q?: number;
  gain?: number;
}

/**
 * Create a specific filter node
 */
function createFilterNode(
  audioContext: AudioContext,
  type: BiquadFilterType,
  params: FilterNodeParams
): FilterResult {
  const filter = audioContext.createBiquadFilter();

  filter.type = type;

  if (params.frequency !== undefined) {
    filter.frequency.value = params.frequency;
  }

  if (params.Q !== undefined) {
    filter.Q.value = params.Q;
  }

  if (params.gain !== undefined) {
    filter.gain.value = params.gain;
  }

  return { filter, type };
}

/**
 * Map resonance (0-1) to Q value
 * resonance 0 = Q ~0.7 (no resonance)
 * resonance 1 = Q ~20 (high resonance)
 */
export function mapResonanceToQ(resonance: number): number {
  // Exponential mapping for more musical response
  return 0.7 + Math.pow(resonance, 2) * 19.3;
}

/**
 * Create a filter node
 */
export function createFilter(
  audioContext: AudioContext,
  params: SoundParams = {}
): FilterResult | null {
  const {
    cutoff,
    resonance,
    hcutoff,
    bandf,
    bandq,
    filterType
  } = params;

  // Determine which filter to create based on parameters
  if (filterType) {
    return createFilterNode(audioContext, filterType, params);
  }

  // Priority: bandpass > highpass > lowpass
  if (bandf !== undefined) {
    return createFilterNode(audioContext, 'bandpass', {
      frequency: bandf,
      Q: bandq ?? 1
    });
  }

  if (hcutoff !== undefined) {
    return createFilterNode(audioContext, 'highpass', {
      frequency: hcutoff,
      Q: resonance !== undefined ? mapResonanceToQ(resonance) : 1
    });
  }

  if (cutoff !== undefined) {
    return createFilterNode(audioContext, 'lowpass', {
      frequency: cutoff,
      Q: resonance !== undefined ? mapResonanceToQ(resonance) : 1
    });
  }

  // No filter parameters specified
  return null;
}

/** Multi-mode filter nodes */
export interface MultiModeFilterNodes {
  input: GainNode;
  output: GainNode;
  highpass?: BiquadFilterNode;
  lowpass?: BiquadFilterNode;
}

/**
 * Create a multi-mode filter (lowpass + highpass for bandpass-like effect)
 */
export function createMultiModeFilter(
  audioContext: AudioContext,
  params: SoundParams = {}
): MultiModeFilterNodes | null {
  const { cutoff, hcutoff, resonance } = params;

  // Need at least one cutoff
  if (cutoff === undefined && hcutoff === undefined) {
    return null;
  }

  const input = audioContext.createGain();
  const output = audioContext.createGain();
  let lastNode: AudioNode = input;

  const filters: { highpass?: BiquadFilterNode; lowpass?: BiquadFilterNode } = {};

  // Highpass first (if specified)
  if (hcutoff !== undefined) {
    const hp = audioContext.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = hcutoff;
    hp.Q.value = resonance !== undefined ? mapResonanceToQ(resonance) : 1;
    lastNode.connect(hp);
    lastNode = hp;
    filters.highpass = hp;
  }

  // Then lowpass (if specified)
  if (cutoff !== undefined) {
    const lp = audioContext.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    lp.Q.value = resonance !== undefined ? mapResonanceToQ(resonance) : 1;
    lastNode.connect(lp);
    lastNode = lp;
    filters.lowpass = lp;
  }

  lastNode.connect(output);

  return {
    input,
    output,
    ...filters
  };
}

/** Vowel filter nodes */
export interface VowelFilterNodes {
  input: GainNode;
  output: GainNode;
  filters: BiquadFilterNode[];
}

/**
 * Create a vowel filter (formant filter for vocal-like sounds)
 */
export function createVowelFilter(
  audioContext: AudioContext,
  vowel: string = 'a'
): VowelFilterNodes {
  // Formant frequencies for vowels (F1, F2, F3)
  const formants: Record<string, number[]> = {
    'a': [800, 1200, 2500],
    'e': [400, 2200, 2600],
    'i': [300, 2300, 3000],
    'o': [500, 800, 2500],
    'u': [350, 600, 2400]
  };

  const freqs = formants[vowel] || formants['a'];

  const input = audioContext.createGain();
  const output = audioContext.createGain();

  // Create parallel bandpass filters for each formant
  const filters = freqs.map((freq) => {
    const bp = audioContext.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 10; // Narrow bandwidth
    return bp;
  });

  // Mix gains for each formant
  const gains = [1, 0.5, 0.25]; // Decreasing amplitude for higher formants

  filters.forEach((filter, i) => {
    const gain = audioContext.createGain();
    gain.gain.value = gains[i];
    input.connect(filter);
    filter.connect(gain);
    gain.connect(output);
  });

  return {
    input,
    output,
    filters
  };
}
