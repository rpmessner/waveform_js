import { noteToFreq } from '../utils/note-to-freq.js';
import { clamp } from '../utils/db-to-gain.js';
import { applyEffects, hasEffects } from '../effects/index.js';

/**
 * FM Synthesis Presets
 *
 * Each preset defines the FM algorithm parameters:
 * - operators: Array of {ratio, level, envelope} for each operator
 * - algorithm: How operators connect (for now: simple 2-op carrier-modulator)
 */
export const FM_PRESETS = {
  // Electric piano (DX7-style)
  piano: {
    // Carrier: fundamental frequency
    carrier: { ratio: 1, level: 1.0 },
    // Modulator: creates harmonic complexity
    modulator: {
      ratio: 1,           // 1:1 ratio for metallic EP character
      index: 2.5,         // Modulation depth
      indexDecay: 0.15    // How fast modulation decays (faster = bell-like)
    },
    envelope: {
      attack: 0.005,
      decay: 0.8,
      sustain: 0.2,
      release: 0.5
    },
    // Second modulator for richer tone
    modulator2: {
      ratio: 3,           // 3rd harmonic
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
      indexDecay: 2.0     // Slow decay for evolving pad
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
      ratio: 3.5,         // Inharmonic ratio for bell character
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
      indexDecay: 10.0    // Very slow = sustained organ tone
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
 * @param {AudioContext} audioContext - The audio context
 * @param {AudioNode} destination - Where to connect output
 * @param {Object} params - Sound parameters
 * @param {string} params.preset - FM preset name ('piano', 'fm', 'pad', 'bell', 'organ')
 * @param {number} params.note - MIDI note number
 * @param {number} params.freq - Frequency in Hz (alternative to note)
 * @param {number} params.amp - Amplitude 0-1
 * @param {number} params.gain - Gain multiplier
 * @param {number} params.pan - Stereo pan -1 to 1
 * @param {number} params.fm - Modulation index override
 * @param {number} params.fmh - FM harmonicity (modulator ratio) override
 * @param {number} params.attack - Attack override
 * @param {number} params.decay - Decay override
 * @param {number} params.sustain - Sustain override
 * @param {number} params.release - Release override
 * @param {number} params.duration - Note duration
 * @param {number} params.cutoff - Filter cutoff
 * @param {number} params.resonance - Filter resonance
 * @param {number} startTime - When to start
 */
export function playFMSynth(audioContext, destination, params, startTime = null) {
  const now = startTime ?? audioContext.currentTime;

  // Get preset
  const presetName = params.preset || 'piano';
  const preset = FM_PRESETS[presetName] || FM_PRESETS.piano;

  // Get base frequency
  let frequency;
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

  const duration = params.duration ?? (envelope.attack + envelope.decay + 0.1);

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
    // Fast decay: exponential
    modulatorGain.gain.exponentialRampToValueAtTime(
      modDepth * 0.01,
      now + indexDecay
    );
  }

  // Connect modulator -> carrier frequency (FM connection)
  modulator.connect(modulatorGain);
  modulatorGain.connect(carrier.frequency);

  // Optional second modulator for richer tone
  let modulator2 = null;
  let modulatorGain2 = null;
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
  const attackEnd = now + envelope.attack;
  const decayEnd = attackEnd + envelope.decay;
  const sustainEnd = now + duration;
  const releaseEnd = sustainEnd + envelope.release;

  carrierGain.gain.setValueAtTime(0, now);
  carrierGain.gain.linearRampToValueAtTime(totalGain, attackEnd);
  carrierGain.gain.linearRampToValueAtTime(totalGain * envelope.sustain, decayEnd);
  carrierGain.gain.setValueAtTime(totalGain * envelope.sustain, sustainEnd);
  carrierGain.gain.linearRampToValueAtTime(0, releaseEnd);

  const totalDuration = releaseEnd - now;

  // Create filter if cutoff specified
  let filterNode = null;
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
  let panNode = null;
  if (params.pan !== undefined && params.pan !== 0) {
    panNode = audioContext.createStereoPanner();
    panNode.pan.setValueAtTime(clamp(params.pan, -1, 1), now);
  }

  // Connect output chain
  let currentNode = filterNode || outputGain;

  if (panNode) {
    currentNode.connect(panNode);
    currentNode = panNode;
  }

  // Apply effects if present
  let effectsChain = null;
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
      modulatorGain2.disconnect();
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
    filterNode,
    panNode,
    effectsChain,
    stopTime: now + totalDuration
  };
}

/**
 * Check if a synth name should use FM synthesis
 */
export function isFMSynth(name) {
  return name in FM_PRESETS;
}
