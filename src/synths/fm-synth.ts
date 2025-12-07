/**
 * FM Synthesis
 */

import { noteToFreq } from '../utils/note-to-freq';
import { clamp } from '../utils/db-to-gain';
import { applyEffects, hasEffects } from '../effects/index';
import type { SoundParams, FMPreset, FMPlaybackNodes, EffectChain } from '../types';

/**
 * FM Synthesis Presets
 */
export const FM_PRESETS: Record<string, FMPreset> = {
  // Electric piano (DX7-style)
  piano: {
    carrier: { ratio: 1, level: 1.0 },
    modulator: {
      ratio: 1,
      index: 2.5,
      indexDecay: 0.15
    },
    envelope: {
      attack: 0.005,
      decay: 0.8,
      sustain: 0.2,
      release: 0.5
    },
    modulator2: {
      ratio: 3,
      index: 0.8,
      indexDecay: 0.08
    }
  },

  // FM bass
  fm: {
    carrier: { ratio: 1, level: 1.0 },
    modulator: {
      ratio: 2,
      index: 4.0,
      indexDecay: 0.2
    },
    envelope: {
      attack: 0.01,
      decay: 0.3,
      sustain: 0.5,
      release: 0.3
    }
  },

  // Pad/sustained FM
  pad: {
    carrier: { ratio: 1, level: 1.0 },
    modulator: {
      ratio: 2,
      index: 1.5,
      indexDecay: 2.0
    },
    envelope: {
      attack: 0.3,
      decay: 0.5,
      sustain: 0.7,
      release: 1.0
    }
  },

  // Bell/chime
  bell: {
    carrier: { ratio: 1, level: 1.0 },
    modulator: {
      ratio: 3.5,
      index: 5.0,
      indexDecay: 0.5
    },
    envelope: {
      attack: 0.001,
      decay: 2.0,
      sustain: 0.0,
      release: 0.5
    }
  },

  // Organ
  organ: {
    carrier: { ratio: 1, level: 1.0 },
    modulator: {
      ratio: 1,
      index: 1.0,
      indexDecay: 10.0
    },
    modulator2: {
      ratio: 2,
      index: 0.5,
      indexDecay: 10.0
    },
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.9,
      release: 0.1
    }
  }
};

/**
 * Play an FM synthesized sound
 */
