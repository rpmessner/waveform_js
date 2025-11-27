import { noteToFreq, noteNameToFreq } from '../src/utils/note-to-freq.js';

describe('noteToFreq', () => {
  test('converts MIDI note 69 (A4) to 440 Hz', () => {
    expect(noteToFreq(69)).toBeCloseTo(440, 2);
  });

  test('converts MIDI note 60 (C4) to ~261.63 Hz', () => {
    expect(noteToFreq(60)).toBeCloseTo(261.63, 2);
  });

  test('converts MIDI note 72 (C5) to ~523.25 Hz', () => {
    expect(noteToFreq(72)).toBeCloseTo(523.25, 2);
  });

  test('converts MIDI note 48 (C3) to ~130.81 Hz', () => {
    expect(noteToFreq(48)).toBeCloseTo(130.81, 2);
  });

  test('converts MIDI note 0 to low frequency', () => {
    expect(noteToFreq(0)).toBeCloseTo(8.18, 2);
  });

  test('converts MIDI note 127 to high frequency', () => {
    expect(noteToFreq(127)).toBeCloseTo(12543.85, 2);
  });

  test('octave relationship: note + 12 doubles frequency', () => {
    const freq1 = noteToFreq(60);
    const freq2 = noteToFreq(72);
    expect(freq2 / freq1).toBeCloseTo(2, 5);
  });

  test('semitone relationship: note + 1 increases by ~1.059', () => {
    const freq1 = noteToFreq(60);
    const freq2 = noteToFreq(61);
    expect(freq2 / freq1).toBeCloseTo(Math.pow(2, 1/12), 5);
  });
});

describe('noteNameToFreq', () => {
  test('converts "A4" to 440 Hz', () => {
    expect(noteNameToFreq('A4')).toBeCloseTo(440, 2);
  });

  test('converts "C4" to ~261.63 Hz', () => {
    expect(noteNameToFreq('C4')).toBeCloseTo(261.63, 2);
  });

  test('converts "C5" to ~523.25 Hz', () => {
    expect(noteNameToFreq('C5')).toBeCloseTo(523.25, 2);
  });

  test('converts sharp notes "C#4" correctly', () => {
    expect(noteNameToFreq('C#4')).toBeCloseTo(277.18, 2);
  });

  test('converts flat notes "Db4" correctly', () => {
    expect(noteNameToFreq('Db4')).toBeCloseTo(277.18, 2);
  });

  test('C#4 and Db4 produce same frequency (enharmonic)', () => {
    expect(noteNameToFreq('C#4')).toBeCloseTo(noteNameToFreq('Db4'), 2);
  });

  test('handles negative octaves "C-1"', () => {
    expect(noteNameToFreq('C-1')).toBeCloseTo(8.18, 2);
  });

  test('handles high octaves "C9"', () => {
    expect(noteNameToFreq('C9')).toBeCloseTo(8372.02, 2);
  });

  test('throws error for invalid note name', () => {
    expect(() => noteNameToFreq('X4')).toThrow('Invalid note name');
  });

  test('throws error for missing octave', () => {
    expect(() => noteNameToFreq('C')).toThrow('Invalid note name');
  });

  test('throws error for malformed input', () => {
    expect(() => noteNameToFreq('Csomething')).toThrow('Invalid note name');
  });

  test('converts all natural notes correctly', () => {
    const naturalNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
    const expectedFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];

    naturalNotes.forEach((note, i) => {
      expect(noteNameToFreq(note)).toBeCloseTo(expectedFreqs[i], 2);
    });
  });
});
