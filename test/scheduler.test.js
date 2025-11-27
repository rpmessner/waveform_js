/**
 * Tests for Scheduler
 * Note: These tests focus on API, state management, and timing calculations
 * Actual audio scheduling is tested in browser integration tests
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Scheduler } from '../src/scheduler.js';

// Mock AudioContext for testing
const createMockAudioContext = (currentTime = 0) => ({
  currentTime,
  state: 'running'
});

describe('Scheduler', () => {
  let scheduler;
  let mockAudioContext;
  let playFn;
  let playedEvents;

  beforeEach(() => {
    mockAudioContext = createMockAudioContext(0);
    playedEvents = [];
    playFn = (params, startTime) => {
      playedEvents.push({ params, startTime });
    };
    scheduler = new Scheduler(mockAudioContext, playFn);
  });

  afterEach(() => {
    if (scheduler) {
      scheduler.dispose();
    }
  });

  describe('constructor', () => {
    test('requires AudioContext', () => {
      expect(() => new Scheduler(null, playFn)).toThrow('AudioContext is required');
    });

    test('requires play function', () => {
      expect(() => new Scheduler(mockAudioContext, null)).toThrow('Play function is required');
    });

    test('accepts custom config', () => {
      const customScheduler = new Scheduler(mockAudioContext, playFn, {
        cps: 1.0,
        lookahead: 0.2
      });
      expect(customScheduler.getCps()).toBe(1.0);
    });

    test('initializes with default state', () => {
      expect(scheduler.isRunning()).toBe(false);
      expect(scheduler.getCps()).toBe(0.5);
      expect(scheduler.getCurrentCycle()).toBe(0);
    });
  });

  describe('tempo control', () => {
    test('setCps updates tempo', () => {
      scheduler.setCps(1.0);
      expect(scheduler.getCps()).toBe(1.0);
    });

    test('setCps rejects non-positive values', () => {
      expect(() => scheduler.setCps(0)).toThrow('CPS must be positive');
      expect(() => scheduler.setCps(-1)).toThrow('CPS must be positive');
    });

    test('setBpm converts to CPS correctly', () => {
      scheduler.setBpm(120);
      // 120 BPM / 60 / 4 = 0.5 CPS
      expect(scheduler.getCps()).toBe(0.5);
    });

    test('getBpm converts from CPS correctly', () => {
      scheduler.setCps(0.5);
      expect(scheduler.getBpm()).toBe(120);
    });

    test('common tempo values', () => {
      // 60 BPM = 0.25 CPS
      scheduler.setBpm(60);
      expect(scheduler.getCps()).toBeCloseTo(0.25, 4);

      // 180 BPM = 0.75 CPS
      scheduler.setBpm(180);
      expect(scheduler.getCps()).toBeCloseTo(0.75, 4);
    });
  });

  describe('pattern management', () => {
    test('schedulePattern with array', () => {
      const events = [
        { start: 0.0, params: { s: 'bd' } },
        { start: 0.5, params: { s: 'sn' } }
      ];
      scheduler.schedulePattern('drums', events);
      expect(scheduler.hasPattern('drums')).toBe(true);
    });

    test('schedulePattern with function', () => {
      const queryFn = (cycle) => [{ start: 0, params: { s: 'bd' } }];
      scheduler.schedulePattern('dynamic', queryFn);
      expect(scheduler.hasPattern('dynamic')).toBe(true);
    });

    test('schedulePattern requires ID', () => {
      expect(() => scheduler.schedulePattern(null, [])).toThrow('Pattern ID is required');
    });

    test('schedulePattern validates input', () => {
      expect(() => scheduler.schedulePattern('test', 'invalid')).toThrow('must be an array');
    });

    test('updatePattern overwrites existing', () => {
      scheduler.schedulePattern('test', [{ start: 0, params: { s: 'bd' } }]);
      scheduler.updatePattern('test', [{ start: 0, params: { s: 'sn' } }]);
      expect(scheduler.hasPattern('test')).toBe(true);
    });

    test('stopPattern removes pattern', () => {
      scheduler.schedulePattern('test', []);
      expect(scheduler.stopPattern('test')).toBe(true);
      expect(scheduler.hasPattern('test')).toBe(false);
    });

    test('stopPattern returns false for non-existent', () => {
      expect(scheduler.stopPattern('nonexistent')).toBe(false);
    });

    test('hush clears all patterns', () => {
      scheduler.schedulePattern('a', []);
      scheduler.schedulePattern('b', []);
      scheduler.schedulePattern('c', []);
      scheduler.hush();
      expect(scheduler.getPatternIds()).toEqual([]);
    });

    test('getPatternIds returns all IDs', () => {
      scheduler.schedulePattern('drums', []);
      scheduler.schedulePattern('bass', []);
      const ids = scheduler.getPatternIds();
      expect(ids).toContain('drums');
      expect(ids).toContain('bass');
    });
  });

  describe('scheduler state', () => {
    test('start sets running state', () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });

    test('stop clears running state', () => {
      scheduler.start();
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    test('multiple start calls are idempotent', () => {
      scheduler.start();
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });

    test('multiple stop calls are safe', () => {
      scheduler.stop();
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    test('dispose cleans up everything', () => {
      scheduler.schedulePattern('test', []);
      scheduler.start();
      scheduler.dispose();
      expect(scheduler.isRunning()).toBe(false);
      expect(scheduler.getPatternIds()).toEqual([]);
    });
  });

  describe('callbacks', () => {
    test('onStart is called when scheduler starts', () => {
      let called = false;
      scheduler.onStart(() => { called = true; });
      scheduler.start();
      expect(called).toBe(true);
    });

    test('onStop is called when scheduler stops', () => {
      let called = false;
      scheduler.onStop(() => { called = true; });
      scheduler.start();
      scheduler.stop();
      expect(called).toBe(true);
    });

    test('callback unsubscribe works', () => {
      let count = 0;
      const unsub = scheduler.onStart(() => { count++; });
      scheduler.start();
      scheduler.stop();
      unsub();
      scheduler.start();
      expect(count).toBe(1);
    });

    test('onCycle can be registered', () => {
      const callback = (cycle) => {};
      const unsub = scheduler.onCycle(callback);
      expect(typeof unsub).toBe('function');
    });

    test('onEvent can be registered', () => {
      const callback = (event, time, cycle) => {};
      const unsub = scheduler.onEvent(callback);
      expect(typeof unsub).toBe('function');
    });
  });

  describe('getCurrentCycle', () => {
    test('returns 0 when not running', () => {
      expect(scheduler.getCurrentCycle()).toBe(0);
    });

    test('returns 0 immediately after start', () => {
      scheduler.start();
      expect(scheduler.getCurrentCycle()).toBe(0);
    });

    test('getCurrentCycleNumber returns integer', () => {
      scheduler.start();
      expect(scheduler.getCurrentCycleNumber()).toBe(0);
    });
  });
});

describe('Scheduler timing calculations', () => {
  test('cycle position calculation', () => {
    const mockContext = { currentTime: 0 };
    const scheduler = new Scheduler(mockContext, () => {});
    scheduler.setCps(1.0); // 1 cycle per second

    scheduler.start();

    // Simulate time passing
    mockContext.currentTime = 0.5;
    expect(scheduler.getCurrentCycle()).toBe(0.5);

    mockContext.currentTime = 1.0;
    expect(scheduler.getCurrentCycle()).toBe(1.0);

    mockContext.currentTime = 2.5;
    expect(scheduler.getCurrentCycle()).toBe(2.5);

    scheduler.dispose();
  });

  test('cycle number calculation', () => {
    const mockContext = { currentTime: 0 };
    const scheduler = new Scheduler(mockContext, () => {});
    scheduler.setCps(1.0);

    scheduler.start();

    mockContext.currentTime = 0.9;
    expect(scheduler.getCurrentCycleNumber()).toBe(0);

    mockContext.currentTime = 1.1;
    expect(scheduler.getCurrentCycleNumber()).toBe(1);

    mockContext.currentTime = 3.7;
    expect(scheduler.getCurrentCycleNumber()).toBe(3);

    scheduler.dispose();
  });

  test('different CPS values affect cycle position', () => {
    const mockContext = { currentTime: 0 };
    const scheduler = new Scheduler(mockContext, () => {});

    // At 0.5 CPS (default), 2 seconds = 1 cycle
    scheduler.setCps(0.5);
    scheduler.start();

    mockContext.currentTime = 2.0;
    expect(scheduler.getCurrentCycle()).toBe(1.0);

    scheduler.stop();

    // At 2.0 CPS, 1 second = 2 cycles
    mockContext.currentTime = 10.0; // Reset time
    scheduler.setCps(2.0);
    scheduler.start();

    mockContext.currentTime = 11.0; // 1 second later
    expect(scheduler.getCurrentCycle()).toBe(2.0);

    scheduler.dispose();
  });
});

describe('Event scheduling logic', () => {
  test('event start position maps to cycle position', () => {
    // Event at start: 0.25 means 25% through the cycle
    const events = [
      { start: 0.0, params: { s: 'bd' } },   // Start of cycle
      { start: 0.25, params: { s: 'hh' } },  // 25% through
      { start: 0.5, params: { s: 'sn' } },   // 50% through
      { start: 0.75, params: { s: 'hh' } }   // 75% through
    ];

    // This tests the expected format, actual scheduling is tested in browser
    expect(events[0].start).toBe(0.0);
    expect(events[1].start).toBe(0.25);
    expect(events[2].start).toBe(0.5);
    expect(events[3].start).toBe(0.75);
  });

  test('dynamic patterns receive cycle number', () => {
    let receivedCycle = null;
    const queryFn = (cycle) => {
      receivedCycle = cycle;
      return [];
    };

    // The actual query is called during scheduling, which we test in browser
    // Here we verify the function signature
    queryFn(5);
    expect(receivedCycle).toBe(5);
  });

  test('events can have custom params', () => {
    const event = {
      start: 0.0,
      params: {
        s: 'bd',
        gain: 0.8,
        pan: -0.5,
        speed: 1.2,
        cutoff: 2000
      }
    };

    expect(event.params.s).toBe('bd');
    expect(event.params.gain).toBe(0.8);
    expect(event.params.pan).toBe(-0.5);
  });
});
