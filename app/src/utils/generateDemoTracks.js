/**
 * Procedural demo track generator using OfflineAudioContext.
 * Creates two loopable demo tracks for the DJ mixer without external audio files.
 */

import { audioBufferToWav } from './audioBufferToWav';

const SAMPLE_RATE = 44100;

/**
 * Generates Demo Track A: "House Beat" at 128 BPM (~10 seconds)
 * - 4-on-the-floor kick (sine sweep 120→40Hz, 150ms)
 * - Hi-hat every 8th note (white noise, 40ms)
 * - Bass sine at 60Hz on beats 1+3
 */
export async function generateHouseBeat() {
  const bpm = 128;
  const beatsPerBar = 4;
  const bars = 4;
  const totalBeats = beatsPerBar * bars;
  const beatDuration = 60 / bpm;
  const duration = totalBeats * beatDuration;

  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);

  for (let beat = 0; beat < totalBeats; beat++) {
    const beatTime = beat * beatDuration;

    // Kick on every beat (4-on-the-floor)
    scheduleKick(ctx, beatTime, { startFreq: 120, endFreq: 40, duration: 0.15, gain: 0.7 });

    // Hi-hat on every 8th note (2 per beat)
    scheduleHiHat(ctx, beatTime, 0.04, 0.15);
    scheduleHiHat(ctx, beatTime + beatDuration / 2, 0.04, 0.1);

    // Bass on beats 1 and 3 (index 0, 2 within each bar)
    const beatInBar = beat % beatsPerBar;
    if (beatInBar === 0 || beatInBar === 2) {
      scheduleBass(ctx, beatTime, 60, beatDuration * 0.8, 0.3);
    }
  }

  const buffer = await ctx.startRendering();
  const url = audioBufferToWav(buffer);

  return {
    url,
    name: 'Demo: House Beat',
    bpm: 128,
  };
}

/**
 * Generates Demo Track B: "Lo-Fi Loop" at 90 BPM (~10 seconds)
 * - Kick on beats 1+3 (sine sweep 100→30Hz, 200ms)
 * - Snare on beats 2+4 (bandpass filtered white noise ~300Hz, 200ms)
 * - Pad chord (220Hz, 277Hz, 330Hz sines with slow attack)
 */
export async function generateLoFiLoop() {
  const bpm = 90;
  const beatsPerBar = 4;
  const bars = 4;
  const totalBeats = beatsPerBar * bars;
  const beatDuration = 60 / bpm;
  const duration = totalBeats * beatDuration;

  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);

  // Schedule pad chord for the entire duration
  schedulePadChord(ctx, 0, duration, [220, 277, 330], 0.08);

  for (let beat = 0; beat < totalBeats; beat++) {
    const beatTime = beat * beatDuration;
    const beatInBar = beat % beatsPerBar;

    // Kick on beats 1 and 3 (index 0, 2)
    if (beatInBar === 0 || beatInBar === 2) {
      scheduleKick(ctx, beatTime, { startFreq: 100, endFreq: 30, duration: 0.2, gain: 0.6 });
    }

    // Snare on beats 2 and 4 (index 1, 3)
    if (beatInBar === 1 || beatInBar === 3) {
      scheduleSnare(ctx, beatTime, 0.2, 0.4);
    }
  }

  const buffer = await ctx.startRendering();
  const url = audioBufferToWav(buffer);

  return {
    url,
    name: 'Demo: Lo-Fi Loop',
    bpm: 90,
  };
}

/**
 * Schedules a kick drum (sine wave with pitch sweep)
 */
function scheduleKick(ctx, startTime, { startFreq, endFreq, duration, gain }) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Schedules a hi-hat (white noise burst)
 */
function scheduleHiHat(ctx, startTime, duration, gain) {
  const bufferSize = Math.ceil(duration * SAMPLE_RATE);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, SAMPLE_RATE);
  const data = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 7000;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  source.connect(highpass);
  highpass.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(startTime);
  source.stop(startTime + duration);
}

/**
 * Schedules a bass note (sine wave)
 */
function scheduleBass(ctx, startTime, freq, duration, gain) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.setValueAtTime(gain, startTime + duration * 0.8);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Schedules a snare drum (bandpass filtered white noise)
 */
function scheduleSnare(ctx, startTime, duration, gain) {
  const bufferSize = Math.ceil(duration * SAMPLE_RATE);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, SAMPLE_RATE);
  const data = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 300;
  bandpass.Q.value = 1;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  source.connect(bandpass);
  bandpass.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(startTime);
  source.stop(startTime + duration);
}

/**
 * Schedules a pad chord (multiple sine waves with slow attack)
 */
function schedulePadChord(ctx, startTime, duration, frequencies, gainPerVoice) {
  frequencies.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Slow attack envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gainPerVoice, startTime + 0.5);
    gainNode.gain.setValueAtTime(gainPerVoice, startTime + duration - 0.5);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

/**
 * Generates both demo tracks and returns them
 */
export async function generateDemoTracks() {
  const [houseTrack, lofiTrack] = await Promise.all([
    generateHouseBeat(),
    generateLoFiLoop(),
  ]);

  return {
    deckA: houseTrack,
    deckB: lofiTrack,
  };
}
