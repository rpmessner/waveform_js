# Phase 3 Complete: Pattern Scheduler

**Date:** 2025-11-27
**Status:** ✅ Complete

## Summary

Phase 3 successfully implemented a high-precision lookahead scheduler for continuous pattern playback. The scheduler uses the Web Audio clock for sample-accurate timing, supports both static and dynamic patterns, and enables hot-swapping patterns without audio glitches.

## Implemented Features

### 1. Lookahead Scheduler (`src/scheduler.js`)

**Core Architecture:**
- Lookahead buffer (100ms default) for scheduling events ahead of time
- Uses Web Audio `currentTime` for drift-free timing
- Periodic tick (25ms interval) checks for events in lookahead window
- Cycle-based timing (0.0-1.0 positions within each cycle)

**Key Methods:**
- `start()` / `stop()` - Control scheduler playback
- `isRunning()` - Check if scheduler is active
- `dispose()` - Clean up all resources

### 2. CPS/BPM Tempo Control

**Tempo Methods:**
- `setCps(cps)` - Set cycles per second
- `getCps()` - Get current CPS
- `setBpm(bpm)` - Set beats per minute (assumes 4 beats/cycle)
- `getBpm()` - Get current BPM
- `getCurrentCycle()` - Get current cycle position (with fractional part)
- `getCurrentCycleNumber()` - Get integer cycle number

**Tempo Conversion:**
```javascript
// BPM = CPS * 60 * 4
// 120 BPM = 0.5 CPS (default)
// 1 cycle = 4 beats = 2 seconds at 120 BPM
```

### 3. Pattern Management

**Static Patterns:**
```javascript
wf.schedulePattern('drums', [
  { start: 0.0, params: { s: 'bd' } },
  { start: 0.25, params: { s: 'hh' } },
  { start: 0.5, params: { s: 'sn' } },
  { start: 0.75, params: { s: 'hh' } }
]);
```

**Pattern Methods:**
- `schedulePattern(id, events)` - Start a pattern
- `updatePattern(id, events)` - Hot-swap (change pattern while playing)
- `stopPattern(id)` - Stop a specific pattern
- `hush()` - Stop all patterns
- `hasPattern(id)` - Check if pattern exists
- `getPatternIds()` - List all active pattern IDs

### 4. Dynamic Patterns (Query Functions)

**Query Function Signature:**
```javascript
wf.schedulePattern('evolving', (cycle) => {
  // Return different events based on cycle number
  const density = Math.min(8, 2 + Math.floor(cycle / 4));
  return Array.from({ length: density }, (_, i) => ({
    start: i / density,
    params: { s: 'hh', gain: i === 0 ? 0.8 : 0.4 }
  }));
});
```

**Use Cases:**
- Patterns that evolve over time
- Random/generative patterns
- Euclidean rhythms
- Melodic sequences that cycle through notes

### 5. Event Callbacks

**Available Callbacks:**
- `onCycle(callback)` - Called at start of each cycle
- `onEvent(callback)` - Called for each scheduled event
- `onStart(callback)` - Called when scheduler starts
- `onStop(callback)` - Called when scheduler stops

**Callback Signatures:**
```javascript
wf.onCycle((cycleNumber) => {
  console.log('Cycle:', cycleNumber);
});

wf.onEvent((event, audioTime, cycleNumber) => {
  console.log('Event:', event.params.s, 'at', audioTime);
});
```

**Unsubscription:**
```javascript
const unsub = wf.onCycle((cycle) => { ... });
// Later:
unsub(); // Remove callback
```

### 6. Waveform Integration

All scheduler methods available directly on Waveform class:
- `wf.schedulePattern(id, events)`
- `wf.updatePattern(id, events)`
- `wf.stopPattern(id)`
- `wf.hush()`
- `wf.startScheduler()` / `wf.stopScheduler()`
- `wf.isSchedulerRunning()`
- `wf.setCps(cps)` / `wf.getCps()`
- `wf.setBpm(bpm)` / `wf.getBpm()`
- `wf.getCurrentCycle()`
- `wf.onCycle(callback)`
- `wf.onEvent(callback)`
- `wf.getScheduler()` - Access Scheduler directly

## API Examples

### Basic Pattern Playback

