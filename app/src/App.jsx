import { useEffect, useState } from 'react'
import DeckPanel from './components/DeckPanel'
import Crossfader from './components/Crossfader'
import { useAudioEngine } from './hooks/useAudioEngine'
import { generateDemoTracks } from './utils/generateDemoTracks'

const CTA_URL = 'https://studio.creativefabrica.com/ai-music-generator/ref/21659269/'
const CTA_TEXT = 'Generate More AI Tracks in Studio AI →'

function gaEvent(name, params = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, params)
    if (name === 'cta_clicked') window.gtag('event', 'generate_lead', params)
  } else {
    console.log('GA4:', name, params)
  }
}

function CTAButton({ className = '' }) {
  const handleClick = () => {
    gaEvent('cta_clicked', { tool: 'cf-dj-mixer', destination: CTA_URL })
  }

  return (
    <a
      href={CTA_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`inline-block bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors ${className}`}
    >
      {CTA_TEXT}
    </a>
  )
}

function AudioOverlay({ onEnable }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-xl p-8 text-center max-w-md mx-4">
        <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Enable Audio</h2>
        <p className="text-slate-400 mb-6">
          Your browser requires a click to enable audio playback.
        </p>
        <button
          onClick={onEnable}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Click to Enable Audio
        </button>
      </div>
    </div>
  )
}

function parseLoadParam() {
  try {
    const raw = new URLSearchParams(window.location.search).get('load')
    if (!raw) return null
    return Object.fromEntries(new URLSearchParams(decodeURIComponent(raw)))
  } catch { return null }
}

