/**
 * Pattern Scheduler
 * High-precision lookahead scheduler for continuous pattern playback
 * Uses Web Audio clock for sample-accurate timing
 */

import { bpmToCps, cpsToBpm } from './utils/timing.js';

/**
 * Default scheduler configuration
 */
const DEFAULT_CONFIG = {
  lookahead: 0.1,        // How far ahead to schedule (seconds)
  scheduleInterval: 25,  // How often to check for events (ms)
  cps: 0.5               // Default cycles per second (120 BPM / 4)
};

/**
 * Scheduler class for pattern playback
 */
export class Scheduler {
  /**
   * Create a new scheduler
   * @param {AudioContext} audioContext - The Web Audio context
   * @param {Function} playFn - Function to call to play events: playFn(event, startTime)
   * @param {Object} config - Configuration options
   */
  constructor(audioContext, playFn, config = {}) {
    if (!audioContext) {
      throw new Error('AudioContext is required');
    }
    if (!playFn || typeof playFn !== 'function') {
      throw new Error('Play function is required');
    }

    this.audioContext = audioContext;
    this.playFn = playFn;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Tempo state
    this._cps = this.config.cps;

    // Timing state
    this._startTime = null;      // Audio context time when scheduler started
    this._currentCycle = 0;      // Current cycle number (integer part)
    this._lastScheduledCycle = -1;  // Last cycle we've scheduled events for

    // Pattern storage: Map of patternId -> { events, queryFn }
    this._patterns = new Map();

    // Running state
    this._isRunning = false;
    this._intervalId = null;

    // Event callbacks
    this._onCycleCallbacks = [];
    this._onEventCallbacks = [];
    this._onStartCallbacks = [];
    this._onStopCallbacks = [];
  }

  // ============================================
  // Tempo Control
  // ============================================

  /**
   * Get current cycles per second
   * @returns {number}
   */
  getCps() {
    return this._cps;
  }

  /**
   * Set cycles per second
   * @param {number} cps - Cycles per second (e.g., 0.5 = 2 seconds per cycle)
   */
  setCps(cps) {
    if (cps <= 0) {
      throw new Error('CPS must be positive');
    }
    this._cps = cps;
  }

  /**
   * Get current BPM (assumes 4 beats per cycle)
   * @returns {number}
   */
  getBpm() {
    return cpsToBpm(this._cps);
  }

  /**
   * Set tempo in BPM (assumes 4 beats per cycle)
   * @param {number} bpm - Beats per minute
   */
  setBpm(bpm) {
    this.setCps(bpmToCps(bpm));
  }

  /**
   * Get current cycle position (including fractional part)
   * @returns {number}
   */
  getCurrentCycle() {
    if (!this._isRunning || this._startTime === null) {
      return 0;
    }
    const elapsed = this.audioContext.currentTime - this._startTime;
    return elapsed * this._cps;
  }

  /**
   * Get current cycle number (integer)
   * @returns {number}
   */
  getCurrentCycleNumber() {
    return Math.floor(this.getCurrentCycle());
  }

  // ============================================
  // Pattern Management
  // ============================================

  /**
   * Schedule a pattern for playback
   * @param {string} id - Unique pattern identifier
   * @param {Array|Function} eventsOrQueryFn - Array of events or query function
   *
   * Events format:
   * [
   *   { start: 0.0, params: { s: 'bd', gain: 0.8 } },
   *   { start: 0.5, params: { s: 'sn' } }
   * ]
   *
   * Query function format:
   * (cycle) => [{ start: 0.0, params: {...} }, ...]
   */
  schedulePattern(id, eventsOrQueryFn) {
    if (!id) {
      throw new Error('Pattern ID is required');
    }

    if (typeof eventsOrQueryFn === 'function') {
      // Dynamic pattern with query function
      this._patterns.set(id, {
        queryFn: eventsOrQueryFn,
        events: null
      });
    } else if (Array.isArray(eventsOrQueryFn)) {
      // Static pattern with event array
      this._patterns.set(id, {
        queryFn: null,
        events: eventsOrQueryFn
      });
    } else {
      throw new Error('Pattern must be an array of events or a query function');
    }
  }

  /**
   * Update an existing pattern (hot-swap)
   * @param {string} id - Pattern identifier
   * @param {Array|Function} eventsOrQueryFn - New events or query function
   */
  updatePattern(id, eventsOrQueryFn) {
    // Same as schedulePattern - overwrites existing
    this.schedulePattern(id, eventsOrQueryFn);
  }

  /**
   * Stop and remove a specific pattern
   * @param {string} id - Pattern identifier
   * @returns {boolean} True if pattern was removed
   */
  stopPattern(id) {
    return this._patterns.delete(id);
  }

  /**
   * Stop all patterns (hush)
   */
  hush() {
    this._patterns.clear();
  }

  /**
   * Get all pattern IDs
   * @returns {string[]}
   */
  getPatternIds() {
    return Array.from(this._patterns.keys());
  }

  /**
   * Check if a pattern exists
   * @param {string} id - Pattern identifier
   * @returns {boolean}
   */
  hasPattern(id) {
    return this._patterns.has(id);
  }

  // ============================================
  // Scheduler Control
  // ============================================

