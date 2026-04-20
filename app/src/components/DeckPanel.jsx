import { useEffect, useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { detectBpm, detectKey } from '../utils/audioAnalysis'

const CTA_URL = 'https://studio.creativefabrica.com/ai-music-generator/ref/21659269/'
const CF_S3_ORIGIN = 'https://cf-upscaler-live.s3.amazonaws.com/musicGenerator/'
const CF_STUDIO_PAGE = 'https://studio.creativefabrica.com/ai-music-generator/'
const CF_STUDIO_ART = 'https://studio.creativefabrica.com/og-image/ai-music-generator-lightbox/'

function resolveAudioUrl(url) {
  if (url.startsWith(CF_S3_ORIGIN)) {
    return `/api/proxy?url=${encodeURIComponent(url)}`
  }
  return url
}

function extractCfSlug(url) {
  if (!url.startsWith(CF_STUDIO_PAGE)) return null
  return url.replace(CF_STUDIO_PAGE, '').split('?')[0].split('/')[0] || null
}

function deriveThumbnail(url) {
  if (!url.startsWith(CF_S3_ORIGIN)) return null
  // Strip proxy wrapper if present
  const s3Url = url.startsWith('/api/proxy?url=')
    ? decodeURIComponent(url.replace('/api/proxy?url=', ''))
    : url
  return s3Url.replace(/\.(mp3|wav|ogg|m4a)(\?.*)?$/, '_thumb_250.webp')
}

function DeckPanel({
  deckId = 'A',
  demoTrack = null,
  audioEngine = null,
  onTrackLoaded = null,
  loadParam = null,
  externalLoad = null,
}) {
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)
  const mediaSourceRef = useRef(null)
  const deckChainRef = useRef(null)
  const dspConnectedRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(true)
  const [trackName, setTrackName] = useState('Load a track →')
  const [artistName, setArtistName] = useState(null)
  const [bpm, setBpm] = useState(null)
  const [camelotKey, setCamelotKey] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [volume, setVolume] = useState(80)
  const [eqLow, setEqLow] = useState(0)
  const [eqMid, setEqMid] = useState(0)
  const [eqHigh, setEqHigh] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [artwork, setArtwork] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return

    // Create WaveSurfer without AudioContext — we connect DSP chain lazily on first Play
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#6366f1',
      progressColor: '#a855f7',
      cursorColor: '#ffffff',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
    })

    ws.on('ready', () => {
      setIsReady(true)
      setLoadError(null)
      // Analyze BPM + key after yielding to the render thread
      const buffer = ws.getDecodedData()
      if (buffer) {
        setIsAnalyzing(true)
        setTimeout(() => {
          try {
            const detectedBpm = detectBpm(buffer)
            const { key, camelot } = detectKey(buffer)
            if (detectedBpm) setBpm(detectedBpm)
            setCamelotKey(`${camelot} · ${key}`)
          } catch (e) {
            console.warn('Audio analysis failed:', e)
          }
          setIsAnalyzing(false)
        }, 50)
      }
    })

    ws.on('error', (err) => {
      const msg = err?.message || String(err)
      const isCors = msg.includes('Failed to fetch') || msg.includes('CORS') || msg.includes('ERR_FAILED')
      if (isCors) {
        setLoadError('cors')
      } else {
        setLoadError('generic')
      }
      setIsReady(false)
    })

    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => {
      if (isLooping && wavesurferRef.current) {
        wavesurferRef.current.seekTo(0)
        wavesurferRef.current.play()
      } else {
        setIsPlaying(false)
      }
    })

    wavesurferRef.current = ws

    return () => {
      if (mediaSourceRef.current) {
        try { mediaSourceRef.current.disconnect() } catch (_) {}
      }
      ws.destroy()
    }
  }, [])

  // Connect WaveSurfer media element to DSP chain — called on first Play (user gesture)
  const ensureDspConnected = useCallback(() => {
    if (dspConnectedRef.current || !audioEngine || !wavesurferRef.current) return

    const ctx = audioEngine.getAudioContext()
    if (!ctx || ctx.state === 'closed') return

    const chain = audioEngine.getDeckChain(deckId)
    if (!chain) return
    deckChainRef.current = chain

    const mediaElement = wavesurferRef.current.getMediaElement()
    if (mediaElement && !mediaSourceRef.current) {
      try {
        const source = ctx.createMediaElementSource(mediaElement)
        source.connect(chain.volumeNode)
        mediaSourceRef.current = source
        dspConnectedRef.current = true
      } catch (e) {
        console.warn('DSP connect failed:', e.message)
      }
    }
  }, [audioEngine, deckId])

  // Handle loop state changes
  useEffect(() => {
    // Loop is handled in the 'finish' event
  }, [isLooping])

  // Update volume in DSP chain
  useEffect(() => {
    if (deckChainRef.current) {
      deckChainRef.current.setVolume(volume / 100)
    }
  }, [volume])

  // Update EQ in DSP chain
  useEffect(() => {
    if (deckChainRef.current) {
      deckChainRef.current.setEqLow(eqLow)
    }
  }, [eqLow])

  useEffect(() => {
    if (deckChainRef.current) {
      deckChainRef.current.setEqMid(eqMid)
    }
  }, [eqMid])

  useEffect(() => {
    if (deckChainRef.current) {
      deckChainRef.current.setEqHigh(eqHigh)
    }
  }, [eqHigh])

  // Load demo track on mount if provided
  useEffect(() => {
    if (demoTrack && wavesurferRef.current && !isReady) {
      // Wait for WaveSurfer to be ready, then load
    }
  }, [demoTrack, isReady])

  // Auto-load demo track — skip if this deck has a ?load= param
  useEffect(() => {
    if (loadParam) return
    if (demoTrack && wavesurferRef.current) {
      loadTrack(demoTrack.url, demoTrack.name, demoTrack.bpm, 'demo')
    }
  }, [demoTrack, loadParam])

  // Auto-load from ?load= query param (CF Studio extension handoff — first open)
  useEffect(() => {
    if (!loadParam || !wavesurferRef.current) return
    if (loadParam.audioUrl) {
      if (loadParam.thumb) setArtwork(loadParam.thumb)
      if (loadParam.artist) setArtistName(loadParam.artist)
      loadTrack(loadParam.audioUrl, loadParam.title || loadParam.trackId || 'CF Studio Track', null, 'extension')
    }
  }, [loadParam])

  // Load from postMessage (CF Studio extension — subsequent loads into same session)
  useEffect(() => {
    if (!externalLoad || !wavesurferRef.current) return
    if (externalLoad.thumb) setArtwork(externalLoad.thumb)
    if (externalLoad.artist) setArtistName(externalLoad.artist)
    else setArtistName(null)
    loadTrack(externalLoad.audioUrl, externalLoad.title || externalLoad.trackId || 'CF Studio Track', null, 'extension')
  }, [externalLoad])

  const loadTrack = useCallback((url, name, trackBpm, source = 'file') => {
    if (!wavesurferRef.current) return

    setIsPlaying(false)
    setIsReady(false)
    setLoadError(null)
    setCamelotKey(null)
    setIsAnalyzing(false)
    wavesurferRef.current.load(resolveAudioUrl(url))
    setTrackName(name)
    setBpm(trackBpm || null)

    // GA4 stub
    console.log('GA4 Event: tool_used', {
      deck: deckId,
      trackName: name,
      source,
    })

    if (onTrackLoaded) {
      onTrackLoaded({ deck: deckId, name, source })
    }
  }, [deckId, onTrackLoaded])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    loadTrack(url, file.name, null, 'file')
  }

  const handleLoadDemo = () => {
    if (demoTrack) {
      loadTrack(demoTrack.url, demoTrack.name, demoTrack.bpm, 'demo')
    }
  }

  const handleLoadUrl = async (e) => {
    e.preventDefault()
    const url = urlInput.trim()
    if (!url) return
    setUrlInput('')

    const slug = extractCfSlug(url)
    if (slug) {
      // CF Studio page URL — load artwork immediately from known pattern, fetch title async
      const artUrl = `${CF_STUDIO_ART}${slug}/result.png`
      setArtwork(artUrl)
      setTrackName('Loading…')
      try {
        const res = await fetch(`/api/track-meta?slug=${slug}`)
        if (res.ok) {
          const meta = await res.json()
          if (meta.title) setTrackName(meta.title)
        }
      } catch { setTrackName(slug) }
      // Still need audio URL separately — show a prompt
      setLoadError('need-audio')
      return
    }

    const name = url.split('/').pop().split('?')[0] || 'Remote Track'
    const thumb = deriveThumbnail(url)
    if (thumb) setArtwork(thumb)
    else if (!artwork) setArtwork(null)
    loadTrack(url, trackName !== 'Load a track →' ? trackName : name, null, 'url')
  }

  const togglePlayPause = () => {
    if (!wavesurferRef.current || !isReady) return
    ensureDspConnected()
    wavesurferRef.current.playPause()
  }

  const toggleLoop = () => {
    setIsLooping((prev) => !prev)
  }

  return (
    <div className="bg-slate-700/50 rounded-lg p-4 md:p-6 flex flex-col gap-4">
      {/* Deck Label + Status */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-purple-400">Deck {deckId}</span>
        <span className={`text-xs uppercase tracking-wide ${isReady ? 'text-green-400' : 'text-slate-500'}`}>
          {isReady ? 'Ready' : 'No Track'}
        </span>
      </div>

      {/* Artwork + Waveform */}
      <div className="flex gap-3 items-stretch">
        {artwork && (
          <img
            src={artwork}
            alt="Track artwork"
            className="w-16 h-16 rounded-md object-cover shrink-0 border border-slate-600"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        )}
        <div className="bg-slate-800 rounded-md border border-slate-600 overflow-hidden flex-1">
          <div ref={waveformRef} className="min-h-[80px]" />
        </div>
      </div>

      {/* Load Error */}
      {loadError === 'need-audio' && (
        <div className="bg-blue-950/50 border border-blue-700/50 rounded-md px-3 py-2 text-xs text-blue-300">
          <span className="font-semibold">Track info loaded.</span> Now paste the direct audio URL (.mp3/.wav) from the Network tab to load audio.
        </div>
      )}
      {loadError === 'cors' && (
        <div className="bg-amber-950/50 border border-amber-700/50 rounded-md px-3 py-2 text-xs text-amber-300">
          <span className="font-semibold">CORS blocked.</span> The CF Studio S3 bucket doesn't allow external origins yet — this is a one-line DevOps fix. Once it's live, this URL will load instantly.
        </div>
      )}
      {loadError === 'generic' && (
        <div className="bg-red-950/50 border border-red-700/50 rounded-md px-3 py-2 text-xs text-red-300">
          Couldn't load track — check the URL is a direct audio file (.mp3, .wav).
        </div>
      )}

      {/* Track Name + Artist + BPM + Key */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-slate-300 text-sm truncate">{trackName}</p>
          {artistName && <p className="text-purple-300/70 text-xs truncate">{artistName}</p>}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          {isAnalyzing && (
            <span className="text-xs text-slate-500 font-mono">analyzing…</span>
          )}
          {!isAnalyzing && bpm && (
            <span className="text-xs text-purple-400 font-mono">{bpm} BPM</span>
          )}
          {!isAnalyzing && camelotKey && (
            <span className="text-xs text-emerald-400 font-mono">{camelotKey}</span>
          )}
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={!isReady}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
            ${isReady
              ? 'bg-purple-600 hover:bg-purple-500 border border-purple-400 cursor-pointer'
              : 'bg-slate-600/50 border border-slate-500 cursor-not-allowed opacity-50'
            }`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        {/* Loop Toggle */}
        <button
          onClick={toggleLoop}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border
            ${isLooping
              ? 'bg-purple-600/50 border-purple-400 text-purple-300'
              : 'bg-slate-600/50 border-slate-500 text-slate-400'
            }`}
          aria-label={isLooping ? 'Loop On' : 'Loop Off'}
          title={isLooping ? 'Loop: On' : 'Loop: Off'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Volume Slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 w-8">VOL</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="flex-1 h-2 bg-slate-600 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-purple-500
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-purple-300
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-purple-500
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-purple-300"
          aria-label="Volume"
        />
        <span className="text-xs text-slate-400 w-8 text-right">{volume}%</span>
      </div>

      {/* EQ Section */}
      <div className="bg-slate-800/50 rounded-md p-3">
        <div className="text-xs text-slate-400 mb-2 text-center">EQ</div>
        <div className="grid grid-cols-3 gap-2">
          {/* Low EQ */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-500">LOW</span>
            <input
              type="range"
              min="-12"
              max="12"
              value={eqLow}
              onChange={(e) => setEqLow(Number(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500
                [&::-moz-range-thumb]:w-3
                [&::-moz-range-thumb]:h-3
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-blue-500"
              aria-label="Low EQ"
            />
            <span className="text-xs text-slate-500">{eqLow > 0 ? '+' : ''}{eqLow}</span>
          </div>

          {/* Mid EQ */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-500">MID</span>
            <input
              type="range"
              min="-12"
              max="12"
              value={eqMid}
              onChange={(e) => setEqMid(Number(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-green-500
                [&::-moz-range-thumb]:w-3
                [&::-moz-range-thumb]:h-3
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-green-500"
              aria-label="Mid EQ"
            />
            <span className="text-xs text-slate-500">{eqMid > 0 ? '+' : ''}{eqMid}</span>
          </div>

          {/* High EQ */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-500">HIGH</span>
            <input
              type="range"
              min="-12"
              max="12"
              value={eqHigh}
              onChange={(e) => setEqHigh(Number(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-yellow-500
                [&::-moz-range-thumb]:w-3
                [&::-moz-range-thumb]:h-3
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-yellow-500"
              aria-label="High EQ"
            />
            <span className="text-xs text-slate-500">{eqHigh > 0 ? '+' : ''}{eqHigh}</span>
          </div>
        </div>
      </div>

      {/* Load Buttons */}
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <span className="block text-center bg-slate-600 hover:bg-slate-500 text-white text-sm py-2 px-3 rounded-md transition-colors">
            Load File
          </span>
        </label>
        <button
          onClick={handleLoadDemo}
          disabled={!demoTrack}
          className={`flex-1 text-sm py-2 px-3 rounded-md transition-colors
            ${demoTrack
              ? 'bg-purple-600/50 hover:bg-purple-500/50 text-purple-200 border border-purple-500/50'
              : 'bg-slate-600/50 text-slate-500 cursor-not-allowed'
            }`}
        >
          Load Demo
        </button>
      </div>

      {/* Load from URL */}
      <form onSubmit={handleLoadUrl} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste audio URL (.mp3, .wav)…"
            className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-md px-3 py-2 pr-7 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          {/* Help icon */}
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="How to get CF Studio audio URL"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs text-slate-300 shadow-xl z-10">
              <p className="font-semibold text-white mb-1.5">How to get a CF Studio audio URL</p>
              <ol className="space-y-1 text-slate-400 list-decimal list-inside">
                <li>Open your track on <span className="text-purple-400">studio.creativefabrica.com</span></li>
                <li>Open DevTools → <span className="text-white">Network</span> tab <span className="text-slate-500">(F12)</span></li>
                <li>Press Play on the track</li>
                <li>Filter by <span className="text-white">.wav</span> or <span className="text-white">Media</span></li>
                <li>Right-click the request → <span className="text-white">Copy URL</span></li>
                <li>Paste it here</li>
              </ol>
              <p className="mt-2 text-slate-500 italic">Full auto-load coming soon via browser extension.</p>
              {/* Tooltip arrow */}
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-600" />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!urlInput.trim()}
          className="text-xs px-3 py-2 rounded-md bg-slate-600 hover:bg-slate-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Load
        </button>
      </form>
    </div>
  )
}

export default DeckPanel
