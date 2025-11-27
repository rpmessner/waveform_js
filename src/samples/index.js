/**
 * Sample Manager
 * Registry for loaded audio samples
 */

import { loadSample, loadSamples, loadSamplesWithProgress, loadSampleBank } from './loader.js';

/**
 * Sample registry
 * Stores loaded AudioBuffers by name
 */
class SampleManager {
  constructor() {
    this.samples = {};
    this.audioContext = null;
  }

  /**
   * Initialize the sample manager with an audio context
   * @param {AudioContext} audioContext - The audio context to use
   */
  init(audioContext) {
    if (!audioContext) {
      throw new Error('AudioContext is required');
    }
    this.audioContext = audioContext;
  }

  /**
   * Load a single sample
   * @param {string} name - Name to register the sample under
   * @param {string} url - URL of the audio file
   * @returns {Promise<AudioBuffer>} The loaded audio buffer
   */
  async load(name, url) {
    if (!this.audioContext) {
      throw new Error('SampleManager not initialized. Call init(audioContext) first.');
    }

    const buffer = await loadSample(this.audioContext, url);
    this.samples[name] = buffer;
    return buffer;
  }

  /**
   * Load multiple samples
   * @param {Object} samples - Map of sample names to URLs
   * @returns {Promise<Object>} Map of sample names to AudioBuffers
   */
  async loadMultiple(samples) {
    if (!this.audioContext) {
      throw new Error('SampleManager not initialized. Call init(audioContext) first.');
    }

    const buffers = await loadSamples(this.audioContext, samples);

    // Add to registry
    Object.assign(this.samples, buffers);

    return buffers;
  }

  /**
   * Load samples with progress tracking
   * @param {Object} samples - Map of sample names to URLs
   * @param {Function} onProgress - Callback function (loaded, total, name)
   * @returns {Promise<Object>} Map of sample names to AudioBuffers
   */
  async loadWithProgress(samples, onProgress) {
    if (!this.audioContext) {
      throw new Error('SampleManager not initialized. Call init(audioContext) first.');
    }

    const buffers = await loadSamplesWithProgress(this.audioContext, samples, onProgress);

    // Add to registry
    Object.assign(this.samples, buffers);

    return buffers;
  }

  /**
   * Load a sample bank from a JSON manifest
   * @param {string} manifestUrl - URL of the JSON manifest file
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Object>} Map of sample names to AudioBuffers
   */
  async loadBank(manifestUrl, onProgress) {
    if (!this.audioContext) {
      throw new Error('SampleManager not initialized. Call init(audioContext) first.');
    }

    const buffers = await loadSampleBank(this.audioContext, manifestUrl, onProgress);

    // Add to registry
    Object.assign(this.samples, buffers);

    return buffers;
  }

  /**
   * Get a sample by name
   * @param {string} name - Sample name (supports "name" or "name:variant" format)
   * @param {number} n - Optional variant number (alternative to name:n format)
   * @returns {AudioBuffer|null} The audio buffer, or null if not found
   */
  get(name, n = null) {
    // If n is specified, use name:n format (strict match)
    if (n !== null && n !== undefined) {
      const key = `${name}:${n}`;
      return this.samples[key] || null;
    }

    // Try exact name match
    if (this.samples[name]) {
      return this.samples[name];
    }

    // Try name:0 as default variant (only if n not specified)
    const defaultKey = `${name}:0`;
    if (this.samples[defaultKey]) {
      return this.samples[defaultKey];
    }

    return null;
  }

  /**
   * Check if a sample is loaded
   * @param {string} name - Sample name
   * @param {number} n - Optional variant number
   * @returns {boolean} True if sample exists
   */
  has(name, n = null) {
    return this.get(name, n) !== null;
  }

  /**
   * Get all loaded sample names
   * @returns {string[]} Array of sample names
   */
  list() {
    return Object.keys(this.samples);
  }

  /**
   * Get count of loaded samples
   * @returns {number} Number of loaded samples
   */
  count() {
    return Object.keys(this.samples).length;
  }

  /**
   * Remove a sample from the registry
   * @param {string} name - Sample name to remove
   * @returns {boolean} True if sample was removed
   */
  remove(name) {
    if (this.samples[name]) {
      delete this.samples[name];
      return true;
    }
    return false;
  }

  /**
   * Clear all loaded samples
   */
  clear() {
    this.samples = {};
  }

  /**
   * Get all samples with a specific name prefix
   * Useful for getting all variants of a sample (bd:0, bd:1, bd:2, etc.)
   * @param {string} prefix - Sample name prefix
   * @returns {Object} Map of full names to AudioBuffers
   */
  getByPrefix(prefix) {
    const result = {};
    for (const [name, buffer] of Object.entries(this.samples)) {
      if (name.startsWith(prefix)) {
        result[name] = buffer;
      }
    }
    return result;
  }

  /**
   * Get variant count for a sample name
   * @param {string} name - Base sample name
   * @returns {number} Number of variants available
   */
  getVariantCount(name) {
    const variants = this.getByPrefix(name + ':');
    return Object.keys(variants).length;
  }
}

// Export singleton instance
export const Samples = new SampleManager();

// Also export the class for testing
export { SampleManager };
