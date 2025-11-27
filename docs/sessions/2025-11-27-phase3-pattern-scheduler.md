# Session: Phase 3 - Pattern Scheduler Implementation

**Date:** 2025-11-27
**AI Assistant:** Claude (Opus 4.5)
**User:** rpmessner
**Duration:** ~1 hour

## Session Goals

1. Implement Phase 3 from roadmap: Pattern Scheduler
2. Create lookahead scheduler with Web Audio clock timing
3. Support static and dynamic patterns
4. Enable hot-swapping patterns without audio glitches
5. Add cycle and event callbacks

## Summary

Successfully completed Phase 3 by implementing a high-precision lookahead scheduler. The scheduler uses the Web Audio clock for drift-free timing, supports both static patterns (arrays) and dynamic patterns (query functions), and integrates seamlessly with the Waveform class. Created an interactive demo with preset patterns, dynamic patterns, and real-time controls.

## Work Completed

### 1. Scheduler Class (`src/scheduler.js`)

**Core Architecture:**
```javascript
class Scheduler {
  constructor(audioContext, playFn, config = {}) {
    this.audioContext = audioContext;
    this.playFn = playFn;
    this.config = { lookahead: 0.1, scheduleInterval: 25, cps: 0.5, ...config };
    this._patterns = new Map();
    // ...
  }
}
```

**Lookahead Algorithm:**
- Uses `setInterval` to periodically check for events (every 25ms)
- Schedules events up to 100ms ahead using `audioContext.currentTime`
- Calculates cycle positions based on elapsed time and CPS
- Ensures no events are missed and no duplicates are scheduled

**Key Methods Implemented:**
- `start()` / `stop()` - Control scheduler state
- `isRunning()` - Check running state
- `setCps(cps)` / `getCps()` - Tempo control
- `setBpm(bpm)` / `getBpm()` - BPM convenience
- `getCurrentCycle()` / `getCurrentCycleNumber()` - Position tracking
- `schedulePattern(id, eventsOrQueryFn)` - Add pattern
- `updatePattern(id, eventsOrQueryFn)` - Hot-swap
- `stopPattern(id)` - Remove pattern
- `hush()` - Clear all patterns
- `hasPattern(id)` / `getPatternIds()` - Query patterns
- `onCycle(callback)` - Cycle start callback
- `onEvent(callback)` - Event callback
- `onStart(callback)` / `onStop(callback)` - Lifecycle callbacks
- `dispose()` - Clean up resources

**Event Format:**
```javascript
{
  start: 0.25,  // Position in cycle (0.0-1.0)
  params: {     // Parameters passed to play()
    s: 'bd',
    gain: 0.8,
    pan: -0.5
  }
}
```

### 2. Tempo Control

**CPS/BPM Relationship:**
- CPS = Cycles Per Second
- BPM = Beats Per Minute
- 1 cycle = 4 beats (TidalCycles convention)
- `BPM = CPS * 60 * 4`
- Default: 0.5 CPS = 120 BPM

**Drift-Free Timing:**
```javascript
getCurrentCycle() {
  const elapsed = this.audioContext.currentTime - this._startTime;
  return elapsed * this._cps;
}
```

Uses Web Audio clock (`audioContext.currentTime`) which is:
- Independent of JavaScript event loop
- Sample-accurate
- Monotonically increasing
- Unaffected by main thread blocking

### 3. Pattern Management

**Static Patterns:**
- Array of events stored directly
- Same events play every cycle

**Dynamic Patterns (Query Functions):**
- Function called each cycle with cycle number
- Returns array of events for that specific cycle
- Enables evolving, random, and generative patterns

**Pattern Storage:**
```javascript
this._patterns = new Map();
// Each entry: { queryFn: Function|null, events: Array|null }
```

**Hot-Swap Behavior:**
- `updatePattern()` replaces pattern immediately
- Next `_tick()` uses new pattern
- Change takes effect at next cycle boundary

### 4. Callback System

**Implementation:**
```javascript
onCycle(callback) {
  this._onCycleCallbacks.push(callback);
  return () => {
    const index = this._onCycleCallbacks.indexOf(callback);
    if (index !== -1) {
      this._onCycleCallbacks.splice(index, 1);
    }
  };
}
```

