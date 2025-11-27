/**
 * Distortion effects
 * SuperDirt-compatible parameters: shape, crush
 */

/**
 * Generate a distortion curve for WaveShaperNode
 * @param {number} amount - Distortion amount (0-1)
 * @param {number} samples - Number of samples in curve
 * @returns {Float32Array} The distortion curve
 */
export function makeDistortionCurve(amount = 0.5, samples = 44100) {
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
 * @param {number} threshold - Clipping threshold (0-1)
 * @param {number} samples - Number of samples
 * @returns {Float32Array}
 */
export function makeHardClipCurve(threshold = 0.8, samples = 44100) {
  const curve = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.max(-threshold, Math.min(threshold, x));
  }

  return curve;
}

/**
 * Create a distortion effect
 * @param {AudioContext} audioContext - The audio context
 * @param {Object} params - Effect parameters
 * @param {number} params.shape - Distortion amount (0.0-1.0)
 * @param {string} params.distortionType - 'soft' or 'hard' (default: 'soft')
 * @returns {Object} { input, output, waveshaper } or null if no distortion
 */
export function createDistortion(audioContext, params = {}) {
  const shape = params.shape ?? 0;
  const distortionType = params.distortionType ?? 'soft';

  if (shape <= 0) {
    return null;
  }

  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const waveshaper = audioContext.createWaveShaper();

  // Generate appropriate curve
  if (distortionType === 'hard') {
    waveshaper.curve = makeHardClipCurve(1 - shape * 0.8);
  } else {
    waveshaper.curve = makeDistortionCurve(shape);
  }

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

/**
 * Create a bitcrusher effect
 * @param {AudioContext} audioContext - The audio context
 * @param {Object} params - Effect parameters
 * @param {number} params.crush - Bit depth (1-16, lower = more crushed)
 * @param {number} params.coarse - Sample rate reduction factor
 * @returns {Object} { input, output, processor } or null
 */
export function createBitcrusher(audioContext, params = {}) {
  const crush = params.crush;
  const coarse = params.coarse ?? 1;

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
  const curve = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    // Quantize to bit depth
    curve[i] = Math.round(x * levels) / levels;
  }

  const waveshaper = audioContext.createWaveShaper();
  waveshaper.curve = curve;
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

/**
 * Create a combined distortion + filter effect (common guitar-like sound)
 * @param {AudioContext} audioContext
 * @param {Object} params
 * @returns {Object} Effect chain
 */
export function createOverdrive(audioContext, params = {}) {
  const drive = params.drive ?? 0.5;
  const tone = params.tone ?? 0.5;

  const input = audioContext.createGain();
  const output = audioContext.createGain();

  // Pre-gain (drives the distortion harder)
  const preGain = audioContext.createGain();
  preGain.gain.value = 1 + drive * 3;

  // Distortion
  const waveshaper = audioContext.createWaveShaper();
  waveshaper.curve = makeDistortionCurve(drive);
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
