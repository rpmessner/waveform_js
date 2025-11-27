/**
 * Sample loading utilities
 * Handles fetching and decoding audio files into AudioBuffers
 */

/**
 * Load a single audio file and decode it to an AudioBuffer
 * @param {AudioContext} audioContext - The audio context to use for decoding
 * @param {string} url - URL of the audio file to load
 * @returns {Promise<AudioBuffer>} Decoded audio buffer
 * @throws {Error} If fetch fails or decoding fails
 */
export async function loadSample(audioContext, url) {
  if (!audioContext) {
    throw new Error('AudioContext is required');
  }

  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL string is required');
  }

  try {
    // Fetch the audio file
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch sample: ${response.status} ${response.statusText}`);
    }

    // Get array buffer
    const arrayBuffer = await response.arrayBuffer();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
  } catch (error) {
    // Re-throw with more context
    if (error.name === 'EncodingError') {
      throw new Error(`Failed to decode audio file: ${url} - unsupported format or corrupt file`);
    }
    throw error;
  }
}

/**
 * Load multiple samples in parallel
 * @param {AudioContext} audioContext - The audio context to use for decoding
 * @param {Object} samples - Map of sample names to URLs
 * @returns {Promise<Object>} Map of sample names to AudioBuffers
 * @throws {Error} If any sample fails to load
 */
export async function loadSamples(audioContext, samples) {
  if (!audioContext) {
    throw new Error('AudioContext is required');
  }

  if (!samples || typeof samples !== 'object') {
    throw new Error('Samples object is required');
  }

  const entries = Object.entries(samples);

  // Load all samples in parallel
  const promises = entries.map(async ([name, url]) => {
    const buffer = await loadSample(audioContext, url);
    return [name, buffer];
  });

  const results = await Promise.all(promises);

  // Convert back to object
  return Object.fromEntries(results);
}

/**
 * Load samples with progress tracking
 * @param {AudioContext} audioContext - The audio context to use for decoding
 * @param {Object} samples - Map of sample names to URLs
 * @param {Function} onProgress - Callback function (loaded, total, name)
 * @returns {Promise<Object>} Map of sample names to AudioBuffers
 */
export async function loadSamplesWithProgress(audioContext, samples, onProgress) {
  if (!audioContext) {
    throw new Error('AudioContext is required');
  }

  if (!samples || typeof samples !== 'object') {
    throw new Error('Samples object is required');
  }

  const entries = Object.entries(samples);
  const total = entries.length;
  let loaded = 0;

  const results = {};

  // Load samples sequentially for progress tracking
  for (const [name, url] of entries) {
    try {
      const buffer = await loadSample(audioContext, url);
      results[name] = buffer;
      loaded++;

      if (onProgress) {
        onProgress(loaded, total, name);
      }
    } catch (error) {
      // Still report progress even on error
      loaded++;
      if (onProgress) {
        onProgress(loaded, total, name, error);
      }
      throw error;
    }
  }

  return results;
}

/**
 * Load a sample bank from a JSON manifest
 * @param {AudioContext} audioContext - The audio context to use for decoding
 * @param {string} manifestUrl - URL of the JSON manifest file
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Map of sample names to AudioBuffers
 *
 * Manifest format:
 * {
 *   "baseUrl": "https://example.com/samples/",
 *   "samples": {
 *     "bd": ["bd/BT0A0A7.wav", "bd/BT0A0D0.wav"],
 *     "sn": ["sn/ST0T0S3.wav", "sn/ST0T3S3.wav"]
 *   }
 * }
 */
export async function loadSampleBank(audioContext, manifestUrl, onProgress) {
  if (!audioContext) {
    throw new Error('AudioContext is required');
  }

  if (!manifestUrl || typeof manifestUrl !== 'string') {
    throw new Error('Valid manifest URL is required');
  }

  try {
    // Fetch the manifest
    const response = await fetch(manifestUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
    }

    const manifest = await response.json();

    // Validate manifest structure
    if (!manifest.samples || typeof manifest.samples !== 'object') {
      throw new Error('Invalid manifest: missing "samples" object');
    }

    const baseUrl = manifest.baseUrl || '';

    // Flatten sample bank structure
    const sampleUrls = {};

    for (const [sampleName, variants] of Object.entries(manifest.samples)) {
      if (!Array.isArray(variants)) {
        throw new Error(`Invalid manifest: "${sampleName}" must be an array of file paths`);
      }

      variants.forEach((path, index) => {
        const fullUrl = baseUrl + path;
        const key = `${sampleName}:${index}`;
        sampleUrls[key] = fullUrl;
      });
    }

    // Load all samples
    if (onProgress) {
      return await loadSamplesWithProgress(audioContext, sampleUrls, onProgress);
    } else {
      return await loadSamples(audioContext, sampleUrls);
    }

  } catch (error) {
    if (error.name === 'SyntaxError') {
      throw new Error(`Failed to parse manifest JSON: ${manifestUrl}`);
    }
    throw error;
  }
}