**Features:**
- Returns unsubscribe function
- Error isolation (one callback error doesn't break others)
- Multiple callbacks per event type

### 5. Waveform Integration

**Added to `src/waveform.js`:**

Constructor changes:
```javascript
constructor(options = {}) {
  this.options = options;
  this.initialized = false;
  this._scheduler = null;  // NEW
}
```

Init changes:
```javascript
async init() {
  await AudioContextManager.init(this.options);
  Samples.init(AudioContextManager.getContext());

  // NEW: Initialize scheduler
  this._scheduler = new Scheduler(
    AudioContextManager.getContext(),
    (params, startTime) => this.play(params, startTime),
    this.options.scheduler
  );

  this.initialized = true;
  return this;
}
```

**Convenience Methods Added:**
- `schedulePattern(id, events)`
- `updatePattern(id, events)`
- `stopPattern(id)`
- `hush()`
- `startScheduler()` / `stopScheduler()`
- `isSchedulerRunning()`
- `setCps(cps)` / `getCps()`
- `setBpm(bpm)` / `getBpm()`
- `getCurrentCycle()`
- `onCycle(callback)`
- `onEvent(callback)`
- `getScheduler()`

### 6. Testing

**New Test File: `test/scheduler.test.js`**

37 tests covering:
- Constructor validation
- Tempo control (CPS/BPM)
- Pattern management
- Scheduler state
- Callbacks
- Timing calculations

**All Tests Pass:**
```
Test Suites: 5 passed, 5 total
Tests:       118 passed, 118 total
```

### 7. Interactive Demo (`examples/scheduler.html`)

**Features:**
- Initialize and generate samples
- Start/stop scheduler
- Real-time cycle display
- BPM slider (60-200)
- Preset patterns:
  - Four on Floor
  - Backbeat
  - 8th Hi-Hats
  - 16th Hi-Hats
  - Syncopated
  - Offbeat Kick
- Dynamic patterns:
  - Evolving (density increases over cycles)
  - Random (different each cycle)
  - Euclidean (5,8) algorithm
  - Simple Melody (cycles through notes)
- Active pattern list with remove buttons
- Custom pattern JSON editor
- Event log with timestamps
- HUSH button

## Key Decisions & Rationale

### 1. Lookahead Buffer Size (100ms)

**Decision:** 100ms lookahead, 25ms check interval

**Rationale:**
- 100ms is long enough to survive occasional JavaScript hiccups
- Short enough for responsive tempo changes
- 25ms interval gives ~4 checks per lookahead window
- Balance between precision and CPU usage

### 2. setInterval vs AudioWorklet

**Decision:** Use `setInterval` with lookahead, not AudioWorklet

**Rationale:**
- AudioWorklet adds complexity for scheduling
- Lookahead pattern is well-proven (used by Tone.js, Strudel)
- `setInterval` is sufficient with proper lookahead
- Easier to debug and reason about
- Works in all browsers without polyfills

### 3. Cycle-Based Timing

**Decision:** Events use 0.0-1.0 cycle position, not absolute time

**Rationale:**
- Matches TidalCycles pattern model
- Tempo-independent event positions
- Easy to subdivide (0.25 = beat 2 of 4)
- Natural for pattern generation

### 4. Query Functions for Dynamic Patterns

**Decision:** Support `(cycle) => events[]` function signature

**Rationale:**
- Enables generative patterns
- Per-cycle randomization
- Evolving patterns based on cycle number
- No special data structures needed
- Compatible with functional programming style

### 5. Hot-Swap via Replacement

**Decision:** `updatePattern()` replaces entire pattern

**Rationale:**
- Simple mental model
- No partial updates to reason about
- Clean break at cycle boundaries
- Predictable behavior

## Technical Challenges & Solutions

### Challenge 1: Preventing Duplicate Events

**Problem:** Events could be scheduled multiple times if tick runs twice in same cycle.

**Solution:** Track `_lastScheduledCycle` and skip cycles already scheduled:
```javascript
if (cycle <= this._lastScheduledCycle) {
  continue;
}
this._lastScheduledCycle = cycle;
```

### Challenge 2: Jest Open Handles

**Problem:** Tests hung due to `setInterval` not being cleared.

**Solution:** Add `afterEach` to call `dispose()` and explicit cleanup in standalone tests:
```javascript
afterEach(() => {
  if (scheduler) {
    scheduler.dispose();
  }
});
```

### Challenge 3: Cycle Calculation on Restart

**Problem:** `getCurrentCycle()` showed wrong value after stop/start.

**Solution:** Reset `_startTime` on each `start()` call:
```javascript
start() {
  this._startTime = this.audioContext.currentTime;
  this._lastScheduledCycle = -1;
  // ...
}
```

### Challenge 4: Callback Error Isolation

**Problem:** One callback throwing could break scheduler.

**Solution:** Wrap callbacks in try/catch:
```javascript
this._onCycleCallbacks.forEach(cb => {
  try { cb(cycle); } catch (e) { console.error('onCycle error:', e); }
});
```

## Performance Metrics

**Bundle Sizes:**
- Minified: 14KB (was 9KB in Phase 2)
- ES Module: 49KB
- UMD: 53KB

**Test Performance:**
- 118 tests in ~450ms
- No hanging processes

**Scheduler Overhead:**
- setInterval at 25ms
- Minimal CPU when idle
- Efficient Map-based pattern storage

## Files Created/Modified

### Created (3 files):

1. **`src/scheduler.js`** (340 lines)
   - Scheduler class
   - Lookahead algorithm
   - Pattern management
   - Callback system

2. **`test/scheduler.test.js`** (340 lines)
   - 37 unit tests
   - Constructor tests
   - State management tests
   - Timing calculation tests

3. **`examples/scheduler.html`** (400 lines)
   - Interactive demo
   - Preset patterns
   - Dynamic patterns
   - Custom pattern editor

### Modified (2 files):

1. **`src/waveform.js`**
   - Import Scheduler
   - Initialize in `init()`
   - Add convenience methods

2. **`src/index.js`**
   - Export Scheduler

### Documentation (2 files):

1. **`PHASE3_COMPLETE.md`**
   - Phase completion summary
   - API examples
   - Technical details

2. **`docs/sessions/2025-11-27-phase3-pattern-scheduler.md`** (this file)

## Testing the Implementation

### Run Unit Tests

```bash
npm test
# Test Suites: 5 passed, 5 total
# Tests:       118 passed, 118 total
```

### Test in Browser

```bash
python3 -m http.server 8000
# Open: http://localhost:8000/examples/scheduler.html
```

**What to Try:**
1. Click "Initialize Waveform"
2. Click "Generate Samples"
3. Click preset patterns to add them
4. Click "Start" to begin playback
5. Adjust BPM slider (hear tempo change)
6. Try dynamic patterns (evolving, random, euclidean)
7. Edit custom pattern JSON
8. Click "HUSH" to stop all patterns

## MVP Complete!

With Phase 3 done, waveform_js has all core functionality:

| Feature | Status |
|---------|--------|
| AudioContext management | ✅ |
| Oscillator synths | ✅ |
| ADSR envelope | ✅ |
| Sample loading | ✅ |
| Sample playback | ✅ |
| SuperDirt parameters | ✅ |
| Pattern scheduler | ✅ |
| Hot-swap patterns | ✅ |
| Dynamic patterns | ✅ |
| BPM/CPS control | ✅ |
| Event callbacks | ✅ |

## Integration with HarmonyServer

Ready for harmony_repl_js integration:

```javascript
// harmony_repl_js code
const wf = new Waveform();
await wf.init();

// Load samples once
await wf.loadSampleBank('samples/manifest.json');

// Subscribe to pattern updates from server
channel.on('pattern', ({ id, events }) => {
  wf.updatePattern(id, events);
});

// Start scheduler
wf.startScheduler();

// UI highlighting
wf.onEvent((event, time, cycle) => {
  editor.highlightEvent(event);
});
```

## Next Steps

### Optional Future Phases

**Phase 4 - Effects:**
- Reverb, delay, distortion
- Effects chain routing

**Phase 5 - WebMIDI:**
- Output to external devices

**Phase 6 - Advanced:**
- Custom synth definitions
- Audio recording
- Visualization

### Potential Improvements

1. **Configurable lookahead** - Allow runtime adjustment
2. **Pattern quantization** - Align pattern starts to cycles
3. **Tempo ramps** - Smooth tempo transitions
4. **Pattern chaining** - Sequential pattern playback
5. **Polyrhythms** - Different cycle lengths per pattern

## Lessons Learned

### 1. Lookahead Is Essential

JavaScript's event loop is unreliable for audio timing. Scheduling ahead using Web Audio clock is the proven solution.

### 2. Query Functions Are Powerful

Dynamic patterns via query functions enable:
- Generative music
- Probabilistic events
- Evolving compositions
- Algorithmic rhythms

### 3. Clean Callback Patterns

Returning unsubscribe functions is cleaner than storing IDs:
```javascript
const unsub = wf.onCycle(cb);
// Later:
unsub();
```

### 4. Test Cleanup Matters

Always dispose of schedulers in tests to prevent hanging processes.

## References

**Lookahead Scheduling:**
- [A Tale of Two Clocks](https://www.html5rocks.com/en/tutorials/audio/scheduling/)
- Tone.js Transport implementation
- Strudel scheduler

**TidalCycles Concepts:**
- Cycle-based timing
- Pattern hot-swapping
- Query functions

---

**Session End:** 2025-11-27
**Status:** Success ✅
**MVP Complete:** Phases 1-3 ✅
**Next:** Optional Phase 4 (Effects) or Phase 5 (WebMIDI)