function App() {
  const audioEngine = useAudioEngine()
  const [demoTracks, setDemoTracks] = useState({ deckA: null, deckB: null })
  const [isGenerating, setIsGenerating] = useState(true)
  const [loadParams] = useState(() => parseLoadParam())
  const [externalLoads, setExternalLoads] = useState({ A: null, B: null })

  // Listen for postMessage from the CF Studio extension (subsequent loads into same session)
  useEffect(() => {
    function handleMessage(e) {
      if (e.data?.type !== 'CF_LOAD_TRACK') return
      const { deck, audioUrl, title, artist, thumb, trackId } = e.data
      if (!audioUrl || !deck) return
      setExternalLoads(prev => ({
        ...prev,
        [deck]: { audioUrl, title, artist, thumb, trackId, _ts: Date.now() },
      }))
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Generate demo tracks on mount
  useEffect(() => {
    let cancelled = false

    async function loadDemos() {
      try {
        const tracks = await generateDemoTracks()
        if (!cancelled) {
          setDemoTracks(tracks)
          setIsGenerating(false)
        }
      } catch (err) {
        console.error('Failed to generate demo tracks:', err)
        if (!cancelled) {
          setIsGenerating(false)
        }
      }
    }

    loadDemos()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Safari AudioContext Resume Overlay */}
      {audioEngine.needsUserGesture && (
        <AudioOverlay onEnable={audioEngine.resumeAudio} />
      )}

      {/* Header */}
      <header className="border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-center sm:text-left">
            Free Browser DJ Mixer — Mix AI Music in Your Browser
          </h1>
          <CTAButton className="shrink-0" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tool Placeholder Area */}
        <section className="mb-12">
          <div className="bg-slate-800 rounded-xl p-6 md:p-8">
            {/* Loading State */}
            {isGenerating && (
              <div className="text-center py-8 text-slate-400">
                Generating demo tracks...
              </div>
            )}

            {/* Dual Deck Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DeckPanel
                deckId="A"
                demoTrack={demoTracks.deckA}
                audioEngine={audioEngine}
                loadParam={loadParams?.deck !== 'B' ? loadParams : null}
                externalLoad={externalLoads.A}
              />
              <DeckPanel
                deckId="B"
                demoTrack={demoTracks.deckB}
                audioEngine={audioEngine}
                loadParam={loadParams?.deck === 'B' ? loadParams : null}
                externalLoad={externalLoads.B}
              />
            </div>

            {/* Crossfader */}
            <div className="mt-6">
              <Crossfader
                value={audioEngine.crossfaderValue}
                onChange={audioEngine.setCrossfader}
              />
            </div>
          </div>
          <p className="text-center text-slate-400 mt-4">
            Supports MP3, WAV — load any audio track or generate one with Studio AI.
          </p>
        </section>

        {/* CTA Below Tool */}
        <section className="text-center mb-16">
          <CTAButton />
        </section>

        {/* Chrome Extension */}
        <section className="mb-16">
          <div className="bg-slate-800 rounded-xl p-6 md:p-8 border border-purple-500/30">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Icon */}
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">Load CF Studio Tracks Instantly</h2>
                  <span className="text-xs bg-purple-600/40 text-purple-300 border border-purple-500/40 rounded-full px-2 py-0.5 font-medium">Chrome Extension</span>
                </div>
                <p className="text-slate-400 mb-5">
                  Install the free browser extension to add a "Load in DJ Mixer" button directly on Studio AI track pages. One click loads the track, artwork, and artist info into whichever deck you choose — no copy-pasting URLs.
                </p>

                {/* Steps */}
                <ol className="space-y-3 mb-5">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="text-slate-200 text-sm font-medium">
                        <a
                          href="/cf-studio-ext.zip"
                          download
                          className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
                        >
                          Download the extension
                        </a>
                        {' '}and unzip it
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">You'll get a folder called <code className="bg-slate-700 px-1 rounded">cf-studio-ext</code>. Keep it somewhere permanent — Chrome loads it from disk.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="text-slate-200 text-sm font-medium">Open Chrome Extensions</p>
                      <p className="text-slate-500 text-xs mt-0.5">Go to <code className="bg-slate-700 px-1 rounded">chrome://extensions</code> and turn on <strong className="text-slate-300">Developer mode</strong> (top-right toggle).</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      <p className="text-slate-200 text-sm font-medium">Load Unpacked</p>
                      <p className="text-slate-500 text-xs mt-0.5">Click <strong className="text-slate-300">Load unpacked</strong> and select the <code className="bg-slate-700 px-1 rounded">cf-studio-ext</code> folder.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <div>
                      <p className="text-slate-200 text-sm font-medium">Visit any Studio AI track page</p>
                      <p className="text-slate-500 text-xs mt-0.5">Open a track on <code className="bg-slate-700 px-1 rounded">studio.creativefabrica.com/ai-music-generator/</code> — press Play on the track, then click the <strong className="text-slate-300">🎛 Load in DJ Mixer</strong> button that appears in the bottom-right corner.</p>
                    </div>
                  </li>
                </ol>

                <p className="text-slate-500 text-xs">
                  The extension only runs on Studio AI track pages. It reads no personal data and makes no network requests of its own.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Load Your Tracks</h3>
              <p className="text-slate-400">
                Load an audio file onto each deck. Drag and drop or click to upload MP3 or WAV files — or generate fresh tracks with Studio AI.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Adjust EQ & Volume</h3>
              <p className="text-slate-400">
                Use the 3-band EQ (low, mid, high) and volume controls on each deck to shape your sound and balance the mix before blending.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Crossfade & Transition</h3>
              <p className="text-slate-400">
                Slide the crossfader to smoothly transition between Deck A and Deck B. Create seamless mixes by blending tracks in real time.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">What is a browser DJ mixer and how does it work?</h3>
              <p className="text-slate-400">
                A browser DJ mixer is a web-based application that lets you mix audio tracks directly in your browser without installing any software. It uses the Web Audio API to process sound in real time, giving you professional DJ controls like dual decks, EQ, and a crossfader. Simply load audio files onto each deck, adjust the volume and EQ to shape each track's sound, then use the crossfader to blend between them. Everything runs locally in your browser — no uploads, no servers, no latency.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Can I mix AI-generated music in this DJ mixer?</h3>
              <p className="text-slate-400">
                Absolutely. This mixer works with any audio file, including tracks generated by AI music tools like Studio AI. Download your AI-generated tracks as MP3 or WAV files, then load them into the decks just like any other audio. AI music is perfect for DJing because you can generate tracks tailored to specific BPMs, genres, or moods — giving you an endless supply of royalty-free material to mix. Click the "Generate More AI Tracks" button to create fresh tracks in Studio AI.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">What audio formats does the browser DJ mixer support?</h3>
              <p className="text-slate-400">
                The mixer supports MP3 and WAV files — the two most common audio formats for music production and DJing. MP3 files are smaller and load faster, while WAV files offer uncompressed audio quality. Most AI music generators export in both formats, so you can choose based on your needs. Simply drag and drop files onto a deck or use the file picker to load your tracks.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">How does the EQ (equalizer) work in the DJ mixer?</h3>
              <p className="text-slate-400">
                The 3-band EQ lets you boost or cut specific frequency ranges on each deck independently. The Low knob controls bass frequencies (kick drums, bass lines), Mid handles vocals and melodic elements, and High affects cymbals, hi-hats, and treble. DJs use EQ to prevent frequency clashes when mixing — for example, cutting the bass on the incoming track while the outgoing track's bass is still playing, then swapping them during the transition. This creates cleaner, more professional-sounding mixes.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">What is a crossfader and how do I use it?</h3>
              <p className="text-slate-400">
                The crossfader is a horizontal slider that controls the balance between Deck A and Deck B. When it's fully left, you hear only Deck A; fully right, only Deck B; in the center, you hear both equally. To transition between tracks, start with the crossfader on the side of the currently playing deck, cue up the next track on the other deck, then slowly slide the crossfader across while both tracks play. Combine this with EQ adjustments for smooth, professional-sounding transitions.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Can I record or export my DJ mix?</h3>
              <p className="text-slate-400">
                Recording and export features are coming soon. For now, you can use your operating system's built-in audio recording (like macOS's QuickTime or Windows' Voice Recorder) to capture the audio output while you mix. Set your system to record "system audio" or "stereo mix" and hit record before you start your set. This captures everything playing through your speakers, including your crossfades and EQ adjustments.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>Free Browser DJ Mixer — Mix AI-generated tracks online.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
