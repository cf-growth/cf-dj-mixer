# BRIEF — CF DJ Mixer

```
tool_name:        cf-dj-mixer
layer_target:     2
status:           scoped

primary_keyword:  browser dj mixer
volume:           40,000
comp_index:       18

h1:               Free Browser DJ Mixer — Mix AI Music in Your Browser
title_tag:        Browser DJ Mixer — Mix AI Tracks Free Online
meta_description: Free online DJ mixer. Two decks, EQ, crossfader — mix AI-generated music tracks right in your browser. No install needed.
og_title:         Free Browser DJ Mixer — Mix AI Music Online
og_description:   Two-deck DJ mixer with EQ and crossfader. Mix AI-generated tracks in your browser — no download, no signup.

semantic_pathway: Music creator wants to mix AI tracks → "browser dj mixer" → free 2-deck mixer → mixes CF Studio AI tracks → "Generate more tracks in Studio AI →" → AI Music Generator → free trial
cta_destination:  https://studio.creativefabrica.com/ai-music-generator/ref/21659269/
cta_copy:         Generate More AI Tracks in Studio AI →

tool_description: A two-deck browser DJ mixer built on the Web Audio API. Load audio tracks onto each deck, control volume, 3-band EQ, and crossfader in real time.

placeholder:      Two greyed-out deck panels side by side. Each shows a waveform placeholder, track name "Load a track →", and disabled Play/Pause button. A crossfader slider sits between them at center. Below: "Supports MP3, WAV — load any audio track or generate one with Studio AI."

faq_topics:
  - What is a browser DJ mixer and how does it work?
  - Can I mix AI-generated music in this DJ mixer?
  - What audio formats does the browser DJ mixer support?
  - How does the EQ (equalizer) work in the DJ mixer?
  - What is a crossfader and how do I use it?
  - Can I record or export my DJ mix?

tech_notes_layer1:
  - Static React + Tailwind + Vite scaffold — no audio logic yet
  - Placeholder UI: two deck panels side by side (stack on mobile), disabled controls, crossfader slider
  - No npm audio packages in Layer 1 — just structure and SEO
  - CTA appears twice: in header and below the tool placeholder

tech_notes_layer2:
  - Stack: React + Tailwind + Vite, client-side only
  - Audio library: Tone.js (npm install tone) for Web Audio API abstraction
  - Waveform: WaveSurfer.js (npm install wavesurfer.js) for waveform display and seek
  - CORS note: CF Studio S3 tracks require CORS fix (DevOps task, out of scope for L2). For L2, use DEMO TRACKS generated procedurally — see demo track spec below.

  DEMO TRACKS (required for L2 to work without CORS):
  - Generate 2 short (8-bar, ~10 second) loopable audio buffers procedurally using Tone.js/Web Audio API:
    Demo Track A "House Beat" — 128 BPM, 4-on-the-floor kick pattern + hi-hat, bass sine wave
    Demo Track B "Lo-Fi Loop" — 90 BPM, kick on 1+3, snare on 2+4, mellow pad chord
  - Render these to AudioBuffers using OfflineAudioContext, then create Blob URLs → load into WaveSurfer
  - Label them "Demo: House Beat (128 BPM)" and "Demo: Lo-Fi Loop (90 BPM)" in the UI
  - Also support loading a custom audio file via file input (File API, no CORS issue)

  DSP CHAIN (per deck):
    MediaElementSource or AudioBufferSourceNode
      → GainNode (deck volume, 0–1)
      → BiquadFilterNode type=lowshelf  (Low EQ, freq 200Hz, gain ±12dB)
      → BiquadFilterNode type=peaking   (Mid EQ, freq 1000Hz, gain ±12dB)
      → BiquadFilterNode type=highshelf (High EQ, freq 3000Hz, gain ±12dB)
      → GainNode (crossfader send — deck A = 1-x, deck B = x where x is crossfader 0–1)
      → AudioContext.destination

  CROSSFADER:
  - Linear crossfader: Deck A gain = cos(x * π/2), Deck B gain = cos((1-x) * π/2) where x is 0–1
  - Slider centered at 0.5 by default
  - Visual label: "A ◀──────▶ B"

  UI LAYOUT:
  - Two deck panels side by side (flex-row on desktop, stack on mobile)
  - Each deck: waveform (WaveSurfer), track name, Play/Pause button, BPM display, volume knob (input range)
  - EQ section per deck: Low / Mid / High sliders (vertical preferred, horizontal acceptable)
  - Crossfader: full-width slider between/below the two decks
  - "Load File" button per deck opens file picker
  - "Load Demo" button per deck loads the procedural demo track for that deck

  GA4 stubs (console.log):
  - tool_used: fired when a track is loaded onto a deck
  - cta_clicked: fired when CTA link is clicked

  NO backend, NO CF Studio API integration, NO recording/export — those are Layer 3.
  NO auth, NO login, NO account required.

layer1_done:      true
layer2_done:      true
layer3_done:      false
```

## Notes

This tool is a community engagement play for CF Studio, not purely an SEO play. The conversion path is: free mixer → user runs out of tracks to mix → CTA to generate more in Studio AI. The CORS infrastructure work (S3 policy update) is a separate DevOps task tracked in the CF Studio technical handoff doc (April 17, 2026). Layer 2 deliberately avoids the CORS dependency by using procedurally generated demo tracks and file uploads.

Layer 3 scope: CF Studio track URL loading (pending CORS fix), track browser/search UI pulling from CF Studio API, mix recording/export, BPM sync between decks.
