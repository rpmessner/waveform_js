/**
 * Get the current audio context time
 */
export function now(audioContext: AudioContext): number {
  return audioContext.currentTime;
}

/**
 * Schedule a callback at a specific audio context time
 */
export function scheduleAt(
  audioContext: AudioContext,
  time: number,
  callback: () => void
): void {
  const delay = Math.max(0, (time - audioContext.currentTime) * 1000);
  setTimeout(callback, delay);
}

/**
 * Convert BPM to cycles per second (CPS)
 * Assumes 4 beats per cycle
 */
export function bpmToCps(bpm: number): number {
  return bpm / 60 / 4;
}

/**
 * Convert cycles per second to BPM
 * Assumes 4 beats per cycle
 */
export function cpsToBpm(cps: number): number {
  return cps * 60 * 4;
}