  /**
   * Start the scheduler
   */
  start() {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;
    this._startTime = this.audioContext.currentTime;
    this._currentCycle = 0;
    this._lastScheduledCycle = -1;

    // Fire start callbacks
    this._onStartCallbacks.forEach(cb => {
      try { cb(); } catch (e) { console.error('onStart callback error:', e); }
    });

    // Start the scheduling loop
    this._intervalId = setInterval(() => {
      this._tick();
    }, this.config.scheduleInterval);

    // Run first tick immediately
    this._tick();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;

    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }

    // Fire stop callbacks
    this._onStopCallbacks.forEach(cb => {
      try { cb(); } catch (e) { console.error('onStop callback error:', e); }
    });
  }

  /**
   * Check if scheduler is running
   * @returns {boolean}
   */
  isRunning() {
    return this._isRunning;
  }

  // ============================================
  // Event Callbacks
  // ============================================

  /**
   * Register callback for cycle start
   * @param {Function} callback - Called with (cycleNumber)
   * @returns {Function} Unsubscribe function
   */
  onCycle(callback) {
    this._onCycleCallbacks.push(callback);
    return () => {
      const index = this._onCycleCallbacks.indexOf(callback);
      if (index !== -1) {
        this._onCycleCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for each event
   * @param {Function} callback - Called with (event, startTime, cycleNumber)
   * @returns {Function} Unsubscribe function
   */
  onEvent(callback) {
    this._onEventCallbacks.push(callback);
    return () => {
      const index = this._onEventCallbacks.indexOf(callback);
      if (index !== -1) {
        this._onEventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for scheduler start
   * @param {Function} callback - Called when scheduler starts
   * @returns {Function} Unsubscribe function
   */
  onStart(callback) {
    this._onStartCallbacks.push(callback);
    return () => {
      const index = this._onStartCallbacks.indexOf(callback);
      if (index !== -1) {
        this._onStartCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for scheduler stop
   * @param {Function} callback - Called when scheduler stops
   * @returns {Function} Unsubscribe function
   */
  onStop(callback) {
    this._onStopCallbacks.push(callback);
    return () => {
      const index = this._onStopCallbacks.indexOf(callback);
      if (index !== -1) {
        this._onStopCallbacks.splice(index, 1);
      }
    };
  }

  // ============================================
  // Internal Scheduling
  // ============================================

  /**
   * Main scheduling tick - called periodically
   * @private
   */
  _tick() {
    if (!this._isRunning) {
      return;
    }

    const now = this.audioContext.currentTime;
    const lookaheadEnd = now + this.config.lookahead;

    // Calculate cycle range to schedule
    const currentCyclePos = (now - this._startTime) * this._cps;
    const lookaheadCyclePos = (lookaheadEnd - this._startTime) * this._cps;

    // Determine which cycles we need to schedule
    const startCycle = Math.floor(Math.max(currentCyclePos, this._lastScheduledCycle + 1));
    const endCycle = Math.floor(lookaheadCyclePos);

    // Schedule events for each cycle in the lookahead window
    for (let cycle = startCycle; cycle <= endCycle; cycle++) {
      if (cycle <= this._lastScheduledCycle) {
        continue;
      }

      // Fire cycle callbacks
      this._onCycleCallbacks.forEach(cb => {
        try { cb(cycle); } catch (e) { console.error('onCycle callback error:', e); }
      });

      // Schedule events for this cycle from all patterns
      this._scheduleEventsForCycle(cycle);

      this._lastScheduledCycle = cycle;
    }

    // Update current cycle for external queries
    this._currentCycle = Math.floor(currentCyclePos);
  }

  /**
   * Schedule all events for a specific cycle
   * @param {number} cycle - Cycle number
   * @private
   */
  _scheduleEventsForCycle(cycle) {
    // Calculate the audio context time when this cycle starts
    const cycleStartTime = this._startTime + (cycle / this._cps);
    const cycleDuration = 1 / this._cps;

    // Iterate through all patterns
    for (const [patternId, pattern] of this._patterns) {
      let events;

      if (pattern.queryFn) {
        // Dynamic pattern - call query function
        try {
          events = pattern.queryFn(cycle);
        } catch (e) {
          console.error(`Pattern "${patternId}" query function error:`, e);
          continue;
        }
      } else {
        // Static pattern - use stored events
        events = pattern.events;
      }

      if (!Array.isArray(events)) {
        continue;
      }

      // Schedule each event
      for (const event of events) {
        if (!event || typeof event.start !== 'number') {
          continue;
        }

        // Calculate actual start time
        // event.start is 0.0-1.0 position within cycle
        const eventStartTime = cycleStartTime + (event.start * cycleDuration);

        // Only schedule if in the future
        if (eventStartTime < this.audioContext.currentTime) {
          continue;
        }

        // Fire event callbacks
        this._onEventCallbacks.forEach(cb => {
          try {
            cb(event, eventStartTime, cycle);
          } catch (e) {
            console.error('onEvent callback error:', e);
          }
        });

        // Play the event
        try {
          this.playFn(event.params || event, eventStartTime);
        } catch (e) {
          console.error('Play function error:', e);
        }
      }
    }
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Dispose of the scheduler and clean up resources
   */
  dispose() {
    this.stop();
    this.hush();
    this._onCycleCallbacks = [];
    this._onEventCallbacks = [];
    this._onStartCallbacks = [];
    this._onStopCallbacks = [];
  }
}
