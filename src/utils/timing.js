/**
 * Get the current audio context time
 * @param {AudioContext} audioContext - The audio context
 * @returns {number} Current time in seconds
 */
export function now(audioContext) {
  return audioContext.currentTime;
}

/**
 * Schedule a callback at a specific audio context time
 * @param {AudioContext} audioContext - The audio context
 * @param {number} time - Time in seconds (audio context time)
 * @param {Function} callback - Callback to execute
 */
export function scheduleAt(audioContext, time, callback) {
  const delay = Math.max(0, (time - audioContext.currentTime) * 1000);
  setTimeout(callback, delay);
}

/**
 * Convert BPM to cycles per second (CPS)
 * Assumes 4 beats per cycle
 * @param {number} bpm - Beats per minute
 * @returns {number} Cycles per second
 */
export function bpmToCps(bpm) {
  return bpm / 60 / 4;
}

/**
 * Convert cycles per second to BPM
 * Assumes 4 beats per cycle
 * @param {number} cps - Cycles per second
 * @returns {number} Beats per minute
 */
export function cpsToBpm(cps) {
  return cps * 60 * 4;
}
