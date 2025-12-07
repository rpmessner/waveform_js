/**
 * Distortion effects
 * SuperDirt-compatible parameters: shape, crush
 */

import type { SoundParams, DistortionNodes } from '../types';

/**
 * Generate a distortion curve for WaveShaperNode
 */
export function makeDistortionCurve(amount: number = 0.5, samples: number = 44100): Float32Array {
  const curve = new Float32Array(samples);
  const k = amount * 100;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;

    if (k === 0) {
      // No distortion
      curve[i] = x;
    } else {
      // Soft clipping using tanh-like curve
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) /
                 (Math.PI + k * Math.abs(x));
    }
  }

  return curve;
}

/**
 * Generate a hard clip distortion curve
 */
export function makeHardClipCurve(threshold: number = 0.8, samples: number = 44100): Float32Array {
  const curve = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.max(-threshold, Math.min(threshold, x));
  }

  return curve;
}

/**
 * Create a distortion effect
 */
export function createDistortion(
  audioContext: AudioContext,
  params: SoundParams = {}
): DistortionNodes | null {
  const shape = params.shape ?? 0;
  const distortionType = params.distortionType ?? 'soft';

  if (shape <= 0) {
    return null;
  }

  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const waveshaper = audioContext.createWaveShaper();

  // Generate appropriate curve
  const curve = distortionType === 'hard'
    ? makeHardClipCurve(1 - shape * 0.8)
    : makeDistortionCurve(shape);
  // @ts-expect-error - TypeScript Web Audio type issue with Float32Array<ArrayBufferLike>
  waveshaper.curve = curve;

  waveshaper.oversample = shape > 0.5 ? '4x' : '2x';

  // Compensate for volume increase from distortion
  const makeupGain = audioContext.createGain();
  makeupGain.gain.value = 1 / (1 + shape * 0.5);

  input.connect(waveshaper);
  waveshaper.connect(makeupGain);
  makeupGain.connect(output);

  return {
    input,
    output,
    waveshaper,
    makeupGain
  };
}

/** Bitcrusher nodes */
export interface BitcrusherNodes {
  input: GainNode;
  output: GainNode;
  waveshaper: WaveShaperNode;
  bits: number;
}

/**
 * Create a bitcrusher effect
 */
export function createBitcrusher(
  audioContext: AudioContext,
  params: SoundParams = {}
): BitcrusherNodes | null {
  const crush = params.crush;

  if (crush === undefined || crush >= 16) {
    return null;
  }

  // Bitcrushing requires ScriptProcessorNode or AudioWorklet
  // For simplicity, we'll use a WaveShaper approximation
  // True bitcrushing would need AudioWorklet

  const input = audioContext.createGain();
  const output = audioContext.createGain();

  // Quantization using waveshaper
  const bits = Math.max(1, Math.min(16, crush));
  const levels = Math.pow(2, bits);
  const samples = 65536;
  const bitcrushCurve = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    // Quantize to bit depth
    bitcrushCurve[i] = Math.round(x * levels) / levels;
  }

  const waveshaper = audioContext.createWaveShaper();
  waveshaper.curve = bitcrushCurve;
  waveshaper.oversample = 'none'; // No oversampling for that crunchy sound

  input.connect(waveshaper);
  waveshaper.connect(output);

  return {
    input,
    output,
    waveshaper,
    bits
  };
}

/** Overdrive nodes */
export interface OverdriveNodes {
  input: GainNode;
  output: GainNode;
  preGain: GainNode;
  waveshaper: WaveShaperNode;
  toneFilter: BiquadFilterNode;
  postGain: GainNode;
}

/**
 * Create a combined distortion + filter effect (common guitar-like sound)
 */
export function createOverdrive(
  audioContext: AudioContext,
  params: SoundParams = {}
): OverdriveNodes {
  const drive = params.drive ?? 0.5;
  const tone = params.tone ?? 0.5;

  const input = audioContext.createGain();
  const output = audioContext.createGain();

  // Pre-gain (drives the distortion harder)
  const preGain = audioContext.createGain();
  preGain.gain.value = 1 + drive * 3;

  // Distortion
  const waveshaper = audioContext.createWaveShaper();
  const overdriveCurve = makeDistortionCurve(drive);
  // @ts-expect-error - TypeScript Web Audio type issue with Float32Array<ArrayBufferLike>
  waveshaper.curve = overdriveCurve;
  waveshaper.oversample = '2x';

  // Tone control (lowpass filter)
  const toneFilter = audioContext.createBiquadFilter();
  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = 1000 + tone * 4000; // 1kHz to 5kHz
  toneFilter.Q.value = 0.7;

  // Output gain compensation
  const postGain = audioContext.createGain();
  postGain.gain.value = 0.5 / (1 + drive);

  input.connect(preGain);
  preGain.connect(waveshaper);
  waveshaper.connect(toneFilter);
  toneFilter.connect(postGain);
  postGain.connect(output);

  return {
    input,
    output,
    preGain,
    waveshaper,
    toneFilter,
    postGain
  };
}
