# CF DJ Mixer — Layer 1 (SEO Shell)

## Goal
Build a deployable SEO shell for the CF DJ Mixer at `app-factory/cf-dj-mixer/app/`. The page must rank for "browser dj mixer" and related mixing keywords. The tool itself is a static placeholder — no audio logic yet.

## Context
- Read `app-factory/CLAUDE.md` for project rules, tech stack, and Layer 1 exit criteria before writing any code
- Read `app-factory/cf-dj-mixer/BRIEF.md` for all SEO fields, CTA destination, placeholder spec, and FAQ topics
- Stack: React + Tailwind CSS + Vite — scaffold a fresh Vite project at `app-factory/cf-dj-mixer/app/`
- Referral tag: `/ref/21659269/` must appear on all CF/Studio AI links
- CTA destination: https://studio.creativefabrica.com/ai-music-generator/ref/21659269/

## Requirements

- Scaffold fresh Vite + React + Tailwind project at `cf-dj-mixer/app/`
- `index.html` must include all SEO meta tags from BRIEF.md (title, description, OG, Twitter Card)
- H1: "Free Browser DJ Mixer — Mix AI Music in Your Browser" — exact match
- Tool placeholder: two greyed-out deck panels side by side (stack on mobile). Each deck shows a waveform placeholder bar, track name "Load a track →", and disabled Play/Pause button. A horizontal crossfader slider sits between the two decks labeled "A ◀──────▶ B". Below: "Supports MP3, WAV — load any audio track or generate one with Studio AI."
- "How It Works" section: 3 steps — (1) Load a track onto each deck, (2) Adjust EQ and volume to blend them, (3) Use the crossfader to transition between tracks
- FAQ section: all 6 questions from BRIEF.md with substantive answers (3–5 sentences each, real DJ/music production context)
- CTA component: appears in the header area and below the tool placeholder. Copy: "Generate More AI Tracks in Studio AI →". Links to https://studio.creativefabrica.com/ai-music-generator/ref/21659269/
- Dark theme (dark gray/slate background) — this is a DJ tool, dark UI is appropriate
- Mobile responsive throughout
- `npm run build` must pass

## Acceptance Criteria
- [ ] Title tag: "Browser DJ Mixer — Mix AI Tracks Free Online" (under 60 chars)
- [ ] Meta description contains "browser dj mixer", under 155 chars
- [ ] H1 is "Free Browser DJ Mixer — Mix AI Music in Your Browser"
- [ ] og:title, og:description, og:type present in index.html
- [ ] FAQ has 6 questions with substantive answers
- [ ] How It Works has 3 steps
- [ ] CTA links to Studio AI music generator with referral tag
- [ ] Tool placeholder: two deck panels + crossfader renders without errors
- [ ] Dark theme applied
- [ ] Mobile responsive
- [ ] `npm run build` passes
- [ ] BRIEF.md updated: `layer1_done: true`

## Out of Scope
- Any real audio playback — Layer 2
- Tone.js or WaveSurfer.js — Layer 2
- File loading — Layer 2
- EQ controls — Layer 2 (placeholder/disabled only in L1)
- GA4 events — Layer 2

DO_NOT_COMMIT
