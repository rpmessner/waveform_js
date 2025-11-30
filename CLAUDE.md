# CLAUDE.md - AI Assistant Guide for waveform_js

## Project Overview

**waveform_js** is a Web Audio transport layer for browser-based live coding. It's the JavaScript equivalent of the Elixir `waveform` library and provides low-level audio synthesis, sample playback, scheduling, and WebMIDI output.

**Purpose:** Foundation for browser-based music applications, live coding environments, and generative audio tools.

**Status:** Phase 1 Complete (Basic synth playback working)

## Architecture

### Ecosystem Position

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  kino_undertow (Livebook) │ undertow.nvim (Neovim) │ Web REPL   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────┐
│  undertow_repl_js   │           │   UndertowServer    │
│  (REPL UI)          │◀─────────▶│   (coordination)    │
└─────────┬───────────┘           └──────────┬──────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────┐
│   waveform_js       │ ◀── HERE  │    waveform         │
│   (Web Audio)       │           │   (SuperCollider)   │
└─────────────────────┘           └─────────────────────┘
```

### What waveform_js Handles

- ✅ Web Audio context lifecycle
- ✅ Synthesis (oscillators, samples, envelopes)
- ✅ Effects processing
- ✅ Pattern scheduling with cycle-based timing
- ✅ WebMIDI output

### What waveform_js Does NOT Handle

- ❌ UI/editor (→ undertow_repl_js)
- ❌ Server communication (→ undertow_repl_js)
- ❌ Pattern parsing (→ UndertowServer/UzuParser)
- ❌ Music theory (→ UndertowServer/harmony)

## Project Structure

```
waveform_js/
├── src/
│   ├── index.js              # Main exports
│   ├── waveform.js           # Waveform class
│   ├── audio-context.js      # AudioContext lifecycle
│   ├── synths/
│   │   ├── oscillator.js     # Oscillator synths
│   │   └── envelope.js       # ADSR envelope
│   ├── effects/              # Effects (Phase 4)
│   ├── samples/              # Sample management (Phase 2)
│   ├── midi/                 # WebMIDI (Phase 5)
│   └── utils/
│       ├── note-to-freq.js   # MIDI/note conversion
│       ├── db-to-gain.js     # Audio utilities
│       └── timing.js         # BPM/CPS utilities
├── dist/                     # Built bundles (UMD, ESM, minified)
├── examples/
│   └── basic.html            # Working demo
├── test/                     # Jest unit tests
├── docs/
│   ├── ROADMAP.md            # Development plan
│   └── sessions/             # AI assistant session logs
├── package.json
├── rollup.config.js
├── jest.config.js
└── README.md
```

## Development Roadmap

See `docs/ROADMAP.md` for full details. Current progress:

- ✅ **Phase 1: Audio Context Foundation** - COMPLETE
  - AudioContext management
  - Basic oscillator synths
  - ADSR envelope
  - SuperDirt-compatible play() API

- 🔜 **Phase 2: Sample Playback** - NEXT
  - Sample loading and management
  - Sample playback with speed/begin/end
  - Sample bank support

- ⏳ **Phase 3: Pattern Scheduler**
  - Lookahead scheduler
  - Hot-swappable patterns
  - Cycle-based timing

- ⏳ **Phase 4: Effects Processing**
  - Reverb, delay, filter
  - SuperDirt-compatible parameters

- ⏳ **Phase 5: WebMIDI Output**
  - MIDI note messages
  - Control changes
  - Pattern → MIDI routing

## API Design Principles

### 1. SuperDirt Compatibility

Use the same parameter names as SuperDirt/TidalCycles:

```javascript
wf.play({ s: 'bd', gain: 0.8, pan: -0.5, room: 0.3 });
```

### 2. Waveform (Elixir) Parity

Mirror the Elixir waveform API where possible:

```javascript
// JavaScript                          // Elixir
Scheduler.setCps(0.5);              // PatternScheduler.set_cps(0.5)
Scheduler.schedulePattern(id, e);   // PatternScheduler.schedule_pattern(id, e)
Scheduler.hush();                   // PatternScheduler.hush()
```

### 3. Simple Defaults, Full Control

```javascript
// Simple
wf.play({ s: 'bd' });

