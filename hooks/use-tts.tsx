"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { Language } from "@/lib/reading-data"
import type { TTSStatus, TTSVoice, TTSSettings, TTSSpeechPosition } from "@/lib/tts-types"
import { DEFAULT_TTS_SETTINGS } from "@/lib/tts-types"
import {
  loadTTSSettings,
  loadTTSPosition,
  saveTTSPosition,
  clearTTSPosition,
  mapVoiceToTTSVoice,
  selectBestVoice,
  isTTSSupported,
  getSpeechSynthesis,
  getEffectiveRate,
  isServerSideVoice,
  MAX_RATE_FOR_SERVER_VOICES,
  getSavedVoiceIdForLanguage,
  isQualityVoice,
  deduplicateVoices,
} from "@/lib/tts-storage"
import { preprocessTextForTTS } from "@/lib/tts-preprocessor"
import syncService from "@/lib/sync-service"

// Default pitch for more natural voice (slightly lower pitch sounds more natural)
const DEFAULT_PITCH = 0.95

// Pause between paragraphs for more natural reading (milliseconds)
const PAUSE_BETWEEN_PARAGRAPHS_MS = 400

interface TTSContextValue {
  // State
  status: TTSStatus
  position: TTSSpeechPosition | null
  settings: TTSSettings
  availableVoices: TTSVoice[]
  currentVoice: TTSVoice | null
  isSupported: boolean

  // Actions
  play: () => void
  pause: () => void
  stop: () => void
  nextParagraph: () => void
  prevParagraph: () => void
  setRate: (rate: number) => void
  setVoice: (voiceId: string) => void
  setAutoContinue: (enabled: boolean) => void
  setExpandBibleReferences: (enabled: boolean) => void
  setNormalizePolyphonicChars: (enabled: boolean) => void
  setRemoveStructuralMarkers: (enabled: boolean) => void
  speakParagraph: (paragraphIndex: number) => void
  speakFromPosition: (messageIndex: number, paragraphIndex: number, charIndex?: number) => void
}

const TTSContext = createContext<TTSContextValue | null>(null)

interface TTSProviderProps {
  children: React.ReactNode
  // These are provided dynamically via the hook
  language: Language
  paragraphs: string[]
  messageIndex: number
  totalMessages: number
  onMessageChange?: (index: number) => void
  onPositionChange?: (position: TTSSpeechPosition | null) => void
}

