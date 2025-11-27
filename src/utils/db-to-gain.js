/**
 * Convert decibels to linear gain
 * @param {number} db - Decibels
 * @returns {number} Linear gain value
 */
export function dbToGain(db) {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear gain to decibels
 * @param {number} gain - Linear gain value
 * @returns {number} Decibels
 */
export function gainToDb(gain) {
  return 20 * Math.log10(gain);
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