// Full control
wf.play({
  s: 'bd', n: 2, gain: 0.8, pan: -0.5,
  cutoff: 2000, room: 0.3, delay: 0.2
});
```

## Testing Strategy

See `TESTING.md` for detailed strategy.

**Summary:**
- ✅ Unit tests for pure functions (59 passing tests)
- ✅ Integration tests in browser (`examples/basic.html`)
- ❌ No unit tests for Web Audio code (not meaningful to mock)

**Run tests:**
```bash
npm test
```

**Test in browser:**
```bash
python3 -m http.server 8000
# Open: http://localhost:8000/examples/basic.html
```

## Common Tasks

### Building

```bash
npm install          # First time only
npm run build        # Build UMD, ESM, and minified bundles
npm run dev          # Watch mode
```

### Testing

```bash
npm test             # Run unit tests
npm test -- --watch  # Watch mode
npm test -- --coverage  # Coverage report
```

### Adding New Features

1. **Add source code** in appropriate `src/` subdirectory
2. **Add tests** in `test/` if testable (pure functions)
3. **Update examples** to demonstrate new feature
4. **Update ROADMAP.md** to check off completed tasks
5. **Document in session log** in `docs/sessions/`

### Code Style

- ES modules (`import`/`export`)
- JSDoc comments for public functions
- Descriptive variable names
- Pure functions where possible (for testability)
- Minimal dependencies

## Important Context for AI Assistants

### Web Audio API Constraints

1. **Browser only** - AudioContext doesn't exist in Node.js
2. **User gesture required** - Must call `init()` from click/keypress
3. **Real-time only** - Can't easily test audio output
4. **State management** - Context can be suspended/closed

### SuperDirt Parameter Compatibility

When implementing features, maintain compatibility with these parameters:

| Parameter | Description | Range |
|-----------|-------------|-------|
| `s` | Sample/synth name | string |
| `n` | Sample variant | integer |
| `note` | MIDI note number | 0-127 |
| `gain` | Volume | 0.0-2.0 |
| `pan` | Stereo position | -1.0 to 1.0 |
| `speed` | Playback rate | 0.125-4.0 |
| `begin` | Sample start | 0.0-1.0 |
| `end` | Sample end | 0.0-1.0 |
| `cutoff` | Filter frequency | Hz |
| `resonance` | Filter resonance | 0.0-1.0 |
| `room` | Reverb amount | 0.0-1.0 |
| `delay` | Delay amount | 0.0-1.0 |

### Performance Targets

- Bundle size: <50KB gzipped (currently 3.9KB ✓)
- Latency: <20ms for playback
- Scheduling accuracy: <5ms
- Memory: <100MB for 100 loaded samples

## Session Documentation

All AI assistant sessions should be documented in `docs/sessions/` with:
- Date in filename: `YYYY-MM-DD-description.md`
- Summary of work done
- Decisions made and rationale
- Code changes overview
- Next steps identified

## Related Projects

- **waveform** - Elixir equivalent (SuperCollider OSC client)
- **undertow_repl_js** - Browser REPL UI (uses waveform_js)
- **UndertowServer** - Elixir pattern evaluation server
- **kino_undertow** - Livebook live coding widget

## Inspiration

- [waveform](../waveform) - Direct Elixir equivalent
- [Tone.js](https://tonejs.github.io/) - Web Audio framework
- [Strudel](https://strudel.cc/) - Browser-based live coding
- [SuperDirt](https://github.com/musikinformatik/SuperDirt) - Parameter conventions

## Key Decisions Made

### Why ES Modules Only?
Modern browsers support them natively, simplifies build process.

### Why Rollup over Webpack?
Cleaner output, better for libraries, smaller bundles.

### Why Jest over Mocha?
Better ES module support, built-in mocking, good DX.

### Why No Heavy Mocking?
Web Audio code is thin wrappers - mocking provides false confidence.
Integration testing in browser catches real bugs.

### Why SuperDirt Parameter Names?
Compatibility with existing live coding ecosystem (TidalCycles).

## Current State

**Phase 1 Complete (2025-11-27)**

✅ Working features:
- AudioContext initialization and lifecycle
- Oscillator synths (sine, square, saw, triangle)
- ADSR envelope
- Filter support (cutoff, resonance)
- Stereo panning
- SuperDirt-compatible play() API
- 59 passing unit tests
- Working HTML demo

📦 Bundle sizes:
- Minified: 3.9KB
- ES Module: 14KB
- UMD: 16KB

## Next Steps

1. **Phase 2: Sample Playback**
   - Implement sample loading
   - Add sample bank management
   - Support speed/begin/end parameters

2. **Pattern Scheduler**
   - Implement lookahead scheduler
   - Add pattern management
   - Support hot-swapping

3. **Effects**
   - Reverb, delay, filter effects
   - Effects chain management

See `docs/ROADMAP.md` for detailed implementation plan.

## Questions?

- Read `DEVELOPMENT.md` for development workflow
- Read `TESTING.md` for testing strategy
- Read `docs/ROADMAP.md` for implementation plan
- Check `docs/sessions/` for past AI assistant sessions
