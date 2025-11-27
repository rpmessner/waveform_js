# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode (rebuild on changes)
npm run dev

# Run tests (when implemented)
npm test
```

## Project Commands

- `npm run build` - Build UMD, minified, and ESM bundles
- `npm run dev` - Watch mode for development
- `npm test` - Run Jest tests

## Development Workflow

### Making Changes

1. Edit source files in `src/`
2. Run `npm run build` to rebuild
3. Test in `examples/basic.html` using a local web server
4. Commit changes

### Testing Locally

Since Web Audio requires a browser environment:

```bash
# Option 1: http-server (npm install -g http-server)
http-server .

# Option 2: Python
python3 -m http.server 8000

# Option 3: Node.js
npx http-server .
```

Then open http://localhost:8080/examples/basic.html

### Adding New Features

1. Create module in appropriate directory (`src/synths/`, `src/effects/`, etc.)
2. Export from main `src/index.js` if needed for public API
3. Update examples to demonstrate new feature
4. Update ROADMAP.md to check off completed tasks

## File Organization

```
src/
├── index.js              # Public API exports
├── waveform.js           # Main Waveform class
├── audio-context.js      # AudioContext singleton
├── synths/               # Synthesis modules
│   ├── oscillator.js
│   └── envelope.js
├── effects/              # Effects processors (future)
├── samples/              # Sample management (future)
├── midi/                 # WebMIDI (future)
└── utils/                # Utilities
    ├── note-to-freq.js
    ├── db-to-gain.js
    └── timing.js
```

## Code Style

- Use ES modules (`import`/`export`)
- JSDoc comments for all public functions
- Descriptive variable names
- Keep functions focused and small
- Prefer composition over inheritance

## Common Tasks

### Adding a New Synth Type

1. Create synth module in `src/synths/`
2. Implement play function that returns audio nodes
3. Add to `SYNTH_TYPES` mapping if needed
4. Export from `src/synths/index.js`
5. Add example to `examples/`

### Adding a New Effect

1. Create effect module in `src/effects/`
2. Implement effect as a function that returns an audio node
3. Integrate into synth/sample playback chain
4. Add parameters to play API
5. Add example demonstrating the effect

### Adding Utilities

1. Create utility module in `src/utils/`
2. Export individual functions
3. Add to `src/index.js` if part of public API
4. Document with JSDoc

## Debugging

### Browser DevTools

- Open browser console to see any errors
- Use `console.log()` to inspect values
- Check Web Audio graph in Chrome DevTools (chrome://webaudio-internals)

### Common Issues

**"AudioContext not initialized"**
- Call `wf.init()` before playing sounds
- Must be triggered by user gesture (click, keypress)

**No sound**
- Check browser console for errors
- Verify AudioContext state is "running"
- Check master gain is not 0
- Verify parameters are in valid ranges

**Clicks/pops**
- Envelope attack too short (try 0.01 instead of 0)
- Gain changes too abrupt
- Filter cutoff changes too fast

## Performance

### Optimization Tips

- Reuse audio nodes when possible
- Disconnect and cleanup nodes after use
- Use exponentialRampToValueAtTime for smooth changes
- Schedule notes in advance using audio context time
- Avoid creating nodes in tight loops

### Memory Management

- Nodes are automatically garbage collected after disconnect
- Use `onended` callbacks to cleanup
- Don't hold references to completed nodes
- Clear pattern references when stopping

## Next Implementation Tasks

See `docs/ROADMAP.md` for full development plan.

**Immediate next steps:**
- Phase 2: Sample playback
- Phase 3: Pattern scheduler
- Phase 4: Effects
- Phase 5: WebMIDI
