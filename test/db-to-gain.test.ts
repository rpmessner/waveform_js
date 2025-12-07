import { dbToGain, gainToDb, clamp } from '../src/utils/db-to-gain';

describe('dbToGain', () => {
  test('converts 0 dB to gain of 1', () => {
    expect(dbToGain(0)).toBeCloseTo(1, 5);
  });

  test('converts 6 dB to gain of ~2', () => {
    expect(dbToGain(6)).toBeCloseTo(2, 1);
  });

  test('converts -6 dB to gain of ~0.5', () => {
    expect(dbToGain(-6)).toBeCloseTo(0.5, 1);
  });

  test('converts -12 dB to gain of ~0.25', () => {
    expect(dbToGain(-12)).toBeCloseTo(0.25, 2);
  });

  test('converts -60 dB to very small gain', () => {
    expect(dbToGain(-60)).toBeCloseTo(0.001, 4);
  });

  test('converts 20 dB to gain of 10', () => {
    expect(dbToGain(20)).toBeCloseTo(10, 5);
  });

  test('converts -Infinity dB to gain of 0', () => {
    expect(dbToGain(-Infinity)).toBe(0);
  });
});

describe('gainToDb', () => {
  test('converts gain of 1 to 0 dB', () => {
    expect(gainToDb(1)).toBeCloseTo(0, 5);
  });

  test('converts gain of 2 to ~6 dB', () => {
    expect(gainToDb(2)).toBeCloseTo(6, 1);
  });

  test('converts gain of 0.5 to ~-6 dB', () => {
    expect(gainToDb(0.5)).toBeCloseTo(-6, 1);
  });

  test('converts gain of 10 to 20 dB', () => {
    expect(gainToDb(10)).toBeCloseTo(20, 5);
  });

  test('converts gain of 0 to -Infinity dB', () => {
    expect(gainToDb(0)).toBe(-Infinity);
  });

  test('roundtrip: dbToGain(gainToDb(x)) === x', () => {
    const testValues = [0.1, 0.5, 1, 2, 5, 10];
    testValues.forEach(gain => {
      const db = gainToDb(gain);
      const backToGain = dbToGain(db);
      expect(backToGain).toBeCloseTo(gain, 5);
    });
  });

  test('roundtrip: gainToDb(dbToGain(x)) === x', () => {
    const testValues = [-60, -20, -6, 0, 6, 20];
    testValues.forEach(db => {
      const gain = dbToGain(db);
      const backToDb = gainToDb(gain);
      expect(backToDb).toBeCloseTo(db, 5);
    });
  });
});

describe('clamp', () => {
  test('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  test('returns min when value is below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  test('returns max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test('returns value when equal to min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  test('returns value when equal to max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });

  test('works with negative ranges', () => {
    expect(clamp(0, -10, 10)).toBe(0);
    expect(clamp(-15, -10, 10)).toBe(-10);
    expect(clamp(15, -10, 10)).toBe(10);
  });

  test('works with floating point values', () => {
    expect(clamp(0.5, 0, 1)).toBeCloseTo(0.5, 5);
    expect(clamp(1.5, 0, 1)).toBeCloseTo(1, 5);
    expect(clamp(-0.5, 0, 1)).toBeCloseTo(0, 5);
  });

  test('works with very small ranges', () => {
    expect(clamp(0.505, 0, 0.5)).toBe(0.5);
  });
});
