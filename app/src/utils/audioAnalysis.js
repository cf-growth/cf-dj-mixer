/**
 * Client-side BPM and musical key detection.
 * Both run on a decoded AudioBuffer — no external dependencies.
 *
 * detectBpm(buffer)  → number | null
 * detectKey(buffer)  → { key: 'Am', camelot: '8A' }
 */

// ─── BPM Detection ───────────────────────────────────────────────────────────
// Energy envelope → onset flux → autocorrelation peak in 60–200 BPM range.

export function detectBpm(buffer) {
  const ch = buffer.getChannelData(0)
  const sr = buffer.sampleRate
  const frameSize = 512

  // Use up to 60s from the middle of the track (avoids intros/outros)
  const totalFrames = Math.floor(ch.length / frameSize)
  const targetFrames = Math.min(totalFrames, Math.floor((sr * 60) / frameSize))
  const startFrame = Math.floor((totalFrames - targetFrames) / 2)

  // RMS energy per frame
  const energy = new Float32Array(targetFrames)
  for (let i = 0; i < targetFrames; i++) {
    let sum = 0
    const base = (startFrame + i) * frameSize
    for (let j = 0; j < frameSize; j++) {
      const s = ch[base + j]
      sum += s * s
    }
    energy[i] = Math.sqrt(sum / frameSize)
  }

  // Onset strength = positive energy flux
  const onset = new Float32Array(targetFrames)
  for (let i = 1; i < targetFrames; i++) {
    onset[i] = Math.max(0, energy[i] - energy[i - 1])
  }

  const maxOnset = Math.max(...onset)
  if (maxOnset < 1e-6) return null // silence / no beat
  for (let i = 0; i < onset.length; i++) onset[i] /= maxOnset

  // Autocorrelation across BPM range
  const fps = sr / frameSize
  const minLag = Math.max(1, Math.floor((fps * 60) / 200))
  const maxLag = Math.ceil((fps * 60) / 60)

  let bestCorr = -Infinity
  let bestLag = minLag
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    const n = targetFrames - lag
    for (let i = 0; i < n; i++) corr += onset[i] * onset[i + lag]
    corr /= n
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag }
  }

  let bpm = (fps * 60) / bestLag

  // Snap half-time / double-time to 85–175 BPM sweet spot
  if (bpm < 85) bpm *= 2
  if (bpm > 175) bpm /= 2

  return Math.round(bpm)
}

// ─── Key Detection ───────────────────────────────────────────────────────────
// Goertzel algorithm builds a 12-bin chroma vector, then Krumhansl-Kessler
// correlation picks the best matching major or minor key.

const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

// Flat notation preferred by DJs
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// Camelot wheel — indexed by pitch class (0=C … 11=B)
const CAMELOT_MAJOR = { 0: '8B', 7: '9B', 2: '10B', 9: '11B', 4: '12B', 11: '1B', 6: '2B', 1: '3B', 8: '4B', 3: '5B', 10: '6B', 5: '7B' }
const CAMELOT_MINOR = { 8: '1A', 3: '2A', 10: '3A', 5: '4A', 0: '5A', 7: '6A', 2: '7A', 9: '8A', 4: '9A', 11: '10A', 6: '11A', 1: '12A' }

function goertzel(data, freq, sr) {
  const omega = (2 * Math.PI * freq) / sr
  const coeff = 2 * Math.cos(omega)
  let s1 = 0, s2 = 0
  for (let i = 0; i < data.length; i++) {
    const s0 = data[i] + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2
}

function computeChroma(buffer) {
  const ch = buffer.getChannelData(0)
  const sr = buffer.sampleRate

  // Analyze 15s from the middle (avoids intros)
  const windowSamples = Math.min(ch.length, sr * 15)
  const start = Math.floor((ch.length - windowSamples) / 2)
  const data = ch.subarray(start, start + windowSamples)

  const chroma = new Float32Array(12)
  // C2 (MIDI 36) → B5 (MIDI 83) — 4 octaves
  for (let midi = 36; midi < 84; midi++) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12)
    chroma[midi % 12] += goertzel(data, freq, sr)
  }
  return chroma
}

function pearsonCorr(a, b) {
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb
    num += x * y; da += x * x; db += y * y
  }
  const denom = Math.sqrt(da * db)
  return denom < 1e-10 ? 0 : num / denom
}

export function detectKey(buffer) {
  const chroma = computeChroma(buffer)
  const chromaArr = Array.from(chroma)

  let best = { corr: -Infinity, key: 0, mode: 'major' }

  for (let k = 0; k < 12; k++) {
    // Rotate chroma so pitch class k is at index 0
    const rot = chromaArr.map((_, i) => chroma[(i + k) % 12])

    const majorCorr = pearsonCorr(rot, KK_MAJOR)
    const minorCorr = pearsonCorr(rot, KK_MINOR)

    if (majorCorr > best.corr) best = { corr: majorCorr, key: k, mode: 'major' }
    if (minorCorr > best.corr) best = { corr: minorCorr, key: k, mode: 'minor' }
  }

  const noteName = NOTE_NAMES[best.key]
  const key = best.mode === 'minor' ? `${noteName}m` : noteName
  const camelot = best.mode === 'major' ? CAMELOT_MAJOR[best.key] : CAMELOT_MINOR[best.key]

  return { key, camelot }
}
