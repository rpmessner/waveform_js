import * as AudioContextManager from './audio-context.js';
import { playOscillator, SYNTH_TYPES } from './synths/oscillator.js';

/**
 * Main Waveform class - Web Audio transport layer
 */
export class Waveform {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
  }

  /**
   * Initialize the audio context
   * Must be called from a user gesture (click, keypress, etc.)
   * @returns {Promise<Waveform>} This instance for chaining
   */
  async init() {
    await AudioContextManager.init(this.options);
    this.initialized = true;
    return this;
  }

  /**
   * Play a sound with SuperDirt-compatible parameters
   * @param {Object} params - Sound parameters
   * @param {string} params.s - Sample/synth name
   * @param {number} params.note - MIDI note number (0-127)
   * @param {number} params.freq - Frequency in Hz (alternative to note)
   * @param {number} params.n - Sample/synth variant number
   * @param {number} params.gain - Volume (0-2, default: 1.0)
   * @param {number} params.amp - Amplitude (0-1, default: 0.5)
   * @param {number} params.pan - Stereo pan (-1 to 1, default: 0)
   * @param {number} params.speed - Playback speed/rate (default: 1.0)
   * @param {number} params.begin - Sample start position (0-1)
   * @param {number} params.end - Sample end position (0-1)
   * @param {number} params.cutoff - Filter cutoff frequency in Hz
   * @param {number} params.resonance - Filter resonance (0-1)
   * @param {number} params.attack - Envelope attack time in seconds
   * @param {number} params.decay - Envelope decay time in seconds
   * @param {number} params.sustain - Envelope sustain level (0-1)
   * @param {number} params.release - Envelope release time in seconds
   * @param {number} params.duration - Total note duration in seconds
   * @param {number} startTime - When to play (audio context time, default: now)
   * @returns {Object} The created audio nodes
   */
  play(params, startTime = null) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }

    const audioContext = AudioContextManager.getContext();
    const masterGain = AudioContextManager.getMasterGain();

    // Determine synth type
    let synthType = params.s || 'sine';

    // Map synth type to oscillator type
    const oscType = SYNTH_TYPES[synthType] || 'sine';

    // Play oscillator
    return playOscillator(
      audioContext,
      masterGain,
      {
        ...params,
        type: oscType
      },
      startTime
    );
  }

  /**
   * Suspend audio processing
   * @returns {Promise<void>}
   */
  async suspend() {
    return AudioContextManager.suspend();
  }

  /**
   * Resume audio processing
   * @returns {Promise<void>}
   */
  async resume() {
    return AudioContextManager.resume();
  }

  /**
   * Close the audio context
   * @returns {Promise<void>}
   */
  async close() {
    this.initialized = false;
    return AudioContextManager.close();
  }

  /**
   * Get the current audio context
   * @returns {AudioContext|null}
   */
  getContext() {
    return AudioContextManager.getContext();
  }

  /**
   * Get the current state
   * @returns {string}
   */
  getState() {
    return AudioContextManager.getState();
  }

  /**
   * Set master volume
   * @param {number} gain - Volume level (0-2)
   * @param {number} rampTime - Fade time in seconds
   */
  setMasterGain(gain, rampTime) {
    return AudioContextManager.setMasterGain(gain, rampTime);
  }

  /**
   * Get master volume
   * @returns {number}
   */
  getMasterGain() {
    return AudioContextManager.getMasterGainValue();
  }
}
