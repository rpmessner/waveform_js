/**
 * Tests for effects module
 * Note: These tests focus on effect creation and parameters
 * Actual audio processing is tested in browser integration tests
 */

import { describe, test, expect } from '@jest/globals';
import {
  makeDistortionCurve,
  makeHardClipCurve
} from '../src/effects/distortion';
import { mapResonanceToQ, FILTER_TYPES } from '../src/effects/filter';
import { hasEffects } from '../src/effects/index';

describe('Distortion curves', () => {
  test('makeDistortionCurve returns Float32Array', () => {
    const curve = makeDistortionCurve(0.5, 1000);
    expect(curve).toBeInstanceOf(Float32Array);
    expect(curve.length).toBe(1000);
  });

  test('makeDistortionCurve with zero amount is linear', () => {
    const curve = makeDistortionCurve(0, 1000);
    // At midpoint (index 500), input is ~0, output should be ~0
    expect(Math.abs(curve[500])).toBeLessThan(0.01);
    // At start (index 0), input is -1
    expect(curve[0]).toBeLessThan(0);
    // At end (index 999), input is ~1
    expect(curve[999]).toBeGreaterThan(0);
  });

  test('makeDistortionCurve with high amount is compressed', () => {
    const curve = makeDistortionCurve(1.0, 1000);
    // High distortion should compress peaks
    // Values near extremes should be pushed toward limits
    expect(Math.abs(curve[999])).toBeLessThan(1.5);
  });

  test('makeHardClipCurve clips at threshold', () => {
    const curve = makeHardClipCurve(0.5, 1000);
    // All values should be within threshold
    for (let i = 0; i < curve.length; i++) {
      expect(curve[i]).toBeGreaterThanOrEqual(-0.5);
      expect(curve[i]).toBeLessThanOrEqual(0.5);
    }
  });

  test('makeHardClipCurve with threshold 1.0 is linear', () => {
    const curve = makeHardClipCurve(1.0, 1000);
    // First value should be close to -1
    expect(curve[0]).toBeCloseTo(-1, 1);
    // Last value should be close to 1
    expect(curve[999]).toBeCloseTo(1, 1);
  });
});

describe('Filter utilities', () => {
  test('mapResonanceToQ returns appropriate range', () => {
    // Resonance 0 should give low Q
    const lowQ = mapResonanceToQ(0);
    expect(lowQ).toBeCloseTo(0.7, 1);

    // Resonance 1 should give high Q
    const highQ = mapResonanceToQ(1);
    expect(highQ).toBeGreaterThan(15);
    expect(highQ).toBeLessThan(25);
  });

  test('mapResonanceToQ is monotonically increasing', () => {
    let lastQ = 0;
    for (let r = 0; r <= 1; r += 0.1) {
      const q = mapResonanceToQ(r);
      expect(q).toBeGreaterThanOrEqual(lastQ);
      lastQ = q;
    }
  });

  test('FILTER_TYPES contains expected types', () => {
    expect(FILTER_TYPES.lowpass).toBe('lowpass');
    expect(FILTER_TYPES.highpass).toBe('highpass');
    expect(FILTER_TYPES.bandpass).toBe('bandpass');
    expect(FILTER_TYPES.notch).toBe('notch');
  });
});

describe('hasEffects', () => {
  test('returns false for empty params', () => {
    expect(hasEffects({})).toBe(false);
  });

  test('returns false for non-effect params', () => {
    expect(hasEffects({ s: 'bd', gain: 0.8, pan: -0.5 })).toBe(false);
    expect(hasEffects({ note: 60, cutoff: 2000 })).toBe(false); // cutoff is handled separately
  });

  test('returns true for room parameter', () => {
    expect(hasEffects({ room: 0.5 })).toBe(true);
  });

  test('returns true for delay parameter', () => {
    expect(hasEffects({ delay: 0.3 })).toBe(true);
  });

  test('returns true for shape parameter', () => {
    expect(hasEffects({ shape: 0.5 })).toBe(true);
  });

  test('returns true for crush parameter', () => {
    expect(hasEffects({ crush: 8 })).toBe(true);
  });

  test('returns true for hcutoff parameter', () => {
    expect(hasEffects({ hcutoff: 500 })).toBe(true);
  });

  test('returns true for bandf parameter', () => {
    expect(hasEffects({ bandf: 1000 })).toBe(true);
  });

  test('returns true for multiple effect params', () => {
    expect(hasEffects({ room: 0.3, delay: 0.2, shape: 0.1 })).toBe(true);
  });
});

describe('Effect parameter ranges', () => {
  test('room should be 0-1', () => {
    // Document expected range
    const validRoom = { room: 0.5 };
    expect(hasEffects(validRoom)).toBe(true);
  });

  test('delay should be 0-1', () => {
    const validDelay = { delay: 0.5, delaytime: 0.25, delayfeedback: 0.5 };
    expect(hasEffects(validDelay)).toBe(true);
  });

  test('shape should be 0-1', () => {
    const validShape = { shape: 0.5 };
    expect(hasEffects(validShape)).toBe(true);
  });

  test('crush should be 1-16', () => {
    const validCrush = { crush: 8 };
    expect(hasEffects(validCrush)).toBe(true);
  });
});

describe('SuperDirt parameter compatibility', () => {
  // These tests document the expected SuperDirt-compatible parameters

  test('reverb parameters', () => {
    const params = {
      room: 0.5,  // wet/dry amount
      size: 0.7   // room size
    };
    expect(hasEffects(params)).toBe(true);
  });

  test('delay parameters', () => {
    const params = {
      delay: 0.3,           // wet/dry amount
      delaytime: 0.125,     // delay time in seconds
      delayfeedback: 0.5    // feedback amount
    };
    expect(hasEffects(params)).toBe(true);
  });

  test('filter parameters', () => {
    const params = {
      cutoff: 2000,      // lowpass cutoff (Hz)
      resonance: 0.5,    // filter resonance
      hcutoff: 100,      // highpass cutoff (Hz)
      bandf: 1000,       // bandpass center frequency
      bandq: 2           // bandpass Q
    };
    // Note: cutoff/resonance are handled in synth, others in effects
    expect(hasEffects(params)).toBe(true);
  });

  test('distortion parameters', () => {
    const params = {
      shape: 0.5,   // distortion amount
      crush: 8      // bitcrusher bit depth
    };
    expect(hasEffects(params)).toBe(true);
  });
});
