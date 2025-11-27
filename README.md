# waveform_js

**Web Audio transport layer for browser-based live coding** - the JavaScript equivalent of [waveform](../waveform).

waveform_js provides low-level Web Audio synthesis, sample playback, scheduling, and WebMIDI output. It's designed to be a foundation for browser-based music applications, live coding environments, and generative audio tools.

## Status

📋 **Proposal Stage** - See [docs/ROADMAP.md](docs/ROADMAP.md) for development plan.

## Features (Planned)

- **Web Audio Synthesis**: Oscillators (sine, saw, square, triangle), envelopes (ADSR), filters
- **Sample Playback**: Load and play samples with SuperDirt-compatible parameters
- **Pattern Scheduling**: High-precision lookahead scheduler for cycle-based timing
- **Hot-Swappable Patterns**: Change patterns while playing without stopping
- **WebMIDI Output**: Send notes, CC, program changes to external devices/DAWs
- **Effects**: Reverb (ConvolverNode), delay, filter, distortion
- **SuperDirt Compatibility**: Same parameter names (`s`, `n`, `gain`, `pan`, `speed`, `room`, etc.)

## Ecosystem Role

waveform_js is the **browser audio layer** of the Elixir music ecosystem:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  kino_harmony (Livebook) │ harmony.nvim (Neovim) │ Web REPL     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────┐
│  harmony_repl_js    │           │   HarmonyServer     │
│  (REPL UI)          │           │   (coordination)    │
│  • CodeMirror       │◀─────────▶│   • UzuParser       │
│  • Phoenix Channel  │  events   │   • UzuPattern      │
│  • Visualizations   │           │   • harmony         │
└─────────┬───────────┘           └──────────┬──────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────┐
│   waveform_js       │ ◀── HERE  │    waveform         │
│   (Web Audio)       │           │   (SuperCollider)   │
│   • Scheduling      │           │   • OSC             │
│   • Synths/Samples  │           │   • SuperDirt       │
│   • WebMIDI         │           │   • MIDI            │
└─────────────────────┘           └─────────────────────┘
```

**waveform_js handles:**
- Web Audio context lifecycle
- Synthesis (oscillators, samples, envelopes)
- Effects processing
- Pattern scheduling with cycle-based timing
- WebMIDI output

**waveform_js does NOT handle:**
- UI/editor (→ harmony_repl_js)
- Server communication (→ harmony_repl_js)
- Pattern parsing (→ HarmonyServer/UzuParser)
- Music theory (→ HarmonyServer/harmony)

## Installation (Future)

```bash
npm install waveform-js
```

Or via CDN:

```html
<script src="https://unpkg.com/waveform-js/dist/waveform.min.js"></script>
```

## Usage (Planned API)

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
import { Synth } from 'waveform-js';

// Trigger a synth with parameters
Synth.trigger('saw', {
  note: 60,
  amp: 0.5,
  cutoff: 2000,
  resonance: 0.3,
  attack: 0.01,
  decay: 0.1,
  sustain: 0.5,
  release: 0.3
});

// Built-in synth types
Synth.trigger('sine', { note: 60 });
Synth.trigger('square', { note: 60 });
Synth.trigger('triangle', { note: 60 });
Synth.trigger('noise', { amp: 0.2 });
```

### Pattern Scheduling

```javascript
import { Scheduler } from 'waveform-js';

// Set tempo (cycles per second, 0.5 = 120 BPM)
Scheduler.setCps(0.5);

// Define a pattern (events at cycle positions 0.0-1.0)
const drums = [
  { time: 0.0, params: { s: 'bd' } },
  { time: 0.25, params: { s: 'cp' } },
  { time: 0.5, params: { s: 'sn' } },
  { time: 0.75, params: { s: 'cp' } }
];

// Start continuous playback
Scheduler.schedulePattern('drums', drums);

// Hot-swap pattern while playing
const newDrums = [
  { time: 0.0, params: { s: 'bd', gain: 1.2 } },
  { time: 0.5, params: { s: 'bd', n: 1 } }
];
Scheduler.updatePattern('drums', newDrums);

// Dynamic patterns (query function)
Scheduler.schedulePattern('dynamic', (cycle) => {
  if (cycle % 4 === 0) {
    return [{ time: 0.0, params: { s: 'crash' } }];
  }
  return [];
});

// Stop a pattern
Scheduler.stopPattern('drums');

// Emergency stop all
Scheduler.hush();
```

