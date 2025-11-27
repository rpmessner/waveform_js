# waveform_js

**Web Audio transport layer for browser-based live coding.**

waveform_js provides low-level Web Audio synthesis, sample playback, scheduling, and effects processing. It's designed to be a foundation for browser-based music applications, live coding environments, and generative audio tools.

## Status

**Core library complete** (Phases 1-4). Ready for live coding use.

- 143 tests passing
- 19KB minified bundle

## Features

- **Web Audio Synthesis**: Oscillators (sine, saw, square, triangle), ADSR envelopes, filters
- **Sample Playback**: Load and play samples with speed, begin, end, pitched playback
- **Pattern Scheduling**: High-precision lookahead scheduler with hot-swap support
- **Effects**: Reverb, delay, filter, distortion, bitcrusher
- **SuperDirt Compatibility**: Same parameter names (`s`, `n`, `gain`, `pan`, `room`, `delay`, etc.)

## Installation

```bash
npm install waveform-js
```

Or via CDN:

```html
<script src="https://unpkg.com/waveform-js/dist/waveform.min.js"></script>
```

## Usage

### Basic Playback

```javascript
import { Waveform } from 'waveform-js';

// Initialize audio context (must be triggered by user interaction)
const wf = new Waveform();
await wf.init();

// Play a sample (SuperDirt-compatible parameters)
wf.play({ s: 'bd' });
wf.play({ s: 'piano', note: 60, gain: 0.8 });
wf.play({ s: 'hh', n: 2, pan: -0.5, room: 0.3 });
```

### Synth Playback

```javascript
// Play oscillator synths
wf.play({ s: 'saw', note: 60, cutoff: 2000, resonance: 0.3 });
wf.play({ s: 'sine', note: 48, attack: 0.1, release: 0.5 });
wf.play({ s: 'square', note: 60, gain: 0.5 });

// With effects
wf.play({ s: 'saw', note: 48, room: 0.5, delay: 0.3, delaytime: 0.25 });
wf.play({ s: 'sine', note: 60, shape: 0.5, crush: 8 });
```

### Pattern Scheduling

```javascript
// Set tempo (cycles per second, 0.5 = 120 BPM)
wf.setCps(0.5);
wf.startScheduler();

// Define a pattern (events at cycle positions 0.0-1.0)
wf.schedulePattern('drums', [
  { start: 0.0, params: { s: 'bd' } },
  { start: 0.25, params: { s: 'hh' } },
  { start: 0.5, params: { s: 'sn' } },
  { start: 0.75, params: { s: 'hh' } }
]);

// Hot-swap pattern while playing
wf.updatePattern('drums', [
  { start: 0.0, params: { s: 'bd', gain: 1.2 } },
  { start: 0.5, params: { s: 'bd', n: 1 } }
]);

// Dynamic patterns (query function)
wf.schedulePattern('fills', (cycle) => {
  if (cycle % 4 === 3) {
    return [{ start: 0.75, params: { s: 'crash' } }];
  }
  return [];
});

// Stop patterns
wf.stopPattern('drums');
wf.hush();  // Stop all
```

### Sample Loading

```javascript
// Load a single sample
await wf.loadSample('kick', '/samples/kick.wav');

// Load multiple samples
await wf.loadSamples({
  bd: '/samples/bd.wav',
  sn: '/samples/sn.wav',
  hh: '/samples/hh.wav'
});

// Load a sample bank (multiple variants)
await wf.loadSampleBank('piano', [
  '/samples/piano/c3.wav',
  '/samples/piano/c4.wav',
  '/samples/piano/c5.wav'
]);

// Play loaded samples
wf.play({ s: 'kick' });
wf.play({ s: 'piano', n: 1 });  // Second variant
```

## API Reference

### Waveform

Main class for audio context and playback.

| Method | Description |
|--------|-------------|
| `new Waveform(options)` | Create instance |
| `init()` | Initialize AudioContext (requires user gesture) |
| `play(params, startTime?)` | Play sample or synth |
| `suspend()` / `resume()` / `close()` | Context lifecycle |

### Samples

| Method | Description |
|--------|-------------|
| `loadSample(name, url)` | Load a single sample |
| `loadSamples(map)` | Load multiple samples |
| `loadSampleBank(name, urls)` | Load sample variants |

### Scheduler

| Method | Description |
|--------|-------------|
| `startScheduler()` / `stopScheduler()` | Start/stop scheduler |
| `schedulePattern(id, events)` | Schedule a pattern |
| `updatePattern(id, events)` | Hot-swap pattern |
| `stopPattern(id)` | Stop a pattern |
| `hush()` | Stop all patterns |
| `setCps(cps)` / `setBpm(bpm)` | Set tempo |
| `getCps()` / `getBpm()` | Get tempo |

## SuperDirt Parameter Compatibility

waveform_js uses SuperDirt-compatible parameter names:

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
| `size` | Reverb size | 0.0-1.0 |
| `delay` | Delay amount | 0.0-1.0 |
| `delaytime` | Delay time | seconds |
| `delayfeedback` | Delay feedback | 0.0-0.95 |
| `shape` | Distortion | 0.0-1.0 |
| `crush` | Bitcrusher depth | 1-16 |
| `hcutoff` | Highpass cutoff | Hz |
| `bandf` | Bandpass center | Hz |

## Development

```bash
# Clone
git clone https://github.com/rpmessner/waveform_js.git
cd waveform_js

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Development server with hot reload
npm run dev
```

## Inspiration

- [Tone.js](https://tonejs.github.io/) - Web Audio framework
- [Strudel](https://strudel.cc/) - Browser-based live coding
- [SuperDirt](https://github.com/musikinformatik/SuperDirt) - Parameter conventions

## License

MIT License - See LICENSE for details.
