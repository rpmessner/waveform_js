/**
 * Convert MIDI note number to frequency in Hz
 * @param {number} note - MIDI note number (0-127)
 * @returns {number} Frequency in Hz
 */
export function noteToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/**
 * Convert note name to frequency in Hz
 * Examples: 'C4', 'A4', 'F#5', 'Bb3'
 * @param {string} noteName - Note name with octave
 * @returns {number} Frequency in Hz
 */
export function noteNameToFreq(noteName) {
  const noteMap = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
  };

  const match = noteName.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  const [, note, octave] = match;
  const midiNote = (parseInt(octave) + 1) * 12 + noteMap[note];
  return noteToFreq(midiNote);
}