export function playFMSynth(
  audioContext: AudioContext,
  destination: AudioNode,
  params: SoundParams,
  startTime: number | null = null
): FMPlaybackNodes {
  const now = startTime ?? audioContext.currentTime;

  // Get preset
  const presetName = params.preset || 'piano';
  const preset = FM_PRESETS[presetName] || FM_PRESETS.piano;

  // Get base frequency
  let frequency: number;
  if (params.freq !== undefined) {
    frequency = params.freq;
  } else if (params.note !== undefined) {
    frequency = noteToFreq(params.note);
  } else {
    frequency = 440;
  }

  // Get amplitude
  const amp = clamp(params.amp ?? 0.5, 0, 1);
  const gain = params.gain ?? 1.0;
  const totalGain = amp * gain * 0.5; // FM can be loud, scale down

  // Get envelope parameters (allow overrides)
  const envelope = {
    attack: params.attack ?? preset.envelope.attack,
    decay: params.decay ?? preset.envelope.decay,
    sustain: params.sustain ?? preset.envelope.sustain,
    release: params.release ?? preset.envelope.release
  };

  const duration = params.duration ?? (envelope.attack! + envelope.decay! + 0.1);

  // Allow FM parameter overrides
  const modIndex = params.fm ?? preset.modulator.index;
  const modRatio = params.fmh ?? preset.modulator.ratio;

  // Create main output gain node
  const outputGain = audioContext.createGain();

  // Create carrier oscillator
  const carrier = audioContext.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(frequency * preset.carrier.ratio, now);

  // Create carrier gain (for envelope)
  const carrierGain = audioContext.createGain();

  // Create modulator oscillator
  const modulator = audioContext.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.setValueAtTime(frequency * modRatio, now);

  // Create modulator gain (controls modulation depth)
  const modulatorGain = audioContext.createGain();
  // Modulation depth = index * carrier frequency (FM theory)
  const modDepth = modIndex * frequency;
  modulatorGain.gain.setValueAtTime(modDepth, now);

  // Apply index decay (modulation becomes weaker over time)
  const indexDecay = preset.modulator.indexDecay;
  if (indexDecay < 5) {
    modulatorGain.gain.exponentialRampToValueAtTime(
      modDepth * 0.01,
      now + indexDecay
    );
  }

  // Connect modulator -> carrier frequency (FM connection)
  modulator.connect(modulatorGain);
  modulatorGain.connect(carrier.frequency);

  // Optional second modulator for richer tone
  let modulator2: OscillatorNode | undefined;
  let modulatorGain2: GainNode | undefined;
  if (preset.modulator2) {
    modulator2 = audioContext.createOscillator();
    modulator2.type = 'sine';
    modulator2.frequency.setValueAtTime(frequency * preset.modulator2.ratio, now);

    modulatorGain2 = audioContext.createGain();
    const modDepth2 = preset.modulator2.index * frequency;
    modulatorGain2.gain.setValueAtTime(modDepth2, now);

    if (preset.modulator2.indexDecay < 5) {
      modulatorGain2.gain.exponentialRampToValueAtTime(
        modDepth2 * 0.01,
        now + preset.modulator2.indexDecay
      );
    }

    modulator2.connect(modulatorGain2);
    modulatorGain2.connect(carrier.frequency);
  }

  // Connect carrier -> output
  carrier.connect(carrierGain);
  carrierGain.connect(outputGain);

  // Apply ADSR envelope to carrier gain
  const attackEnd = now + envelope.attack!;
  const decayEnd = attackEnd + envelope.decay!;
  const sustainEnd = now + duration;
  const releaseEnd = sustainEnd + envelope.release!;

  carrierGain.gain.setValueAtTime(0, now);
  carrierGain.gain.linearRampToValueAtTime(totalGain, attackEnd);
  carrierGain.gain.linearRampToValueAtTime(totalGain * envelope.sustain!, decayEnd);
  carrierGain.gain.setValueAtTime(totalGain * envelope.sustain!, sustainEnd);
  carrierGain.gain.linearRampToValueAtTime(0, releaseEnd);

  const totalDuration = releaseEnd - now;

  // Create filter if cutoff specified
  let filterNode: BiquadFilterNode | undefined;
  if (params.cutoff !== undefined) {
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(params.cutoff, now);

    if (params.resonance !== undefined) {
      const q = 0.0001 + (params.resonance * 29.9999);
      filterNode.Q.setValueAtTime(q, now);
    }

    outputGain.connect(filterNode);
  }

  // Create panner if pan specified
  let panNode: StereoPannerNode | undefined;
  if (params.pan !== undefined && params.pan !== 0) {
    panNode = audioContext.createStereoPanner();
    panNode.pan.setValueAtTime(clamp(params.pan, -1, 1), now);
  }

  // Connect output chain
  let currentNode: AudioNode = filterNode || outputGain;

  if (panNode) {
    currentNode.connect(panNode);
    currentNode = panNode;
  }

  // Apply effects if present
  let effectsChain: EffectChain | null = null;
  if (hasEffects(params)) {
    effectsChain = applyEffects(audioContext, currentNode, destination, params);
  } else {
    currentNode.connect(destination);
  }

  // Start oscillators
  carrier.start(now);
  modulator.start(now);
  if (modulator2) modulator2.start(now);

  carrier.stop(now + totalDuration);
  modulator.stop(now + totalDuration);
  if (modulator2) modulator2.stop(now + totalDuration);

  // Cleanup
  carrier.onended = () => {
    carrier.disconnect();
    carrierGain.disconnect();
    modulator.disconnect();
    modulatorGain.disconnect();
    outputGain.disconnect();
    if (modulator2) {
      modulator2.disconnect();
      modulatorGain2?.disconnect();
    }
    if (filterNode) filterNode.disconnect();
    if (panNode) panNode.disconnect();
    if (effectsChain) effectsChain.disconnect();
  };

  return {
    carrier,
    modulator,
    modulator2,
    carrierGain,
    outputGain,
    gainNode: carrierGain,
    filterNode,
    panNode,
    effectsChain,
    stopTime: now + totalDuration
  };
}

/**
 * Check if a synth name should use FM synthesis
 */
export function isFMSynth(name: string): boolean {
  return name in FM_PRESETS;
}
