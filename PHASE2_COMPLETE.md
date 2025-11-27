# Phase 2 Complete: Sample Playback

**Date:** 2025-11-27
**Status:** ✅ Complete

## Summary

Phase 2 successfully implemented full sample playback capabilities with SuperDirt-compatible parameters. The library can now load, manage, and play audio samples with speed control, slicing, envelopes, and effects.

## Implemented Features

### 1. Sample Loading (`src/samples/loader.js`)
- ✅ `loadSample(audioContext, url)` - Load single audio file
- ✅ `loadSamples(audioContext, samples)` - Load multiple files in parallel
- ✅ `loadSamplesWithProgress(audioContext, samples, onProgress)` - Progress tracking
- ✅ `loadSampleBank(manifestUrl, onProgress)` - Load from JSON manifest
- ✅ Comprehensive error handling (404, decode errors, CORS)
- ✅ AudioBuffer decoding for all browser-supported formats

### 2. Sample Management (`src/samples/index.js`)
- ✅ `SampleManager` singleton for registry
- ✅ Sample naming with variants (e.g., `bd:0`, `bd:1`, `bd:2`)
- ✅ Smart fallback: `get('bd')` → tries `bd`, then `bd:0`
- ✅ Strict variant matching: `get('bd', 99)` → returns null if not found
- ✅ `list()`, `count()`, `remove()`, `clear()` methods
- ✅ `getByPrefix()` - Get all variants of a sample
- ✅ `getVariantCount()` - Count available variants
- ✅ Automatic initialization with AudioContext

### 3. Sample Playback (`src/synths/sampler.js`)
- ✅ `playSample()` - Play AudioBuffer with parameters
- ✅ `playSampleWithNote()` - Pitch samples via note parameter
- ✅ **SuperDirt Parameters Supported:**
  - `s` - Sample name
  - `n` - Sample variant number
  - `speed` - Playback rate (pitch shift)
  - `begin` / `end` - Sample slicing (0.0-1.0)
  - `gain` - Volume
  - `amp` - Amplitude
  - `pan` - Stereo positioning
  - `note` - MIDI note (calculates speed automatically)
  - `baseNote` - Reference pitch (default: 60 / C4)
  - `attack`, `decay`, `sustain`, `release` - ADSR envelope
  - `cutoff`, `resonance` - Filter parameters

### 4. Waveform Integration
- ✅ Automatic routing: samples take priority over oscillators
- ✅ If `s: 'bd'` is a loaded sample → play sample
- ✅ If `s: 'sine'` is not a sample → play oscillator
- ✅ Convenience methods on Waveform class:
  - `loadSample(name, url)`
  - `loadSamples(samples)`
  - `loadSamplesWithProgress(samples, onProgress)`
  - `loadSampleBank(manifestUrl, onProgress)`
  - `getSamples()` - Access SampleManager directly

### 5. Testing
- ✅ 22 new unit tests for SampleManager (81 total, all passing)
- ✅ Tests for sample registry operations
- ✅ Tests for variant handling and fallback behavior
- ✅ Tests for validation and error cases
- ✅ Browser integration test with procedural samples

## API Examples

### Load Samples

```javascript
const wf = new Waveform();
await wf.init();

// Load single sample
await wf.loadSample('kick', 'samples/kick.wav');

// Load multiple samples
await wf.loadSamples({
  'bd:0': 'samples/bd/BD0000.wav',
  'bd:1': 'samples/bd/BD0001.wav',
  'sn:0': 'samples/sn/SN0000.wav'
});

// Load with progress
await wf.loadSamplesWithProgress(samples, (loaded, total, name) => {
  console.log(`Loaded ${loaded}/${total}: ${name}`);
});

// Load from manifest
await wf.loadSampleBank('samples/manifest.json');
```

### Play Samples

