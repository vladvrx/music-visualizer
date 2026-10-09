# Music Visualizer

[Open the live visualizer](https://vladvrx.github.io/music-visualizer/)

The ultimate browser music visualizer — 31 GPU scenes, an Auto VJ director, and a deep FX rack, all in plain Three.js. Load any song and watch it come alive.

## Run

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

## Features

**Audio input**
- Drag & drop or pick local audio files (mp3, wav, ogg, m4a, flac, …) — builds a playlist
- Direct audio URLs (files/streams; CORS-permitting only — Spotify/YouTube etc. don't allow this)
- Live microphone mode
- Transport: play/pause, seek, volume, prev/next, playlist picker

**31 visualization scenes**
Fluid (real GPU Navier-Stokes fluid sim), Fireworks (beat-triggered bursts), Vortex (galaxy drain), Smoke (rising plumes), Prism (nested wireframe polyhedra), Corona (shader sun), Currents (Tame Impala-style flow lines), Ribbons, Butterfly curve, Warp starfield, Gyroscope, Digital Rain, Skyline, DNA Helix, Pulsar accretion disk, Lissajous, Cube Storm, Bars, Rings, Starburst, Spiral, Particles, Tunnel, Terrain, Orb, Wave Grid, Nebula, Kaleidoscope, Liquid, Cube Matrix — every one fully audio-reactive and palette-driven.

**Deep customization** (right panel)
- Audio: sensitivity, detail, log/linear frequency mapping, FFT size, smoothing
- Colors: 10 palettes + custom gradient editor, hue cycling, beat color flash, glow
- Camera/FX: auto-orbit, FOV, beat camera shake, bloom, vignette, chromatic aberration
- Per-scene sliders (height, spin, particle count, tunnel speed/size, displacement, etc.)

**Beat detection** — energy-history algorithm with BPM estimate, beat light, and beat-driven visuals

**Presets** — save/load/delete in localStorage, export/import as JSON

**Export** — WebM video recording (visuals + audio), PNG screenshots

**Shortcuts** — `Space` play/pause · `←/→` prev/next · `H` hide UI · `F` fullscreen · `S` screenshot · `R` record · `X` randomize

## Structure

- `src/audio.js` — AudioContext graph, sources, transport, playlist
- `src/analyzer.js` — spectrum bands + beat detection/BPM
- `src/scenes/` — one module per scene, registry in `index.js` (easy to add more)
- `src/controls.js` — schema-driven control panel
- `src/palette.js` — gradient palette engine
- `src/presets.js`, `src/recorder.js` — persistence and export

Note: mic mode intentionally does not route to speakers (avoids feedback).