export function TTSProvider({
  children,
  language,
  paragraphs,
  messageIndex,
  totalMessages,
  onMessageChange,
  onPositionChange,
}: TTSProviderProps) {
  const [status, setStatus] = useState<TTSStatus>('idle')
  const [position, setPosition] = useState<TTSSpeechPosition | null>(null)
  const [settings, setSettings] = useState<TTSSettings>(DEFAULT_TTS_SETTINGS)
  const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([])
  const [isSupported, setIsSupported] = useState(false)

  // Refs for speech synthesis
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const currentParagraphRef = useRef<number>(0)
  const isSpeakingRef = useRef(false)
  const paragraphsRef = useRef<string[]>(paragraphs)
  
  // Track if we're currently speaking and should continue after voice/settings change
  const wasPlayingRef = useRef(false)
  const pausedPositionRef = useRef<TTSSpeechPosition | null>(null)
  
  // Track the current voice being used (to detect changes)
  const currentVoiceIdRef = useRef<string>('')
  
  // Track live position from onboundary events to avoid stale closure issues
  const livePositionRef = useRef<TTSSpeechPosition | null>(null)
  
  // Sync position state with livePositionRef (must be after ref declaration)
  useEffect(() => {
    livePositionRef.current = position
  }, [position])

  // Update paragraphs ref when they change
  useEffect(() => {
    paragraphsRef.current = paragraphs
  }, [paragraphs])

  // Load voices and settings on mount
  useEffect(() => {
    setIsSupported(isTTSSupported())
    
    if (!isTTSSupported()) return

    const synth = getSpeechSynthesis()
    if (!synth) return
    synthRef.current = synth

    // Load settings
    const savedSettings = loadTTSSettings()
    setSettings(savedSettings)

    // Load voices
    const loadVoices = () => {
      const voices = synth.getVoices()
      const mappedVoices = voices
        .map(mapVoiceToTTSVoice)
        .filter(voice => isQualityVoice(voice.name, voice.lang))
      const dedupedVoices = deduplicateVoices(mappedVoices)
      setAvailableVoices(dedupedVoices)
    }

    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices)
      synth.cancel()
    }
  }, [])

  // Track if we've initialized voice selection for this session
  const voiceInitializedRef = useRef(false)

  // Auto-select best voice when language or voices change
  useEffect(() => {
    if (availableVoices.length === 0) return

    // Get the saved voice ID for this language
    const savedVoiceId = getSavedVoiceIdForLanguage(settings, language)
    
    // First, check if we have a saved voice for this language
    if (savedVoiceId) {
      const savedVoice = availableVoices.find(v => v.id === savedVoiceId)
      if (savedVoice) {
        // Found saved voice - use it and mark as initialized
        if (settings.voiceId !== savedVoiceId) {
          setSettings(prev => {
            const newSettings = { ...prev, voiceId: savedVoiceId }
            syncService.saveTTSSettings(newSettings)
            currentVoiceIdRef.current = savedVoiceId
            return newSettings
          })
        }
        voiceInitializedRef.current = true
        return
      }
    }
    
    // No saved voice for this language, or saved voice not found
    // Only auto-select if we haven't initialized yet
    if (!voiceInitializedRef.current) {
    const bestVoice = selectBestVoice(availableVoices, language)
    if (bestVoice) {
      setSettings(prev => {
        const newSettings = { ...prev, voiceId: bestVoice.id }
        syncService.saveTTSSettings(newSettings)
        currentVoiceIdRef.current = bestVoice.id
        return newSettings
      })
      voiceInitializedRef.current = true
    }
  }
  }, [language, availableVoices, settings])

  // Get current voice object
  const currentVoice = useMemo(() => {
    if (!settings.voiceId || availableVoices.length === 0) return null
    return availableVoices.find(v => v.id === settings.voiceId) || null
  }, [settings.voiceId, availableVoices])

  // Cancel speech and clean up
  const cancelSpeech = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    utteranceRef.current = null
    isSpeakingRef.current = false
  }, [])

  // Speak a specific paragraph
  const speakParagraphInternal = useCallback((
    paragraphIdx: number,
    startChar: number = 0,
    continuePlaying: boolean = true
  ) => {
    const synth = synthRef.current
    const voiceToUse = currentVoice
    if (!synth || !voiceToUse?.originalVoice) return

    const currentParagraphs = paragraphsRef.current
    if (paragraphIdx < 0 || paragraphIdx >= currentParagraphs.length) {
      // End of message
      if (settings.autoContinue && messageIndex < totalMessages - 1) {
        // Move to next message
        const nextIndex = messageIndex + 1
        onMessageChange?.(nextIndex)
        // Reset position for new message
        setPosition({
          messageIndex: nextIndex,
          paragraphIndex: 0,
          charIndex: 0,
          charLength: 0,
        })
      } else {
        // Stop speaking
        setStatus('idle')
        setPosition(null)
        clearTTSPosition()
        isSpeakingRef.current = false
      }
      return
    }

    const rawText = currentParagraphs[paragraphIdx]
    if (!rawText || rawText.trim().length === 0) {
      // Skip empty paragraphs
      speakParagraphInternal(paragraphIdx + 1, 0, continuePlaying)
      return
    }

    // Preprocess text for TTS with naturalness options
    const fullText = preprocessTextForTTS(rawText, {
      expandBibleReferences: settings.expandBibleReferences,
      handlePolyphonicCharacters: settings.normalizePolyphonicChars,
      removeStructuralMarkers: settings.removeStructuralMarkers,
      naturalPauses: settings.naturalPauses,
      pauseMultiplier: settings.pauseMultiplier,
      emphasizeCapitalized: settings.emphasizeCapitalized,
    })

    // Cancel any existing speech
    if (utteranceRef.current) {
      synth.cancel()
    }

    // For resume: if startChar > 0, we need to speak from that position
    // Web Speech API doesn't support starting mid-text, so we speak from startChar
    // but we need to find a good word boundary to start from
    let textToSpeak = fullText
    let actualStartChar = 0
    
    if (startChar > 0 && startChar < fullText.length) {
      // Find the start of the word containing or following startChar
      // to avoid cutting words in the middle
      let wordStart = startChar
      
      // If we're in the middle of a word, find the beginning of that word
      while (wordStart > 0 && !/\s/.test(fullText[wordStart - 1])) {
        wordStart--
      }
      
      // If we found a valid word start, use it
      if (wordStart >= 0 && wordStart < fullText.length) {
        actualStartChar = wordStart
        textToSpeak = fullText.substring(actualStartChar)
      }
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.voice = voiceToUse.originalVoice
    // Apply effective rate (capped for server-side voices to prevent garbled output)
    const effectiveRate = getEffectiveRate(settings.rate, voiceToUse)
    utterance.rate = effectiveRate
    // Log rate adjustment for debugging
    if (effectiveRate !== settings.rate) {
      console.log(`[TTS] Rate capped from ${settings.rate}x to ${effectiveRate}x for server-side voice: ${voiceToUse.name}`)
    }
    // Use slightly lower pitch for more natural voice (unless user has customized)
    utterance.pitch = settings.pitch === DEFAULT_TTS_SETTINGS.pitch ? DEFAULT_PITCH : settings.pitch
    utterance.volume = settings.volume
    utterance.lang = voiceToUse.lang

    // Track position
    currentParagraphRef.current = paragraphIdx
    isSpeakingRef.current = true

    // Update state - adjust charIndex to account for the substring
    const newPosition: TTSSpeechPosition = {
      messageIndex,
      paragraphIndex: paragraphIdx,
      charIndex: actualStartChar,
      charLength: fullText.length - actualStartChar,
    }
    setPosition(newPosition)
    if (continuePlaying) {
      setStatus('playing')
    }

    // Handle word boundary events for highlighting
    // The charIndex from the event is relative to textToSpeak, so we need to adjust
    utterance.onboundary = (event) => {
      if (event.name === 'word' && isSpeakingRef.current) {
        const adjustedCharIndex = (event.charIndex || 0) + actualStartChar
        const updatedPosition = {
          messageIndex,
          paragraphIndex: paragraphIdx,
          charIndex: adjustedCharIndex,
          charLength: event.charLength || 1,
        }
        // Update both state and ref - ref is always fresh for pause/resume
        livePositionRef.current = updatedPosition
        setPosition(prev => {
          if (!prev || prev.paragraphIndex !== paragraphIdx) return prev
          return updatedPosition
        })
      }
    }

    // Handle paragraph end
    utterance.onend = () => {
      if (!isSpeakingRef.current || !continuePlaying) return
      
      // Add a small pause before next paragraph for natural reading
      setTimeout(() => {
        if (isSpeakingRef.current && continuePlaying) {
          speakParagraphInternal(paragraphIdx + 1, 0, continuePlaying)
        }
      }, PAUSE_BETWEEN_PARAGRAPHS_MS)
    }

    // Handle errors
    utterance.onerror = (event) => {
      console.error('TTS error:', event.error)
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        setStatus('idle')
        setPosition(null)
        isSpeakingRef.current = false
      }
    }

    // Start speaking
    utteranceRef.current = utterance
    
    // iOS Safari has a known bug where speak() must be called with a delay
    // after setting up the utterance, otherwise it produces garbled audio
    // This is a well-documented iOS Web Speech API issue
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
    
    if (isIOSDevice) {
      // Delay needed for iOS to properly initialize the speech synthesis
      setTimeout(() => {
        synth.speak(utterance)
      }, 100)
    } else {
      synth.speak(utterance)
    }
  }, [currentVoice, settings, messageIndex, totalMessages, onMessageChange])

  // Effect to continue playing after voice change
  useEffect(() => {
    console.log('[TTS DEBUG] Voice change effect triggered', {
      wasPlayingRef: wasPlayingRef.current,
      pausedPositionRef: pausedPositionRef.current,
      currentVoice: currentVoice?.id,
    })
    if (wasPlayingRef.current && pausedPositionRef.current && currentVoice) {
      wasPlayingRef.current = false
      const savedPos = pausedPositionRef.current
      pausedPositionRef.current = null
      
      console.log('[TTS DEBUG] Voice change effect - restarting speech at position:', savedPos)
      // Small delay to ensure voice is ready
      setTimeout(() => {
        speakParagraphInternal(savedPos.paragraphIndex, savedPos.charIndex, true)
      }, 50)
    }
  }, [currentVoice, speakParagraphInternal])

  // Play from current position or beginning
  const play = useCallback(() => {
    console.log('[TTS DEBUG] play() called', {
      status,
      position,
      pausedPositionRef: pausedPositionRef.current,
    })
    if (status === 'paused' && pausedPositionRef.current) {
      // Resume from paused position - start speaking from where we paused
      const savedPos = pausedPositionRef.current
      pausedPositionRef.current = null
      console.log('[TTS DEBUG] play() - resuming from pausedPositionRef:', savedPos)
      speakParagraphInternal(savedPos.paragraphIndex, savedPos.charIndex, true)
    } else if (position) {
      // Play from current position
      console.log('[TTS DEBUG] play() - playing from position state:', position)
      speakParagraphInternal(position.paragraphIndex, position.charIndex, true)
    } else {
      // Check for saved position
      const savedPosition = loadTTSPosition()
      console.log('[TTS DEBUG] play() - checking saved position from storage:', savedPosition)
      if (savedPosition && savedPosition.messageIndex === messageIndex) {
        speakParagraphInternal(savedPosition.paragraphIndex, savedPosition.charIndex, true)
      } else {
        // Start from beginning
        console.log('[TTS DEBUG] play() - starting from beginning')
        speakParagraphInternal(0, 0, true)
      }
    }
  }, [status, position, messageIndex, speakParagraphInternal])

  // Pause speech
  const pause = useCallback(() => {
    // Use livePositionRef to get the most up-to-date position
    const currentLivePosition = livePositionRef.current
    console.log('[TTS DEBUG] pause() called', {
      status,
      positionFromState: position,
      livePositionFromRef: currentLivePosition,
      pausedPositionRefCurrent: pausedPositionRef.current,
    })
    if (status === 'playing' && currentLivePosition) {
      // Cancel current speech and save position
      cancelSpeech()
      
      // Save current position for resume using live position (not stale state)
      pausedPositionRef.current = currentLivePosition
      saveTTSPosition(currentLivePosition)
      console.log('[TTS DEBUG] pause() - saved position from live ref:', currentLivePosition)
      setStatus('paused')
    }
  }, [status, position, cancelSpeech])

  // Stop speech
  const stop = useCallback(() => {
    cancelSpeech()
    setStatus('idle')
    setPosition(null)
    pausedPositionRef.current = null
    clearTTSPosition()
  }, [cancelSpeech])

  // Next paragraph
  const nextParagraph = useCallback(() => {
    const currentIdx = position?.paragraphIndex ?? -1
    const nextIdx = currentIdx + 1
    const currentParagraphs = paragraphsRef.current
    
    if (nextIdx < currentParagraphs.length) {
      cancelSpeech()
      speakParagraphInternal(nextIdx, 0, status === 'playing')
    } else if (settings.autoContinue && messageIndex < totalMessages - 1) {
      cancelSpeech()
      onMessageChange?.(messageIndex + 1)
    }
  }, [position, settings.autoContinue, messageIndex, totalMessages, cancelSpeech, speakParagraphInternal, onMessageChange, status])

  // Previous paragraph
  const prevParagraph = useCallback(() => {
    const currentIdx = position?.paragraphIndex ?? 0
    const prevIdx = Math.max(0, currentIdx - 1)
    
    cancelSpeech()
    speakParagraphInternal(prevIdx, 0, status === 'playing')
  }, [position, cancelSpeech, speakParagraphInternal, status])

  // Set playback rate
  const setRate = useCallback((rate: number) => {
    const wasPlaying = status === 'playing'
    // Use livePositionRef for most up-to-date position
    const savedPosition = livePositionRef.current ? { ...livePositionRef.current } : null
    
    // Cancel speech FIRST before state changes
    if (wasPlaying) {
      cancelSpeech()
    }
    
    setSettings(prev => {
      const newSettings = { ...prev, rate: Math.max(0.5, Math.min(2.0, rate)) }
      syncService.saveTTSSettings(newSettings)
      return newSettings
    })
    
    // If playing, restart from current position with new rate
    if (wasPlaying && savedPosition) {
      setTimeout(() => {
        speakParagraphInternal(savedPosition.paragraphIndex, savedPosition.charIndex, true)
      }, 50)
    }
  }, [status, cancelSpeech, speakParagraphInternal])

  // Set voice - immediately switch if currently playing
  const setVoice = useCallback((voiceId: string) => {
    const wasPlaying = status === 'playing'
    // Use livePositionRef for most up-to-date position
    const savedPosition = livePositionRef.current ? { ...livePositionRef.current } : null
    
    console.log('[TTS DEBUG] setVoice() called', {
      voiceId,
      wasPlaying,
      savedPosition,
      currentVoiceId: currentVoiceIdRef.current,
    })
    
    // Cancel speech FIRST before any state changes
    if (wasPlaying) {
      cancelSpeech()
    }
    
    setSettings(prev => {
      const newSettings = { ...prev, voiceId }
      syncService.saveTTSSettings(newSettings)
      currentVoiceIdRef.current = voiceId
      return newSettings
    })
    
    // If was playing, restart immediately with new voice
    if (wasPlaying && savedPosition) {
      console.log('[TTS DEBUG] setVoice() - restarting with new voice at position:', savedPosition)
      // Small delay to ensure settings update has propagated
      setTimeout(() => {
        speakParagraphInternal(savedPosition.paragraphIndex, savedPosition.charIndex, true)
      }, 50)
    }
  }, [status, cancelSpeech, speakParagraphInternal])

  // Set auto-continue
  const setAutoContinue = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, autoContinue: enabled }
      syncService.saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  // Set expand Bible references
  const setExpandBibleReferences = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, expandBibleReferences: enabled }
      syncService.saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  // Set normalize polyphonic characters
  const setNormalizePolyphonicChars = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, normalizePolyphonicChars: enabled }
      syncService.saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  // Set remove structural markers
  const setRemoveStructuralMarkers = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, removeStructuralMarkers: enabled }
      syncService.saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  // Speak a specific paragraph
  const speakParagraph = useCallback((paragraphIndex: number) => {
    cancelSpeech()
    pausedPositionRef.current = null
    speakParagraphInternal(paragraphIndex, 0, true)
  }, [cancelSpeech, speakParagraphInternal])

  // Speak from a specific position
  const speakFromPosition = useCallback((msgIndex: number, paragraphIndex: number, charIndex: number = 0) => {
    if (msgIndex !== messageIndex) {
      // Need to change message first
      onMessageChange?.(msgIndex)
      // Position will be set when message changes
      setPosition({
        messageIndex: msgIndex,
        paragraphIndex,
        charIndex,
        charLength: 0,
      })
      pausedPositionRef.current = null
    } else {
      cancelSpeech()
      pausedPositionRef.current = null
      speakParagraphInternal(paragraphIndex, charIndex, true)
    }
  }, [messageIndex, cancelSpeech, speakParagraphInternal, onMessageChange])

  // Notify position changes
  useEffect(() => {
    onPositionChange?.(position)
  }, [position, onPositionChange])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelSpeech()
    }
  }, [cancelSpeech])

  const value: TTSContextValue = {
    status,
    position,
    settings,
    availableVoices,
    currentVoice,
    isSupported,
    play,
    pause,
    stop,
    nextParagraph,
    prevParagraph,
    setRate,
    setVoice,
    setAutoContinue,
    setExpandBibleReferences,
    setNormalizePolyphonicChars,
    setRemoveStructuralMarkers,
    speakParagraph,
    speakFromPosition,
  }

  return (
    <TTSContext.Provider value={value}>
      {children}
    </TTSContext.Provider>
  )
}

// Hook to use TTS context
export function useTTS() {
  const context = useContext(TTSContext)
  if (!context) {
    throw new Error('useTTS must be used within a TTSProvider')
  }
  return context
}

// Hook for components that just need to read TTS state (no provider required)
export function useTTSState() {
  const context = useContext(TTSContext)
  return context
}