```javascript
const wf = new Waveform();
await wf.init();

// Load samples
await wf.loadSamples({
  'bd': 'kick.wav',
  'sn': 'snare.wav',
  'hh': 'hihat.wav'
});

// Define pattern
wf.schedulePattern('beat', [
  { start: 0.0, params: { s: 'bd' } },
  { start: 0.5, params: { s: 'sn' } }
]);

// Start playback
wf.setBpm(120);
wf.startScheduler();
```

### Hot-Swapping Patterns

```javascript
// Start with simple pattern
wf.schedulePattern('main', [
  { start: 0.0, params: { s: 'bd' } }
]);
wf.startScheduler();

// Later: swap to more complex pattern
// (takes effect at next cycle boundary)
wf.updatePattern('main', [
  { start: 0.0, params: { s: 'bd' } },
  { start: 0.25, params: { s: 'hh' } },
  { start: 0.5, params: { s: 'sn' } },
  { start: 0.75, params: { s: 'hh' } }
]);
```

### Multiple Concurrent Patterns

```javascript
// Kick pattern
wf.schedulePattern('kick', [
  { start: 0.0, params: { s: 'bd' } },
  { start: 0.5, params: { s: 'bd' } }
]);

// Hi-hat pattern (runs simultaneously)
wf.schedulePattern('hihat', [
  { start: 0.0, params: { s: 'hh', gain: 0.8 } },
  { start: 0.25, params: { s: 'hh', gain: 0.4 } },
  { start: 0.5, params: { s: 'hh', gain: 0.8 } },
  { start: 0.75, params: { s: 'hh', gain: 0.4 } }
]);

wf.startScheduler();

// Stop just the hihat
wf.stopPattern('hihat');
```

### Dynamic Pattern (Euclidean Rhythm)

```javascript
// Euclidean rhythm generator
function euclidean(hits, slots) {
  const events = [];
  for (let i = 0; i < slots; i++) {
    if (Math.floor(i * hits / slots) !== Math.floor((i - 1) * hits / slots)) {
      events.push({
        start: i / slots,
        params: { s: 'bd', gain: 0.8 }
      });
    }
  }
  return events;
}

// Pattern that returns 5 hits over 8 slots
wf.schedulePattern('euclidean', () => euclidean(5, 8));
```

### Evolving Pattern

```javascript
// Pattern that changes each cycle
wf.schedulePattern('evolving', (cycle) => {
  const notes = [60, 64, 67, 72, 67, 64];
  const note = notes[cycle % notes.length];
  return [
    { start: 0.0, params: { s: 'sine', note, release: 0.3 } },
    { start: 0.5, params: { s: 'sine', note: note + 7, release: 0.2, gain: 0.6 } }
  ];
});
```

### UI Integration

```javascript
// Update UI on each cycle
wf.onCycle((cycle) => {
  document.getElementById('cycle').textContent = cycle;
});

// Highlight events in UI
wf.onEvent((event, time, cycle) => {
  const sample = event.params.s;
  highlightSample(sample);
});
```

## Example File

### `examples/scheduler.html`

Interactive demo featuring:
- ✅ Scheduler start/stop controls
- ✅ Real-time cycle display
- ✅ BPM slider with live tempo changes
- ✅ Preset patterns (four on floor, backbeat, 8th/16th hi-hats)
- ✅ Dynamic patterns (evolving, random, euclidean, melody)
- ✅ Active pattern management (add/remove)
- ✅ Custom pattern JSON editor
- ✅ Event log showing scheduled events
- ✅ HUSH button to stop all patterns

**To run:**
```bash
python3 -m http.server 8000
# Open: http://localhost:8000/examples/scheduler.html
```

## Testing

**New Tests: 37 tests in `test/scheduler.test.js`**

Coverage:
- Constructor validation
- Tempo control (CPS/BPM conversion)
- Pattern management (schedule, update, stop, hush)
- Scheduler state (start, stop, running)
- Callback registration and unsubscription
- Cycle position calculations
- Event scheduling logic

**Test Results:**
```
Test Suites: 5 passed, 5 total
Tests:       118 passed, 118 total
```

## Bundle Size

| Bundle | Size | Change from Phase 2 |
|--------|------|---------------------|
| Minified | 14KB | +5KB |
| ES Module | 49KB | +16KB |
| UMD | 53KB | +17KB |

**Analysis:** Added ~5KB minified for full scheduler system. Still well under 50KB target.

