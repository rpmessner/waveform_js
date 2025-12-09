/**
 * Pattern Scheduler
 * High-precision lookahead scheduler for continuous pattern playback
 * Uses Web Audio clock for sample-accurate timing
 */

import { bpmToCps, cpsToBpm } from './utils/timing';
import type {
  SchedulerInstance,
  SchedulerConfig,
  PatternEvent,
  PatternQueryFn,
  PlayFn,
  Unsubscribe,
  SoundParams
} from './types';

/**
 * Default scheduler configuration
 */
const DEFAULT_CONFIG: Required<SchedulerConfig> = {
  lookahead: 0.1,
  scheduleInterval: 25,
  cps: 0.5
};

interface CallbackRegistry<T extends (...args: never[]) => void> {
  add: (callback: T) => Unsubscribe;
  fire: (...args: Parameters<T>) => void;
  clear: () => void;
}

/**
 * Create a callback registry with subscribe/unsubscribe pattern
 */
function createCallbackRegistry<T extends (...args: never[]) => void>(): CallbackRegistry<T> {
  let callbacks: T[] = [];

  const add = (callback: T): Unsubscribe => {
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  };

  const fire = (...args: Parameters<T>): void => {
    callbacks.forEach(cb => {
      try { (cb as (...a: Parameters<T>) => void)(...args); } catch (e) { console.error('Callback error:', e); }
    });
  };

  const clear = (): void => { callbacks = []; };

  return { add, fire, clear };
}

interface Pattern {
  queryFn: PatternQueryFn | null;
  events: PatternEvent[] | null;
}

interface SchedulerOptions {
  audioContext: AudioContext;
  playFn: PlayFn;
  config?: SchedulerConfig;
}

/**
 * Create a scheduler instance
 */
