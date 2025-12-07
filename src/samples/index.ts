/**
 * Sample Manager
 * Registry for loaded audio samples
 */

import { loadSample, loadSamples, loadSamplesWithProgress, loadSampleBank } from './loader';
import type { SampleManager, ProgressCallback } from '../types';

/**
 * Create a sample manager instance
 */
export const createSampleManager = (): SampleManager => {
  let samples: Record<string, AudioBuffer> = {};
  let audioContext: AudioContext | null = null;

  /**
   * Initialize the sample manager with an audio context
   */
  const init = (ctx: AudioContext): void => {
    if (!ctx) {
      throw new Error('AudioContext is required');
    }
    audioContext = ctx;
  };

  /**
   * Ensure manager is initialized
   */
  const ensureInitialized = (): void => {
    if (!audioContext) {
      throw new Error('SampleManager not initialized. Call init(audioContext) first.');
    }
  };

  /**
   * Load a single sample
   */
  const load = async (name: string, url: string): Promise<AudioBuffer> => {
    ensureInitialized();
    const buffer = await loadSample(audioContext!, url);
    samples[name] = buffer;
    return buffer;
  };

  /**
   * Load multiple samples
   */
  const loadMultiple = async (sampleMap: Record<string, string>): Promise<Record<string, AudioBuffer>> => {
    ensureInitialized();
    const buffers = await loadSamples(audioContext!, sampleMap);
    Object.assign(samples, buffers);
    return buffers;
  };

  /**
   * Load samples with progress tracking
   */
  const loadWithProgress = async (
    sampleMap: Record<string, string>,
    onProgress: ProgressCallback
  ): Promise<Record<string, AudioBuffer>> => {
    ensureInitialized();
    const buffers = await loadSamplesWithProgress(audioContext!, sampleMap, onProgress);
    Object.assign(samples, buffers);
    return buffers;
  };

  /**
   * Load a sample bank from a JSON manifest
   */
  const loadBank = async (
    manifestUrl: string,
    onProgress?: ProgressCallback
  ): Promise<Record<string, AudioBuffer>> => {
    ensureInitialized();
    const buffers = await loadSampleBank(audioContext!, manifestUrl, onProgress);
    Object.assign(samples, buffers);
    return buffers;
  };

  /**
   * Get a sample by name
   */
  const get = (name: string, n: number | null = null): AudioBuffer | null => {
    // If n is specified, use name:n format (strict match)
    if (n !== null && n !== undefined) {
      return samples[`${name}:${n}`] || null;
    }

    // Try exact name match
    if (samples[name]) {
      return samples[name];
    }

    // Try name:0 as default variant (only if n not specified)
    return samples[`${name}:0`] || null;
  };

  /**
   * Check if a sample is loaded
   */
  const has = (name: string, n: number | null = null): boolean => get(name, n) !== null;

  /**
   * Get all loaded sample names
   */
  const list = (): string[] => Object.keys(samples);

  /**
   * Get count of loaded samples
   */
  const count = (): number => Object.keys(samples).length;

  /**
   * Remove a sample from the registry
   */
  const remove = (name: string): boolean => {
    if (!samples[name]) return false;
    delete samples[name];
    return true;
  };

  /**
   * Clear all loaded samples
   */
  const clear = (): void => {
    samples = {};
  };

  /**
   * Get all samples with a specific name prefix
   */
  const getByPrefix = (prefix: string): Record<string, AudioBuffer> =>
    Object.entries(samples)
      .filter(([name]) => name.startsWith(prefix))
      .reduce((acc, [name, buffer]) => ({ ...acc, [name]: buffer }), {});

  /**
   * Get variant count for a sample name
   */
  const getVariantCount = (name: string): number => Object.keys(getByPrefix(`${name}:`)).length;

  return {
    init,
    load,
    loadMultiple,
    loadWithProgress,
    loadBank,
    get,
    has,
    list,
    count,
    remove,
    clear,
    getByPrefix,
    getVariantCount
  };
};

// Export singleton instance
export const Samples = createSampleManager();

// Export factory for testing/multiple instances
export { createSampleManager as createSampleManagerFactory };
