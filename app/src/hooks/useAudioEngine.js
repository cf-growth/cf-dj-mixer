import { useRef, useState, useCallback, useEffect } from 'react'

/**
 * Audio engine hook for DJ mixer DSP chain.
 * Creates shared AudioContext with per-deck chains: volume → EQ (low/mid/high) → crossfader → destination
 */
export function useAudioEngine() {
  const audioContextRef = useRef(null)
  const deckChainsRef = useRef({ A: null, B: null })
  const crossfaderGainsRef = useRef({ A: null, B: null })

  const [isAudioReady, setIsAudioReady] = useState(false)
  const [needsUserGesture, setNeedsUserGesture] = useState(false)
  const [crossfaderValue, setCrossfaderValue] = useState(0.5)

  // Initialize AudioContext (lazy, on first user interaction)
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          setIsAudioReady(true)
          setNeedsUserGesture(false)
        })
      }
      return audioContextRef.current
    }

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioContextRef.current = ctx

    // Safari requires user gesture
    if (ctx.state === 'suspended') {
      setNeedsUserGesture(true)
      ctx.resume().then(() => {
        setIsAudioReady(true)
        setNeedsUserGesture(false)
      })
    } else {
      setIsAudioReady(true)
    }

    // Create crossfader gain nodes
    crossfaderGainsRef.current.A = ctx.createGain()
    crossfaderGainsRef.current.B = ctx.createGain()
    crossfaderGainsRef.current.A.connect(ctx.destination)
    crossfaderGainsRef.current.B.connect(ctx.destination)

    // Apply initial crossfader values
    applyCrossfaderGains(0.5)

    return ctx
  }, [])

  // Crossfader math: cos curve for equal power
  const applyCrossfaderGains = useCallback((value) => {
    if (!crossfaderGainsRef.current.A || !crossfaderGainsRef.current.B) return

    // Deck A gain = cos(x * π/2), Deck B gain = cos((1-x) * π/2)
    const gainA = Math.cos(value * Math.PI / 2)
    const gainB = Math.cos((1 - value) * Math.PI / 2)

    crossfaderGainsRef.current.A.gain.setValueAtTime(gainA, audioContextRef.current.currentTime)
    crossfaderGainsRef.current.B.gain.setValueAtTime(gainB, audioContextRef.current.currentTime)
  }, [])

  // Update crossfader
  const setCrossfader = useCallback((value) => {
    setCrossfaderValue(value)
    applyCrossfaderGains(value)
  }, [applyCrossfaderGains])

  // Create DSP chain for a deck
  // Returns: { inputNode, volumeNode, eqLow, eqMid, eqHigh, outputNode }
  const createDeckChain = useCallback((deckId) => {
    const ctx = initAudioContext()
    if (!ctx) return null

    // Volume gain (default 0.8)
    const volumeNode = ctx.createGain()
    volumeNode.gain.value = 0.8

    // EQ chain: lowshelf → peaking → highshelf
    const eqLow = ctx.createBiquadFilter()
    eqLow.type = 'lowshelf'
    eqLow.frequency.value = 200
    eqLow.gain.value = 0

    const eqMid = ctx.createBiquadFilter()
    eqMid.type = 'peaking'
    eqMid.frequency.value = 1000
    eqMid.Q.value = 1
    eqMid.gain.value = 0

    const eqHigh = ctx.createBiquadFilter()
    eqHigh.type = 'highshelf'
    eqHigh.frequency.value = 3000
    eqHigh.gain.value = 0

    // Connect chain: volume → low → mid → high → crossfader gain → destination
    volumeNode.connect(eqLow)
    eqLow.connect(eqMid)
    eqMid.connect(eqHigh)
    eqHigh.connect(crossfaderGainsRef.current[deckId])

    const chain = {
      volumeNode,
      eqLow,
      eqMid,
      eqHigh,
      outputNode: crossfaderGainsRef.current[deckId],
      // Methods to update values
      setVolume: (v) => volumeNode.gain.setValueAtTime(v, ctx.currentTime),
      setEqLow: (db) => eqLow.gain.setValueAtTime(db, ctx.currentTime),
      setEqMid: (db) => eqMid.gain.setValueAtTime(db, ctx.currentTime),
      setEqHigh: (db) => eqHigh.gain.setValueAtTime(db, ctx.currentTime),
    }

    deckChainsRef.current[deckId] = chain
    return chain
  }, [initAudioContext])

  // Get existing chain or create new one
  const getDeckChain = useCallback((deckId) => {
    if (deckChainsRef.current[deckId]) {
      return deckChainsRef.current[deckId]
    }
    return createDeckChain(deckId)
  }, [createDeckChain])

  // Resume audio context (for Safari user gesture requirement)
  const resumeAudio = useCallback(async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
      setIsAudioReady(true)
      setNeedsUserGesture(false)
    }
  }, [])

  // Get raw AudioContext for WaveSurfer integration
  const getAudioContext = useCallback(() => {
    return initAudioContext()
  }, [initAudioContext])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    isAudioReady,
    needsUserGesture,
    resumeAudio,
    getAudioContext,
    getDeckChain,
    crossfaderValue,
    setCrossfader,
  }
}
