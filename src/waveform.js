import * as AudioContextManager from './audio-context.js';
import { playOscillator, SYNTH_TYPES } from './synths/oscillator.js';
import { playSampleWithNote } from './synths/sampler.js';
import { Samples } from './samples/index.js';
import { Scheduler } from './scheduler.js';

/**
 * Main Waveform class - Web Audio transport layer
 */
export class Waveform {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
    this._scheduler = null;
  }

  /**
   * Initialize the audio context
   * Must be called from a user gesture (click, keypress, etc.)
   * @returns {Promise<Waveform>} This instance for chaining
   */
  async init() {
    await AudioContextManager.init(this.options);

    // Initialize sample manager with the audio context
    Samples.init(AudioContextManager.getContext());

    // Initialize scheduler with play function bound to this instance
    this._scheduler = new Scheduler(
      AudioContextManager.getContext(),
      (params, startTime) => this.play(params, startTime),
      this.options.scheduler
    );

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

    // Determine synth/sample type
    const synthType = params.s || 'sine';
    const variant = params.n ?? null;

    // Check if this is a loaded sample
    const sampleBuffer = Samples.get(synthType, variant);

    if (sampleBuffer) {
      // Play sample
      return playSampleWithNote(
        audioContext,
        masterGain,
        sampleBuffer,
        params,
        startTime
      );
    } else {
      // Play oscillator synth
      const oscType = SYNTH_TYPES[synthType] || 'sine';

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

  /**
   * Load a single sample
   * @param {string} name - Name to register the sample under
   * @param {string} url - URL of the audio file
   * @returns {Promise<AudioBuffer>} The loaded audio buffer
   */
  async loadSample(name, url) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    return Samples.load(name, url);
  }

  /**
   * Load multiple samples
   * @param {Object} samples - Map of sample names to URLs
   * @returns {Promise<Object>} Map of sample names to AudioBuffers
   */
  async loadSamples(samples) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    return Samples.loadMultiple(samples);
  }

  /**
   * Load samples with progress tracking
   * @param {Object} samples - Map of sample names to URLs
   * @param {Function} onProgress - Callback function (loaded, total, name)
   * @returns {Promise<Object>} Map of sample names to AudioBuffers
   */
  async loadSamplesWithProgress(samples, onProgress) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    return Samples.loadWithProgress(samples, onProgress);
  }

  /**
   * Load a sample bank from a JSON manifest
   * @param {string} manifestUrl - URL of the JSON manifest file
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Object>} Map of sample names to AudioBuffers
   */
  async loadSampleBank(manifestUrl, onProgress) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    return Samples.loadBank(manifestUrl, onProgress);
  }

  /**
   * Get access to the Samples manager for advanced operations
   * @returns {SampleManager} The sample manager instance
   */
  getSamples() {
    return Samples;
  }

  // ============================================
  // Scheduler Methods
  // ============================================

  /**
   * Get access to the Scheduler for advanced operations
   * @returns {Scheduler} The scheduler instance
   */
  getScheduler() {
    return this._scheduler;
  }

  /**
   * Schedule a pattern for playback
   * @param {string} id - Unique pattern identifier
   * @param {Array|Function} eventsOrQueryFn - Array of events or query function
   *
   * Events format:
   * [
   *   { start: 0.0, params: { s: 'bd', gain: 0.8 } },
   *   { start: 0.5, params: { s: 'sn' } }
   * ]
   *
   * Query function format:
   * (cycle) => [{ start: 0.0, params: {...} }, ...]
   */
  schedulePattern(id, eventsOrQueryFn) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    this._scheduler.schedulePattern(id, eventsOrQueryFn);
  }

  /**
   * Update an existing pattern (hot-swap)
   * @param {string} id - Pattern identifier
   * @param {Array|Function} eventsOrQueryFn - New events or query function
   */
  updatePattern(id, eventsOrQueryFn) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    this._scheduler.updatePattern(id, eventsOrQueryFn);
  }

  /**
   * Stop and remove a specific pattern
   * @param {string} id - Pattern identifier
   * @returns {boolean} True if pattern was removed
   */
  stopPattern(id) {
    if (!this.initialized) {
      return false;
    }
    return this._scheduler.stopPattern(id);
  }

  /**
   * Stop all patterns (hush)
   */
  hush() {
    if (this._scheduler) {
      this._scheduler.hush();
    }
  }

  /**
   * Start the scheduler
   */
  startScheduler() {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    this._scheduler.start();
  }

  /**
   * Stop the scheduler
   */
  stopScheduler() {
    if (this._scheduler) {
      this._scheduler.stop();
    }
  }

  /**
   * Check if scheduler is running
   * @returns {boolean}
   */
  isSchedulerRunning() {
    return this._scheduler ? this._scheduler.isRunning() : false;
  }

  /**
   * Set cycles per second
   * @param {number} cps - Cycles per second (e.g., 0.5 = 2 seconds per cycle)
   */
  setCps(cps) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    this._scheduler.setCps(cps);
  }

  /**
   * Get current cycles per second
   * @returns {number}
   */
  getCps() {
    return this._scheduler ? this._scheduler.getCps() : 0.5;
  }

  /**
   * Set tempo in BPM (assumes 4 beats per cycle)
   * @param {number} bpm - Beats per minute
   */
  setBpm(bpm) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    this._scheduler.setBpm(bpm);
  }

  /**
   * Get current BPM (assumes 4 beats per cycle)
   * @returns {number}
   */
  getBpm() {
    return this._scheduler ? this._scheduler.getBpm() : 120;
  }

  /**
   * Get current cycle position (including fractional part)
   * @returns {number}
   */
  getCurrentCycle() {
    return this._scheduler ? this._scheduler.getCurrentCycle() : 0;
  }

  /**
   * Register callback for cycle start
   * @param {Function} callback - Called with (cycleNumber)
   * @returns {Function} Unsubscribe function
   */
  onCycle(callback) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    return this._scheduler.onCycle(callback);
  }

  /**
   * Register callback for each event
   * @param {Function} callback - Called with (event, startTime, cycleNumber)
   * @returns {Function} Unsubscribe function
   */
  onEvent(callback) {
    if (!this.initialized) {
      throw new Error('Waveform not initialized. Call init() first.');
    }
    return this._scheduler.onEvent(callback);
  }
}