## Technical Highlights

### Lookahead Scheduling

The scheduler uses a lookahead buffer to schedule events ahead of time, ensuring sample-accurate timing:

```javascript
_tick() {
  const now = this.audioContext.currentTime;
  const lookaheadEnd = now + this.config.lookahead;  // 100ms ahead

  // Calculate which cycles fall within lookahead window
  const currentCyclePos = (now - this._startTime) * this._cps;
  const lookaheadCyclePos = (lookaheadEnd - this._startTime) * this._cps;

  // Schedule all events for cycles in the window
  for (let cycle = startCycle; cycle <= endCycle; cycle++) {
    this._scheduleEventsForCycle(cycle);
  }
}
```

### Drift-Free Timing

Uses Web Audio clock (`audioContext.currentTime`) instead of JavaScript timers for absolute timing accuracy:

```javascript
// Event start time calculated from cycle position
const cycleStartTime = this._startTime + (cycle / this._cps);
const eventStartTime = cycleStartTime + (event.start * cycleDuration);
```

### Hot-Swap Architecture

Pattern updates take effect at the next cycle boundary:
- Pattern storage updated immediately
- Query function called fresh each cycle
- No audio glitches during updates

## Phase 3 Checklist

From `docs/ROADMAP.md`:

### 3.1 Lookahead Scheduler
- ✅ `Scheduler` class with event queue
- ✅ Lookahead buffer (100ms)
- ✅ Web Audio clock-based scheduling
- ✅ Cycle-based timing (0.0-1.0 positions)

### 3.2 CPS/Tempo Control
- ✅ `setCps(cps)` - cycles per second
- ✅ BPM helper: `setBpm(bpm)` → `setCps(bpm/60/4)`
- ✅ Tempo changes without drift
- ✅ Current cycle tracking

### 3.3 Pattern Management
- ✅ `schedulePattern(id, events)` - start pattern
- ✅ `updatePattern(id, events)` - hot-swap
- ✅ `stopPattern(id)` - stop specific pattern
- ✅ `hush()` - stop all patterns
- ✅ Multiple concurrent patterns

### 3.4 Dynamic Patterns
- ✅ Support query functions: `schedulePattern(id, (cycle) => events)`
- ✅ Cycle number passed to query function
- ✅ Per-cycle event generation

### 3.5 Scheduler Events
- ✅ `onCycle(callback)` - fired each cycle
- ✅ `onEvent(callback)` - fired for each event
- ✅ `onStart/onStop` callbacks

**Deliverable:** ✅ Continuous pattern playback with hot-swap

## MVP Complete!

With Phase 3 complete, waveform_js now has all core functionality for live coding:

| Feature | Phase | Status |
|---------|-------|--------|
| Audio Context Management | 1 | ✅ |
| Oscillator Synths | 1 | ✅ |
| ADSR Envelope | 1 | ✅ |
| Sample Loading | 2 | ✅ |
| Sample Playback | 2 | ✅ |
| SuperDirt Parameters | 1+2 | ✅ |
| Pattern Scheduler | 3 | ✅ |
| Hot-Swap Patterns | 3 | ✅ |
| Dynamic Patterns | 3 | ✅ |
| BPM/CPS Control | 3 | ✅ |

## Next Steps

### Optional Enhancements

**Phase 4 - Effects:**
- Reverb (ConvolverNode)
- Delay with feedback
- Additional filter types

**Phase 5 - WebMIDI:**
- Output to external devices
- Pattern → MIDI translation

**Phase 6 - Advanced:**
- Custom synth definitions
- Audio recording
- Visualization data

## Integration Ready

waveform_js is now ready to integrate with harmony_repl_js:

```javascript
// In harmony_repl_js
const wf = new Waveform();
await wf.init();

// Load samples
await wf.loadSampleBank('samples/manifest.json');

// Receive pattern updates from HarmonyServer
channel.on('pattern_update', ({ id, events }) => {
  wf.updatePattern(id, events);
});

// Start playback
wf.startScheduler();

// UI can subscribe to events
wf.onEvent((event, time, cycle) => {
  highlightInEditor(event);
});
```

---

**Phase 3: COMPLETE** ✅
**MVP (Phases 1-3): COMPLETE** ✅
**Ready for Production Use** 🚀
