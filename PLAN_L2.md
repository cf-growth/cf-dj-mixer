# CF DJ Mixer — Layer 2 (Minimum Viable Tool)

## Goal
Add real audio playback and mixing to the Layer 1 shell at `app-factory/cf-dj-mixer/app/`. Two working decks with volume, 3-band EQ, and crossfader. No CF Studio API integration — uses procedural demo tracks and local file uploads only.

## Context
- Read `app-factory/CLAUDE.md` for project rules and Layer 2 exit criteria
- Read `app-factory/cf-dj-mixer/BRIEF.md` — specifically `tech_notes_layer2` before writing any code
- Existing app is a React + Tailwind + Vite project with a Layer 1 SEO shell already built
- Replace the deck placeholders with fully working components
- Do NOT modify index.html SEO tags, FAQ, HowItWorks, or CTA components

## Dependencies to Install
```
npm install tone wavesurfer.js
```

## Requirements

### 1. Demo Track Generation
- On app load, create 2 procedural demo tracks using OfflineAudioContext (no Tone.js needed for generation):
  - **Demo A "House Beat"** — 128 BPM, ~10 seconds loopable. 4-on-the-floor kick (sine sweep 120→40Hz, 150ms), hi-hat every 8th note (white noise, 40ms), bass sine at 60Hz on beats 1+3.
  - **Demo B "Lo-Fi Loop"** — 90 BPM, ~10 seconds loopable. Kick on beats 1+3 (sine sweep 100→30Hz, 200ms), snare on 2+4 (white noise bandpass ~300Hz, 200ms), pad chord (3 sine waves: 220Hz, 277Hz, 330Hz, slow attack, 0.08 gain each).
- Render to AudioBuffer via OfflineAudioContext.startRendering()
- Convert to Blob URL (WAV) using audioBufferToWav helper function
- Load into WaveSurfer instances on each deck automatically

### 2. DSP Chain (per deck, using raw Web Audio API nodes)
```
AudioBufferSourceNode (WaveSurfer's internal node via Web Audio API)
  → GainNode (deck volume, default 0.8)
  → BiquadFilterNode lowshelf  freq=200Hz  gain=0  (Low EQ)
  → BiquadFilterNode peaking   freq=1000Hz gain=0  (Mid EQ)
  → BiquadFilterNode highshelf freq=3000Hz gain=0  (High EQ)
  → GainNode (crossfader send)
  → AudioContext.destination
```
Note: WaveSurfer v7 exposes `wavesurfer.getMediaElement()` — wrap in `createMediaElementSource` or use WaveSurfer's Web Audio plugin. Check WaveSurfer v7 docs for the correct way to tap into the audio graph.

### 3. Crossfader
- Linear power crossfader: Deck A gain = cos(x * π/2), Deck B gain = cos((1−x) * π/2), where x is 0–1
- Default position: 0.5 (equal blend)
- Full-width slider between/below the two decks
- Label: "A ◀──────▶ B"

### 4. Per-Deck UI Controls
Each deck must have:
- WaveSurfer waveform display (click to seek)
- Track name display
- Play / Pause button
- Loop toggle button (WaveSurfer loop option)
- Volume slider (0–100%)
- BPM display (static, set from demo track metadata or user input)
- EQ section: Low / Mid / High sliders (range -12 to +12 dB)
- "Load File" button — file input, accepts audio/*
- "Load Demo" button — loads the pre-generated demo track for this deck

### 5. Playback
- Play/Pause controls WaveSurfer playback
- When a new file is loaded, stop current playback and reload waveform
- Loop by default (DJ tools loop tracks)

### 6. GA4 Stubs
```js
console.log('GA4 Event: tool_used', { deck, trackName, source: 'demo'|'file' })
console.log('GA4 Event: cta_clicked', { destination: CTA_URL })
```

### 7. CTA Placement
- CTA appears below the mixer (always visible, not gated on interaction)
- Copy: "Generate More AI Tracks in Studio AI →"
- Link: https://studio.creativefabrica.com/ai-music-generator/ref/21659269/

## Acceptance Criteria
- [ ] `tone` and `wavesurfer.js` installed as dependencies
- [ ] Two working decks: each plays audio, shows waveform, allows seek
- [ ] Demo tracks load automatically on page load (no user action required)
- [ ] File upload works on both decks (MP3, WAV, OGG, M4A)
- [ ] Volume slider works per deck
- [ ] EQ (Low/Mid/High) sliders work per deck — audible effect
- [ ] Crossfader blends between decks — moving it fully left silences Deck B, fully right silences Deck A
- [ ] Play/Pause works independently per deck
- [ ] Loop toggle works per deck
- [ ] GA4 stubs log to console on track load and CTA click
- [ ] CTA visible below mixer with referral tag
- [ ] No console errors during normal use
- [ ] `npm run build` passes with no errors
- [ ] BRIEF.md updated: `layer2_done: true`

## Out of Scope
- CF Studio API track browser — Layer 3
- Mix recording/export — Layer 3
- BPM sync between decks — Layer 3
- Any design polish beyond functional layout
- Hotcues, loops, effects beyond 3-band EQ

## Delivered Beyond Spec (L2 session)
These were built during L2 but are L3-quality features:
- **CF Studio S3 CORS proxy** — Vercel serverless function proxies audio from `cf-upscaler-live.s3.amazonaws.com`
- **Chrome extension (`cf-studio-ext`)** — scrapes CF Studio track pages, injects "Load in DJ Mixer" button, sends track via `?load=` params (first open) or `postMessage` (same session). Deck A/B picker on click.
- **Auto BPM detection** — autocorrelation on energy envelope, runs on decoded AudioBuffer after track loads
- **Auto key detection** — Goertzel + Krumhansl-Kessler chroma analysis, returns Camelot notation (e.g. `8A · Am`)
- **Artist name display** — scraped from extension, displayed below track title in purple

## Known Issues / Watch-outs
- WaveSurfer v7 API differs significantly from v6 — check the v7 docs before writing any WaveSurfer code. Use `WaveSurfer.create()` with `media` option for Web Audio API integration.
- OfflineAudioContext has a sample rate requirement — use AudioContext.sampleRate (typically 44100) when creating it
- audioBufferToWav: implement a minimal PCM encoder (Int16 samples, WAV header) — ~30 lines, no library needed
- Safari requires user gesture before AudioContext can start — show a "Click to enable audio" overlay if AudioContext.state === 'suspended'

DO_NOT_COMMIT
