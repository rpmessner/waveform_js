# waveform_js - Development Roadmap

**Status**: Core Complete (Phases 1-4)
**Purpose**: Web Audio transport layer for browser-based live coding
**Last Updated**: 2025-11-27

---

## Project Vision

**Goal**: A low-level audio transport layer that handles Web Audio synthesis, sample playback, scheduling, and WebMIDI output.

**Non-Goals**:

- UI components
- Pattern parsing
- Music theory
- Server communication

---

## Architecture

### Module Structure

```
waveform_js/
├── src/
│   ├── index.js              # Main Waveform class export
│   ├── audio-context.js      # AudioContext lifecycle management
│   ├── scheduler.js          # Pattern scheduler (lookahead)
│   ├── synths/
│   │   ├── index.js          # Synth registry and factory
│   │   ├── oscillator.js     # Basic oscillators
│   │   ├── sampler.js        # Sample playback
│   │   └── envelope.js       # ADSR envelope
│   ├── effects/
│   │   ├── index.js          # Effects chain management
│   │   ├── reverb.js         # ConvolverNode reverb
│   │   ├── delay.js          # DelayNode
│   │   ├── filter.js         # BiquadFilterNode
│   │   └── distortion.js     # WaveShaperNode
│   ├── samples/
│   │   ├── index.js          # Sample manager
│   │   ├── loader.js         # Audio buffer loading
│   │   └── bank.js           # Sample bank management
│   ├── midi/
│   │   ├── index.js          # WebMIDI facade
│   │   ├── output.js         # MIDI output handling
│   │   └── clock.js          # MIDI clock (future)
│   └── utils/
│       ├── note-to-freq.js   # MIDI note → frequency
│       ├── db-to-gain.js     # dB → linear gain
│       └── timing.js         # Audio timing utilities
├── dist/
│   ├── waveform.js           # UMD bundle
│   ├── waveform.min.js       # Minified
│   └── waveform.esm.js       # ES module
├── examples/
│   ├── basic.html            # Simple playback example
│   ├── scheduler.html        # Pattern scheduling
│   └── midi.html             # WebMIDI output
├── test/
│   └── ...
├── package.json
├── rollup.config.js
└── README.md
```

### Core Classes

```javascript
// Main export structure
export { Waveform } from './index.js';
export { Scheduler } from './scheduler.js';
export { Synth } from './synths/index.js';
export { Samples } from './samples/index.js';
export { MIDI } from './midi/index.js';
export { Effects } from './effects/index.js';
```

---

## Phase 1: Audio Context Foundation

**Goal**: Basic audio playback working

### 1.1 AudioContext Management

- [ ] `Waveform` class with init/suspend/resume/close
- [ ] Handle browser autoplay policy (require user gesture)
- [ ] Master gain node
- [ ] Audio destination routing
- [ ] State management (suspended, running, closed)

### 1.2 Basic Oscillator Synth

- [ ] Sine, saw, square, triangle oscillators
- [ ] Note parameter (MIDI note → frequency)
- [ ] Amp/gain parameter
- [ ] Basic ADSR envelope
- [ ] Auto-cleanup (stop and disconnect after release)

### 1.3 Simple Play API

- [ ] `Waveform.play({ s: 'sine', note: 60 })`
- [ ] Parameter mapping (SuperDirt-compatible names)
- [ ] Duration/sustain handling

**Deliverable**: Can play basic synth tones in browser

---

## Phase 2: Sample Playback

**Goal**: Load and play samples like SuperDirt

### 2.1 Sample Loading

- [ ] `Samples.load(name, url)` - load single sample
- [ ] AudioBuffer decoding
- [ ] Error handling (404, decode failure)
- [ ] Loading progress events

### 2.2 Sample Bank Loading

- [ ] `Samples.loadBank(baseUrl)` - load directory structure
- [ ] JSON manifest format for sample banks
- [ ] Lazy loading option (load on first play)

### 2.3 Sample Playback

- [ ] `s` parameter - sample name
- [ ] `n` parameter - sample variant (bd:0, bd:1, etc.)
- [ ] `speed` parameter - playback rate
- [ ] `begin`/`end` parameters - sample slice
- [ ] `gain` parameter - volume
- [ ] `pan` parameter - stereo position