### MIDI Output

```javascript
import { MIDI } from 'waveform-js';

// List available MIDI outputs
const outputs = await MIDI.listOutputs();

// Send a note
MIDI.play({ note: 60, velocity: 80, channel: 1 });

// With duration (auto note-off)
MIDI.play({ note: 60, velocity: 80, channel: 1, duration: 500 });

// Control change
MIDI.controlChange(1, 64, 1);  // CC 1 = 64 on channel 1

// Program change
MIDI.programChange(5, 1);  // Program 5 on channel 1

// All notes off
MIDI.allNotesOff();
```

### Sample Loading

```javascript
import { Samples } from 'waveform-js';

// Load from URL
await Samples.load('kick', '/samples/kick.wav');

// Load a sample bank (directory structure like Dirt-Samples)
await Samples.loadBank('/samples/dirt-samples/');

// Load from CDN (future: host common samples)
await Samples.loadFromCDN('dirt-samples');

// Check loaded samples
Samples.list();  // ['bd', 'sn', 'hh', 'cp', ...]
```

## API Reference (Planned)

### Waveform

Main class for audio context management.

| Method | Description |
|--------|-------------|
| `new Waveform(options)` | Create instance with options |
| `init()` | Initialize AudioContext (requires user gesture) |
| `play(params)` | Play a sample with SuperDirt-compatible params |
| `suspend()` | Suspend audio context |
| `resume()` | Resume audio context |
| `close()` | Close audio context |

### Scheduler

Pattern scheduling with cycle-based timing.

| Method | Description |
|--------|-------------|
| `setCps(cps)` | Set cycles per second (0.5 = 120 BPM) |
| `getCps()` | Get current CPS |
| `schedulePattern(id, events)` | Start a pattern looping |
| `updatePattern(id, events)` | Hot-swap a playing pattern |
| `stopPattern(id)` | Stop a specific pattern |
| `hush()` | Stop all patterns |
| `getCurrentCycle()` | Get current cycle number |

### Synth

Synthesis engine.

| Method | Description |
|--------|-------------|
| `trigger(type, params)` | Trigger a synth |
| `define(name, config)` | Define a custom synth |
| `list()` | List available synth types |

### MIDI

WebMIDI output.

| Method | Description |
|--------|-------------|
| `listOutputs()` | List available MIDI outputs |
| `selectOutput(name)` | Select output by name |
| `play(params)` | Send note with optional duration |
| `noteOn(note, velocity, channel)` | Send note on |
| `noteOff(note, channel)` | Send note off |
| `controlChange(cc, value, channel)` | Send CC |
| `programChange(program, channel)` | Send program change |
| `allNotesOff()` | Panic - all notes off |

### Samples

Sample management.

| Method | Description |
|--------|-------------|
| `load(name, url)` | Load a single sample |
| `loadBank(url)` | Load a directory of samples |
| `loadFromCDN(bank)` | Load from hosted CDN |
| `get(name, n)` | Get a sample buffer |
| `list()` | List loaded sample names |

## SuperDirt Parameter Compatibility

waveform_js aims for compatibility with SuperDirt parameters:

| Parameter | Description | Range |
|-----------|-------------|-------|
| `s` | Sample name | string |
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

## Related Projects

- [waveform](../waveform) - Elixir OSC client for SuperCollider (this project's Elixir equivalent)
- [harmony_repl_js](../harmony_repl_js) - Browser REPL UI (uses waveform_js)
- [HarmonyServer](../harmony_server) - Elixir API gateway for pattern evaluation
- [kino_harmony](../kino_harmony) - Livebook live coding widget

## Inspiration

- [waveform](../waveform) - Direct Elixir equivalent
- [Tone.js](https://tonejs.github.io/) - Web Audio framework
- [Strudel](https://strudel.cc/) - Browser-based live coding (uses Web Audio)
- [SuperDirt](https://github.com/musikinformatik/SuperDirt) - Parameter conventions

## License

MIT License - See LICENSE for details.