```javascript
// Simple playback
wf.play({ s: 'bd' });

// With variant
wf.play({ s: 'bd', n: 1 });

// Speed control (pitch shift)
wf.play({ s: 'bd', speed: 1.5 });  // Higher pitch
wf.play({ s: 'bd', speed: 0.5 });  // Lower pitch

// Sample slicing
wf.play({ s: 'vocal', begin: 0.25, end: 0.75 });

// Pitch via note (assumes sample at C4)
wf.play({ s: 'vocal', note: 72 });  // One octave up

// Full parameter example
wf.play({
  s: 'sn',
  n: 2,
  speed: 1.2,
  gain: 0.8,
  pan: -0.3,
  begin: 0.0,
  end: 0.8,
  attack: 0.01,
  release: 0.3,
  cutoff: 3000,
  resonance: 0.5
});
```

### Advanced Sample Management

```javascript
const samples = wf.getSamples();

// Check if sample exists
if (samples.has('bd', 2)) {
  console.log('bd:2 is loaded');
}

// List all loaded samples
console.log(samples.list());  // ['bd:0', 'bd:1', 'sn:0', ...]

// Get all variants of 'bd'
const bdVariants = samples.getByPrefix('bd');
console.log(Object.keys(bdVariants));  // ['bd:0', 'bd:1', 'bd:2']

// Count variants
console.log(samples.getVariantCount('bd'));  // 3

// Remove a sample
samples.remove('bd:2');

// Clear all samples
samples.clear();
```

## Example Files

### `examples/samples.html`
Interactive demo with:
- ✅ Procedural sample generation (kick, snare, hihat, clap)
- ✅ Individual sample playback buttons
- ✅ Parameter controls (speed, gain, pan, begin, end)
- ✅ 16-step sequencer with 3 tracks
- ✅ BPM control
- ✅ Visual step indicators

**To run:**
```bash
python3 -m http.server 8000
# Open: http://localhost:8000/examples/samples.html
```

## Bundle Size

| Bundle | Size | Change from Phase 1 |
|--------|------|---------------------|
| Minified | 9.0KB | +5.1KB |
| ES Module | 33KB | +19KB |
| UMD | 36KB | +20KB |

**Analysis:** Added ~5KB minified for full sample playback system. Still well under 50KB target.

## JSON Manifest Format

For `loadSampleBank()`:

```json
{
  "baseUrl": "https://example.com/samples/",
  "samples": {
    "bd": [
      "bd/BD0000.wav",
      "bd/BD0001.wav",
      "bd/BD0002.wav"
    ],
    "sn": [
      "sn/SN0000.wav",
      "sn/SN0001.wav"
    ],
    "hh": [
      "hh/HH0000.wav"
    ]
  }
}
```

Results in samples registered as: `bd:0`, `bd:1`, `bd:2`, `sn:0`, `sn:1`, `hh:0`

## Technical Highlights

### Smart Sample Routing
The `Waveform.play()` method automatically detects if `s` parameter refers to a loaded sample or a synth:

```javascript
// In waveform.js
const sampleBuffer = Samples.get(synthType, variant);
if (sampleBuffer) {
  // Play sample
  return playSampleWithNote(...);
} else {
  // Play oscillator
  return playOscillator(...);
}
```

### Note-to-Speed Conversion
The `playSampleWithNote()` function calculates playback speed from MIDI note:

```javascript
// Assumes sample recorded at baseNote (default: 60 = C4)
const semitoneOffset = note - baseNote;
const speed = Math.pow(2, semitoneOffset / 12);
```

This allows musical use of samples:
```javascript
wf.play({ s: 'vocal', note: 60 });  // Original pitch (C4)
wf.play({ s: 'vocal', note: 72 });  // One octave up
wf.play({ s: 'vocal', note: 48 });  // One octave down
```

### Sample Slicing
Precise sample slicing using AudioBufferSourceNode offsets:

```javascript
const startOffset = begin * sampleDuration;
const endOffset = end * sampleDuration;
source.start(startTime, startOffset, endOffset - startOffset);
```

### Automatic Cleanup
Sample nodes auto-disconnect after playback:

```javascript
setTimeout(() => {
  source.disconnect();
  gainNode.disconnect();
  panNode.disconnect();
}, (stopTime - now) * 1000);
```