**Deliverable**: Can load and play samples with SuperDirt parameters

---

## Phase 3: Pattern Scheduler

**Goal**: High-precision continuous pattern playback

### 3.1 Lookahead Scheduler

- [ ] `Scheduler` class with event queue
- [ ] Lookahead buffer (100-200ms)
- [ ] Web Audio clock-based scheduling
- [ ] Cycle-based timing (0.0-1.0 positions)

### 3.2 CPS/Tempo Control

- [ ] `setCps(cps)` - cycles per second
- [ ] BPM helper: `setBpm(bpm)` → `setCps(bpm/60/4)`
- [ ] Tempo changes without drift
- [ ] Current cycle tracking

### 3.3 Pattern Management

- [ ] `schedulePattern(id, events)` - start pattern
- [ ] `updatePattern(id, events)` - hot-swap
- [ ] `stopPattern(id)` - stop specific pattern
- [ ] `hush()` - stop all patterns
- [ ] Multiple concurrent patterns

### 3.4 Dynamic Patterns

- [ ] Support query functions: `schedulePattern(id, (cycle) => events)`
- [ ] Cycle number passed to query function
- [ ] Per-cycle event generation

### 3.5 Scheduler Events

- [ ] `onCycle(callback)` - fired each cycle
- [ ] `onEvent(callback)` - fired for each event
- [ ] `onStart/onStop` callbacks

**Deliverable**: Continuous pattern playback with hot-swap

---

## Phase 4: Effects Processing

**Goal**: SuperDirt-compatible effects

### 4.1 Reverb

- [ ] ConvolverNode-based reverb
- [ ] `room` parameter (0.0-1.0)
- [ ] `size` parameter (impulse response length)
- [ ] Pre-built impulse responses (small, medium, large)

### 4.2 Delay

- [ ] DelayNode with feedback
- [ ] `delay` parameter (wet/dry)
- [ ] `delaytime` parameter (seconds)
- [ ] `delayfeedback` parameter

### 4.3 Filter

- [ ] BiquadFilterNode
- [ ] `cutoff` parameter (Hz)
- [ ] `resonance` parameter (Q)
- [ ] Filter types (lowpass, highpass, bandpass)

### 4.4 Other Effects

- [ ] Distortion (WaveShaperNode)
- [ ] Bitcrusher (`crush` parameter)
- [ ] Tremolo
- [ ] Phaser (future)

### 4.5 Effects Chain

- [ ] Per-event effects routing
- [ ] Master effects bus
- [ ] Dry/wet mixing

**Deliverable**: Full SuperDirt effect compatibility

---

## Phase 5: WebMIDI Output

**Goal**: Send patterns to external MIDI devices

### 5.1 MIDI Access

- [ ] Request MIDI access
- [ ] List available outputs
- [ ] Select output by name
- [ ] Handle permission denied

### 5.2 Note Messages

- [ ] `MIDI.noteOn(note, velocity, channel)`
- [ ] `MIDI.noteOff(note, channel)`
- [ ] `MIDI.play({ note, velocity, channel, duration })`
- [ ] Auto note-off after duration

### 5.3 Control Messages

- [ ] `MIDI.controlChange(cc, value, channel)`
- [ ] `MIDI.programChange(program, channel)`
- [ ] `MIDI.pitchBend(value, channel)`
- [ ] `MIDI.allNotesOff()` - panic

### 5.4 Scheduler Integration

- [ ] MIDI output target for patterns
- [ ] `Scheduler.schedulePattern(id, events, { output: 'midi' })`
- [ ] Mixed output (Web Audio + MIDI)

**Deliverable**: Send patterns to DAWs and hardware synths

---

## Phase 6: Advanced Features

### 6.1 Custom Synth Definitions

- [ ] `Synth.define(name, config)` API
- [ ] Oscillator + filter + envelope configuration
- [ ] FM synthesis support
- [ ] Wavetable synthesis (future)

### 6.2 Audio Recording

