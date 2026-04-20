# CF DJ Mixer — Layer 3

## Prerequisites
- GSC shows real impressions on "browser dj mixer" or "online dj mixer" keyword cluster
- L2 fully live and working end-to-end (including Chrome extension handoff)

## Goal
Full polish, beat sync, mix recording, programmatic variants, and GA4 wired to real tracking ID.

---

## Feature 1 — Beat Sync (Priority 1)

### 1a. Tempo Sync (build first, ~2 hours)

Lift BPM state from each DeckPanel up to App.jsx so both decks can read each other's BPM.

Add a **"Sync"** button per deck. On click:
```js
const rate = thisDeck.bpm / otherDeck.bpm
const mediaEl = wavesurfer.getMediaElement()
mediaEl.playbackRate = rate
mediaEl.preservesPitch = true  // Chrome 86+, Safari 14+ — no chipmunk effect
```

Add a **sync indicator** (lit icon) when a deck is rate-locked to the other.

Sync resets to `playbackRate = 1.0` when a new track is loaded.

**Cross-deck BPM access pattern:**
- App.jsx holds `deckBpm: { A: null, B: null }` state
- DeckPanel calls `onBpmDetected(deckId, bpm)` callback after analysis
- "Sync" button receives `otherDeckBpm` as a prop

### 1b. Nudge Buttons (+nudge/−nudge, ~1 hour)

Two small buttons per deck (◀ ▶) that temporarily bump `playbackRate` ±10% for 300ms then snap back.
Lets the user manually phase-align beats after tempo sync. This is the Pioneer CDJ jog wheel equivalent.

```js
function nudge(direction) {
  const el = wavesurfer.getMediaElement()
  const base = el.playbackRate
  el.playbackRate = base * (direction === 'fwd' ? 1.1 : 0.9)
  setTimeout(() => { el.playbackRate = base }, 300)
}
```

### 1c. Phase Snap (harder, ~1 day)

**Goal:** on Sync click, also seek the slave deck so its next beat lands at the same phase as the master.

**How:**
1. Expose beat grid from `detectBpm()` — it already computes the onset envelope. Return the top-N onset peak timestamps instead of just the BPM.
2. Store `beatGrid: number[]` (array of beat timestamps in seconds) per deck.
3. On Sync:
   - Get master's current time: `masterNow = wavesurfer.getCurrentTime()`
   - Find master's phase within its beat: `masterPhase = masterNow % masterBeatInterval` → normalized 0–1
   - Find the slave's nearest beat to its current position
   - Seek slave to `nearestBeat + (masterPhase * slaveBeatInterval)`
4. Result: beats land simultaneously within ~10ms

**Caveat:** assumes beat 1 = t=0 for both tracks. Works for most AI-generated / electronic music. For tracks with pre-roll, phase will be off by a constant offset — nudge buttons fix this.

---

## Feature 2 — Mix Recording / Export (~1 day)

Use `MediaRecorder` API to capture the Web Audio output.

```js
// Tap the master output before destination
const dest = audioContext.createMediaStreamDestination()
masterGainNode.connect(dest)
const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' })

recorder.ondataavailable = (e) => chunks.push(e.data)
recorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm' })
  const url = URL.createObjectURL(blob)
  // offer download link
}
```

Add **Record** button to the mixer UI. Shows elapsed time while recording. On stop: offers download as `mix-[timestamp].webm`.

No server upload — entirely client-side.

---

## Feature 3 — CF Studio Track Browser (stretch)

Instead of requiring the Chrome extension, add an in-app search:
- Input: paste a CF Studio track page URL
- Fetch `/api/track-meta?slug=...` → get title + artwork
- User still needs to press Play on CF Studio page to get the audio URL (CORS limitation unless DevOps adds `Access-Control-Allow-Origin` to the S3 bucket)

If S3 CORS is resolved: the track browser becomes a real search UI using the CF Studio public API (if available) or scraping via the proxy.

---

## Feature 4 — Programmatic Landing Pages

Target long-tail keywords with dedicated URLs:
- `/online-dj-mixer/` — primary
- `/browser-dj-mixer/` — variant
- `/mix-ai-music-online/` — Studio AI angle

Each is a static HTML page (or Vite route) with unique `<title>`, `<meta>`, `<h1>`, and FAQ section. Same mixer component, different SEO shell.

Deploy as separate Vercel routes or via the freesongwritingtools.com hub.

---

## Feature 5 — GA4 + Amplitude Wiring

Replace console.log stubs with real events:
```js
gtag('event', 'tool_used', { deck, source, track_name })
gtag('event', 'cta_clicked', { destination, cta_text })
gtag('event', 'sync_used', { master_bpm, slave_bpm })
gtag('event', 'mix_recorded', { duration_seconds })
```

Verify referral tag fires in Amplitude before marking L3 done.

---

## L3 Acceptance Criteria
- [ ] Tempo sync button works (rate + preservesPitch)
- [ ] Nudge buttons (◀ ▶) work per deck
- [ ] Phase snap on sync click (beat grid from analysis)
- [ ] Mix recording: Record button → download .webm
- [ ] GA4 events wired to real tracking ID (from BRIEF.md)
- [ ] Referral tag verified in Amplitude
- [ ] Programmatic landing page variants built
- [ ] Mobile tested on real device
- [ ] INFRA.md updated with live URL and all statuses
- [ ] `npm run build` passes

## Beat Sync — Build Order
1. Lift BPM state to App.jsx → cross-deck BPM prop
2. Tempo sync button + `playbackRate` (1a)
3. Nudge buttons (1b)
4. Expose beat grid from `detectBpm()` (1c prep)
5. Phase snap logic (1c)