## Files Created/Modified

### New Files (5):
- `src/samples/loader.js` (192 lines) - Sample loading utilities
- `src/samples/index.js` (209 lines) - Sample manager singleton
- `src/synths/sampler.js` (141 lines) - Sample playback engine
- `test/samples.test.js` (166 lines) - 22 unit tests
- `examples/samples.html` (392 lines) - Interactive demo with sequencer

### Modified Files (2):
- `src/waveform.js` - Added sample integration and convenience methods
- `src/index.js` - Export Samples module

### Total:
- **+1100 lines of code**
- **+22 unit tests** (81 total)
- **Build passes** ✅
- **All tests pass** ✅

## Phase 2 Checklist

From `docs/ROADMAP.md`:

### 2.1 Sample Loading
- ✅ `Samples.load(name, url)` - load single sample
- ✅ AudioBuffer decoding
- ✅ Error handling (404, decode failure)
- ✅ Loading progress events

### 2.2 Sample Bank Loading
- ✅ `Samples.loadBank(baseUrl)` - load directory structure
- ✅ JSON manifest format for sample banks
- ✅ Lazy loading option (registry supports it, not enforced)
- ⚠️ CDN hosting support (ready, but no hosted samples yet)

### 2.3 Sample Playback
- ✅ `s` parameter - sample name
- ✅ `n` parameter - sample variant (bd:0, bd:1, etc.)
- ✅ `speed` parameter - playback rate
- ✅ `begin`/`end` parameters - sample slice
- ✅ `gain` parameter - volume
- ✅ `pan` parameter - stereo position

### 2.4 Default Sample Bank
- ⚠️ Host essential samples (deferred - procedural generation in demo instead)
- ⚠️ CDN distribution (ready for future implementation)
- ⚠️ ~5MB compressed for basic kit (not implemented yet)

**Deliverable:** ✅ Can load and play samples with SuperDirt parameters

## Known Limitations

1. **No hosted sample bank yet** - Users must provide their own samples or use procedural generation
2. **Sample format support** - Depends on browser (WAV, MP3, OGG support varies)
3. **No caching** - Samples reloaded on page refresh (could add IndexedDB caching later)
4. **No streaming** - All samples fully loaded into memory (good for short samples, not for long audio)

## Next Steps

### Immediate Options:

**Option A: Phase 3 - Pattern Scheduler**
- Implement lookahead scheduler
- Cycle-based timing
- Pattern hot-swapping
- Multiple concurrent patterns

**Option B: Sample Bank Distribution**
- Create small sample pack (~10 essential sounds)
- Host on GitHub Pages or CDN
- Add to examples

**Option C: Phase 4 - Effects**
- Reverb (ConvolverNode)
- Delay with feedback
- Additional filter types
- Effects chain routing

## Recommendation

Proceed with **Phase 3: Pattern Scheduler**. This will enable:
- Continuous pattern playback
- Precise timing with lookahead
- Hot-swapping patterns without stopping
- Integration with HarmonyServer's event streams

Sample hosting can be deferred - users can provide their own samples, and the procedural generation demo works well for testing.

## Integration with harmony_repl_js

Ready for integration:

```javascript
// In harmony_repl_js
const wf = new Waveform();
await wf.init();

// Load samples (one-time setup)
await wf.loadSampleBank('https://cdn.example.com/samples/manifest.json');

// Receive events from HarmonyServer
channel.on('events', ({ events }) => {
  events.forEach(event => {
    wf.play(event.params);
  });
});
```

## Performance Notes

- ✅ Minimal memory overhead for sample registry
- ✅ Efficient parallel loading with `Promise.all`
- ✅ Automatic node cleanup prevents memory leaks
- ✅ Sequential loading with progress available for UI feedback
- ✅ Samples cached in memory for instant playback
- ⚠️ Large sample banks may require chunked/lazy loading (not yet implemented)

## Documentation

See detailed session log: `docs/sessions/2025-11-27-phase2-sample-playback.md`

---

**Phase 2: COMPLETE** ✅
**Ready for Phase 3** 🚀