export const createScheduler = ({ audioContext, playFn, config = {} }: SchedulerOptions): SchedulerInstance => {
  if (!audioContext) {
    throw new Error('AudioContext is required');
  }
  if (!playFn || typeof playFn !== 'function') {
    throw new Error('Play function is required');
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };

  // State
  let cps = cfg.cps;
  let startTime: number | null = null;
  let lastScheduledCycle = -1;
  const patterns = new Map<string, Pattern>();
  let isRunning = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Callback registries
  const onCycleCallbacks = createCallbackRegistry<(cycle: number) => void>();
  const onEventCallbacks = createCallbackRegistry<(event: PatternEvent, startTime: number, cycle: number) => void>();
  const onStartCallbacks = createCallbackRegistry<() => void>();
  const onStopCallbacks = createCallbackRegistry<() => void>();

  // ============================================
  // Tempo Control
  // ============================================

  const getCps = (): number => cps;

  const setCps = (newCps: number): void => {
    if (newCps <= 0) {
      throw new Error('CPS must be positive');
    }
    cps = newCps;
  };

  const getBpm = (): number => cpsToBpm(cps);

  const setBpm = (bpm: number): void => setCps(bpmToCps(bpm));

  const getCurrentCycle = (): number => {
    if (!isRunning || startTime === null) {
      return 0;
    }
    const elapsed = audioContext.currentTime - startTime;
    return elapsed * cps;
  };

  const getCurrentCycleNumber = (): number => Math.floor(getCurrentCycle());

  // ============================================
  // Pattern Management
  // ============================================

  const schedulePattern = (id: string, eventsOrQueryFn: PatternEvent[] | PatternQueryFn): void => {
    if (!id) {
      throw new Error('Pattern ID is required');
    }

    if (typeof eventsOrQueryFn === 'function') {
      patterns.set(id, { queryFn: eventsOrQueryFn, events: null });
    } else if (Array.isArray(eventsOrQueryFn)) {
      patterns.set(id, { queryFn: null, events: eventsOrQueryFn });
    } else {
      throw new Error('Pattern must be an array of events or a query function');
    }
  };

  const updatePattern = (id: string, eventsOrQueryFn: PatternEvent[] | PatternQueryFn): void => {
    schedulePattern(id, eventsOrQueryFn);
  };

  const stopPattern = (id: string): boolean => patterns.delete(id);

  const hush = (): void => patterns.clear();

  const getPatternIds = (): string[] => Array.from(patterns.keys());

  const hasPattern = (id: string): boolean => patterns.has(id);

  const getPattern = (id: string): Pattern | undefined => patterns.get(id);

  const getPatterns = (): Map<string, Pattern> => patterns;

  // ============================================
  // Internal Scheduling
  // ============================================

  const scheduleEventsForCycle = (cycle: number): void => {
    if (startTime === null) return;

    const cycleStartTime = startTime + (cycle / cps);
    const cycleDuration = 1 / cps;

    patterns.forEach((pattern, patternId) => {
      let events: PatternEvent[] | null;

      if (pattern.queryFn) {
        try {
          events = pattern.queryFn(cycle);
        } catch (e) {
          console.error(`Pattern "${patternId}" query function error:`, e);
          return;
        }
      } else {
        events = pattern.events;
      }

      if (!Array.isArray(events)) return;

      events.forEach(event => {
        if (!event || typeof event.start !== 'number') return;

        const params = (event.params || event) as SoundParams;
        const eventStartTime = cycleStartTime + (event.start * cycleDuration);

        if (eventStartTime < audioContext.currentTime) return;

        onEventCallbacks.fire(event, eventStartTime, cycle);

        try {
          playFn(params, eventStartTime);
        } catch (e) {
          console.error('Play function error:', e);
        }
      });
    });
  };

  const tick = (): void => {
    if (!isRunning || startTime === null) return;

    const now = audioContext.currentTime;
    const lookaheadEnd = now + cfg.lookahead;

    const currentCyclePos = (now - startTime) * cps;
    const lookaheadCyclePos = (lookaheadEnd - startTime) * cps;

    const cyclesToSchedule: number[] = [];
    for (let cycle = Math.floor(Math.max(currentCyclePos, lastScheduledCycle + 1)); cycle <= Math.floor(lookaheadCyclePos); cycle++) {
      if (cycle > lastScheduledCycle) {
        cyclesToSchedule.push(cycle);
      }
    }

    cyclesToSchedule.forEach(cycle => {
      onCycleCallbacks.fire(cycle);
      scheduleEventsForCycle(cycle);
      lastScheduledCycle = cycle;
    });
  };

  // ============================================
  // Scheduler Control
  // ============================================

  const start = (): void => {
    if (isRunning) return;

    isRunning = true;
    startTime = audioContext.currentTime;
    lastScheduledCycle = -1;

    onStartCallbacks.fire();

    intervalId = setInterval(tick, cfg.scheduleInterval);
    tick(); // Run first tick immediately
  };

  const stop = (): void => {
    if (!isRunning) return;

    isRunning = false;

    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }

    onStopCallbacks.fire();
  };

  const getIsRunning = (): boolean => isRunning;

  // ============================================
  // Cleanup
  // ============================================

  const dispose = (): void => {
    stop();
    hush();
    onCycleCallbacks.clear();
    onEventCallbacks.clear();
    onStartCallbacks.clear();
    onStopCallbacks.clear();
  };

  return {
    // Tempo
    getCps,
    setCps,
    getBpm,
    setBpm,
    getCurrentCycle,
    getCurrentCycleNumber,
    // Patterns
    schedulePattern,
    updatePattern,
    stopPattern,
    hush,
    getPatternIds,
    hasPattern,
    getPattern,
    getPatterns,
    // Control
    start,
    stop,
    isRunning: getIsRunning,
    // Callbacks
    onCycle: onCycleCallbacks.add,
    onEvent: onEventCallbacks.add,
    onStart: onStartCallbacks.add,
    onStop: onStopCallbacks.add,
    // Cleanup
    dispose
  };
};
