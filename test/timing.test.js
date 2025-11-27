import { bpmToCps, cpsToBpm } from '../src/utils/timing.js';

describe('bpmToCps', () => {
  test('converts 120 BPM to 0.5 CPS', () => {
    expect(bpmToCps(120)).toBeCloseTo(0.5, 5);
  });

  test('converts 60 BPM to 0.25 CPS', () => {
    expect(bpmToCps(60)).toBeCloseTo(0.25, 5);
  });

  test('converts 240 BPM to 1.0 CPS', () => {
    expect(bpmToCps(240)).toBeCloseTo(1.0, 5);
  });

  test('converts 480 BPM to 2.0 CPS', () => {
    expect(bpmToCps(480)).toBeCloseTo(2.0, 5);
  });

  test('converts 90 BPM to 0.375 CPS', () => {
    expect(bpmToCps(90)).toBeCloseTo(0.375, 5);
  });

  test('handles fractional BPM', () => {
    expect(bpmToCps(130.5)).toBeCloseTo(0.54375, 5);
  });

  test('assumes 4 beats per cycle', () => {
    // 120 BPM = 2 beats per second = 0.5 cycles per second (4 beats/cycle)
    expect(bpmToCps(120)).toBeCloseTo(0.5, 5);
  });
});

describe('cpsToBpm', () => {
  test('converts 0.5 CPS to 120 BPM', () => {
    expect(cpsToBpm(0.5)).toBeCloseTo(120, 5);
  });

  test('converts 0.25 CPS to 60 BPM', () => {
    expect(cpsToBpm(0.25)).toBeCloseTo(60, 5);
  });

  test('converts 1.0 CPS to 240 BPM', () => {
    expect(cpsToBpm(1.0)).toBeCloseTo(240, 5);
  });

  test('converts 2.0 CPS to 480 BPM', () => {
    expect(cpsToBpm(2.0)).toBeCloseTo(480, 5);
  });

  test('converts 0.375 CPS to 90 BPM', () => {
    expect(cpsToBpm(0.375)).toBeCloseTo(90, 5);
  });

  test('handles fractional CPS', () => {
    expect(cpsToBpm(0.54375)).toBeCloseTo(130.5, 5);
  });

  test('roundtrip: bpmToCps(cpsToBpm(x)) === x', () => {
    const testValues = [0.25, 0.5, 1.0, 1.5, 2.0];
    testValues.forEach(cps => {
      const bpm = cpsToBpm(cps);
      const backToCps = bpmToCps(bpm);
      expect(backToCps).toBeCloseTo(cps, 5);
    });
  });

  test('roundtrip: cpsToBpm(bpmToCps(x)) === x', () => {
    const testValues = [60, 90, 120, 140, 180, 240];
    testValues.forEach(bpm => {
      const cps = bpmToCps(bpm);
      const backToBpm = cpsToBpm(cps);
      expect(backToBpm).toBeCloseTo(bpm, 5);
    });
  });
});

describe('BPM/CPS conversion consistency', () => {
  test('relationship follows 4 beats per cycle', () => {
    // Formula: CPS = BPM / 60 / 4
    // So: 120 BPM = 120 / 60 / 4 = 2 / 4 = 0.5 CPS
    expect(bpmToCps(120)).toBeCloseTo(120 / 60 / 4, 10);
  });

  test('common tempo conversions', () => {
    const bpmValues = [60, 90, 120, 140, 180, 240];

    bpmValues.forEach(bpm => {
      const cps = bpmToCps(bpm);
      const backToBpm = cpsToBpm(cps);
      // Test roundtrip conversion
      expect(backToBpm).toBeCloseTo(bpm, 5);
    });
  });
});
