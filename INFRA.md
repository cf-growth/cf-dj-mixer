# CF DJ Mixer — INFRA

## Overview
Browser DJ mixer with dual decks, 3-band EQ, volume, crossfader, and WaveSurfer.js waveform display.
Loads AI tracks from CF Studio via a companion Chrome extension.

---

## Repos & Deploy

| Item | Value |
|------|-------|
| GitHub repo | TBD — move to cf-growth org |
| Vercel project | TBD |
| Live URL | TBD |
| Dev server | `http://localhost:4050` |
| Deploy command | `cd app && npm install && npm run build` |
| Output dir | `app/dist` |

---

## Referral Tag
- Status: **in code** — `CTA_URL` in `App.jsx` includes `/ref/21659269/`
- Not yet verified in Amplitude (pending deploy)

---

## Analytics
- GA4 stubs in place (`tool_used`, `cta_clicked`) — console.log only, not wired to tracking ID yet

---

## Architecture

### Mixer App (`cf-dj-mixer/app/`)
- React + Tailwind + Vite
- WaveSurfer.js v7 (HTML5 audio backend, lazy DSP connect on first Play)
- Web Audio API: GainNode + BiquadFilterNode chain per deck
- AudioContext created only after user gesture (no autoplay policy violation)
- `useAudioEngine` hook manages shared AudioContext + crossfader + per-deck chains
- `DeckPanel` component handles per-deck state: waveform, play/pause, loop, volume, EQ, track metadata

### CORS Proxy (`cf-dj-mixer/api/proxy.js`)
- Vercel serverless function (CommonJS)
- Validates URL starts with `https://cf-upscaler-live.s3.amazonaws.com/musicGenerator/`
- Fetches S3 audio server-side, returns with `Access-Control-Allow-Origin: *`
- Handles Range headers for streaming
- Required because CF Studio S3 bucket has no CORS headers for external origins

### Track Meta API (`cf-dj-mixer/api/track-meta.js`)
- Fetches CF Studio page server-side, parses `og:title` meta tag
- Returns `{ title, artwork, slug }`

### Vite Dev Proxy
- `/api/proxy` → rewrites to S3 path on `cf-upscaler-live.s3.amazonaws.com`
- Mirrors production proxy behaviour locally

### `vercel.json`
```json
{
  "buildCommand": "cd app && npm install && npm run build",
  "outputDirectory": "app/dist",
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" }]
}
```

---

## CF Studio Chrome Extension (`cf-studio-ext/`)

### What it does
Runs on `studio.creativefabrica.com/ai-music-generator/*` track pages.
Scrapes track metadata from DOM, injects a "🎛 Load in DJ Mixer" button (fixed bottom-right).

### Click flow
1. **First click** → shows deck picker (A / B)
2. **Deck A or B (first open)** → `window.open(buildMixerUrl(data, deck), 'cf-dj-mixer')` — opens mixer in named tab with `?load=` query params
3. **Deck A or B (mixer already open)** → `mixerWindow.postMessage({type:'CF_LOAD_TRACK', deck, ...}, MIXER_URL)` — sends track to existing tab without reload, state preserved

### Scraping selectors
- Title: `h1`
- Artist: `a[href*="/profiles/"]` → `a[href*="/creator/"]` → `a[href*="/artist/"]` (fallback chain)
- Artwork: `img[src*="musicGenerator"]`
- Audio URL: `audio` element src (only present after pressing Play)
- Track ID: last URL path segment

### postMessage listener (mixer side)
App.jsx listens for `{ type: 'CF_LOAD_TRACK', deck, audioUrl, title, artist, thumb, trackId }`.
Routes to the correct DeckPanel via `externalLoads` state → `externalLoad` prop.

### TODO before publish
- [ ] Swap `MIXER_URL = 'http://localhost:4050'` → production URL
- [ ] Verify artist selector matches live CF Studio DOM (check `/profiles/` vs `/creator/`)
- [ ] Submit to Chrome Web Store (or distribute as unpacked for internal use)

---

## Known Gotchas

- **AudioContext autoplay**: WaveSurfer must NOT be initialized with an AudioContext. DSP chain connects lazily on first Play button click.
- **WaveSurfer v7**: No `backend: 'WebAudio'` option. Always uses HTML5 audio. `getMediaElement()` returns the `<audio>` element.
- **CF S3 CORS**: All CF Studio audio URLs must go through `/api/proxy` — direct fetch is blocked by S3 CORS policy.
- **Artist scraping**: CF Studio is a CSR app. Extension uses MutationObserver to wait for `h1` before injecting button. Audio URL only appears after user presses Play on the track.
- **Demo track guard**: Demo track `useEffect` checks `if (loadParam) return` to prevent overwriting extension-loaded tracks on mount.
