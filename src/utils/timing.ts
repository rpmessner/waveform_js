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