- [ ] MediaRecorder integration
- [ ] Export to WAV/MP3
- [ ] Pattern-length recording

### 6.3 Audio Analysis

- [ ] AnalyserNode integration
- [ ] FFT data for visualizations
- [ ] Waveform data for scope
- [ ] Export analysis data

### 6.4 MIDI Clock

- [ ] Send MIDI clock (master)
- [ ] Receive MIDI clock (slave)
- [ ] Transport messages (start/stop/continue)

---

## Phase 7: Polish & Distribution

### 7.1 Bundle Optimization

- [ ] Tree-shaking support
- [ ] Minimal bundle size (<50KB gzipped for core)
- [ ] Optional effect modules
- [ ] Optional MIDI module

### 7.2 Documentation

- [ ] API reference
- [ ] Examples for each feature
- [ ] Integration guide
- [ ] Migration guide from Tone.js

### 7.3 Distribution

- [ ] npm package
- [ ] CDN hosting (unpkg, jsdelivr)
- [ ] TypeScript definitions
- [ ] Source maps

---

## Technical Decisions

### Build Tooling

- **Bundler**: Rollup (clean ES module output)
- **Format**: UMD + ESM dual output
- **Minification**: Terser
- **TypeScript**: JSDoc types initially, .d.ts files

### Browser Support

- Modern browsers with Web Audio API
- Chrome 66+, Firefox 76+, Safari 14.1+, Edge 79+
- WebMIDI: Chrome/Edge only (Firefox/Safari don't support)

### Dependencies

- **Zero runtime dependencies** for core
- Optional: None planned

### Testing

- Jest for unit tests
- Manual testing for audio (hard to automate)
- Example pages for integration testing

---

## API Design Principles

### 1. SuperDirt Compatibility

Use the same parameter names where possible:

```javascript
// Same as SuperDirt
wf.play({ s: 'bd', gain: 0.8, pan: -0.5, room: 0.3 });
```

### 2. Simple Defaults, Full Control

```javascript
// Simple
wf.play({ s: 'bd' });

// Full control
wf.play({
  s: 'bd',
  n: 2,
  gain: 0.8,
  pan: -0.5,
  speed: 1.2,
  cutoff: 2000,
  room: 0.3,
  delay: 0.2,
});
```

### 3. Event-Based Communication

```javascript
Scheduler.onEvent((event) => {
  // Highlight in editor, update visualization, etc.
});
```

---

## Success Metrics

### Core Functionality

- [ ] Play samples with <20ms latency
- [ ] Pattern scheduling accurate to <5ms
- [ ] Hot-swap patterns without audible glitch
- [ ] MIDI output works in Chrome/Edge

### Performance

- [ ] Bundle size <50KB gzipped (core)
- [ ] <100MB memory for 100 loaded samples
- [ ] 60fps-compatible (no main thread blocking)

### Compatibility

- [ ] All SuperDirt parameters work
- [ ] Works in standalone HTML

---

## Timeline Estimate

| Phase   | Scope                       | Estimate  |
| ------- | --------------------------- | --------- |
| Phase 1 | Audio context + basic synth | 1 week    |
| Phase 2 | Sample playback             | 1 week    |
| Phase 3 | Pattern scheduler           | 1-2 weeks |
| Phase 4 | Effects                     | 1 week    |
| Phase 5 | WebMIDI                     | 1 week    |
| Phase 6 | Advanced features           | 2 weeks   |
| Phase 7 | Polish & distribution       | 1 week    |

**Total**: ~8-10 weeks for full feature set

**MVP (Phases 1-3)**: ~3-4 weeks - enough to play patterns in browser

---

## Open Questions

1. **Tone.js compatibility**: Worth providing a Tone.js adapter?
2. **AudioWorklet**: Use AudioWorklet for scheduler, or keep it simple with setTimeout?
3. **Offline rendering**: Support OfflineAudioContext for non-realtime rendering?

---

## References

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebMIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [Tone.js](https://tonejs.github.io/) - Inspiration for API design
- [Strudel webaudio.mjs](https://github.com/tidalcycles/strudel/blob/main/packages/webaudio/webaudio.mjs) - Reference implementation
