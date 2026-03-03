"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { Language } from "@/lib/reading-data"
import type { TTSStatus, TTSVoice, TTSSettings, TTSSpeechPosition } from "@/lib/tts-types"
import { DEFAULT_TTS_SETTINGS } from "@/lib/tts-types"
import {
  loadTTSSettings,
  saveTTSSettings,
  loadTTSPosition,
  saveTTSPosition,
  clearTTSPosition,
  mapVoiceToTTSVoice,
  selectBestVoice,
  isTTSSupported,
  getSpeechSynthesis,
} from "@/lib/tts-storage"

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
      const mappedVoices = voices.map(mapVoiceToTTSVoice)
      setAvailableVoices(mappedVoices)
    }

    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices)
      synth.cancel()
    }
  }, [])

  // Auto-select best voice when language or voices change
  useEffect(() => {
    if (availableVoices.length === 0) return

    const bestVoice = selectBestVoice(availableVoices, language)
    if (bestVoice && !settings.voiceId) {
      setSettings(prev => {
        if (!prev.voiceId) {
          const newSettings = { ...prev, voiceId: bestVoice.id }
          saveTTSSettings(newSettings)
          return newSettings
        }
        return prev
      })
    } else if (bestVoice && settings.voiceId) {
      // Check if current voice is valid for this language
      const currentVoice = availableVoices.find(v => v.id === settings.voiceId)
      if (currentVoice) {
        const isValidForLanguage = 
          (language === 'english' && currentVoice.nativeLang === 'en') ||
          (language !== 'english' && currentVoice.nativeLang === 'zh')
        
        if (!isValidForLanguage && bestVoice) {
          setSettings(prev => {
            const newSettings = { ...prev, voiceId: bestVoice.id }
            saveTTSSettings(newSettings)
            return newSettings
          })
        }
      }
    }
  }, [language, availableVoices, settings.voiceId])

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
    startChar: number = 0
  ) => {
    const synth = synthRef.current
    if (!synth || !currentVoice?.originalVoice) return

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
      }
      return
    }

    const text = currentParagraphs[paragraphIdx]
    if (!text || text.trim().length === 0) {
      // Skip empty paragraphs
      speakParagraphInternal(paragraphIdx + 1, 0)
      return
    }

    // Cancel any existing speech
    cancelSpeech()

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = currentVoice.originalVoice
    utterance.rate = settings.rate
    utterance.pitch = settings.pitch
    utterance.volume = settings.volume
    utterance.lang = currentVoice.lang

    // Track position
    currentParagraphRef.current = paragraphIdx
    isSpeakingRef.current = true

    // Update state
    const newPosition: TTSSpeechPosition = {
      messageIndex,
      paragraphIndex: paragraphIdx,
      charIndex: startChar,
      charLength: text.length - startChar,
    }
    setPosition(newPosition)
    setStatus('playing')

    // Handle word boundary events for highlighting
    utterance.onboundary = (event) => {
      if (event.name === 'word' && isSpeakingRef.current) {
        setPosition(prev => {
          if (!prev || prev.paragraphIndex !== paragraphIdx) return prev
          return {
            ...prev,
            charIndex: event.charIndex,
            charLength: event.charLength || 1,
          }
        })
      }
    }

    // Handle paragraph end
    utterance.onend = () => {
      if (!isSpeakingRef.current) return
      
      // Move to next paragraph
      speakParagraphInternal(paragraphIdx + 1, 0)
    }

    // Handle errors
    utterance.onerror = (event) => {
      console.error('TTS error:', event.error)
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        setStatus('idle')
        setPosition(null)
      }
    }

    // Start speaking
    utteranceRef.current = utterance
    synth.speak(utterance)
  }, [currentVoice, settings, messageIndex, totalMessages, cancelSpeech, onMessageChange])

  // Play from current position or beginning
  const play = useCallback(() => {
    if (status === 'paused' && position) {
      // Resume from paused position
      speakParagraphInternal(position.paragraphIndex, position.charIndex)
    } else if (position) {
      // Play from current position
      speakParagraphInternal(position.paragraphIndex, position.charIndex)
    } else {
      // Check for saved position
      const savedPosition = loadTTSPosition()
      if (savedPosition && savedPosition.messageIndex === messageIndex) {
        speakParagraphInternal(savedPosition.paragraphIndex, savedPosition.charIndex)
      } else {
        // Start from beginning
        speakParagraphInternal(0, 0)
      }
    }
  }, [status, position, messageIndex, speakParagraphInternal])

  // Pause speech
  const pause = useCallback(() => {
    if (synthRef.current && status === 'playing') {
      synthRef.current.pause()
      setStatus('paused')
      // Save position for resume
      if (position) {
        saveTTSPosition(position)
      }
    }
  }, [status, position])

  // Stop speech
  const stop = useCallback(() => {
    cancelSpeech()
    setStatus('idle')
    setPosition(null)
    clearTTSPosition()
  }, [cancelSpeech])

  // Next paragraph
  const nextParagraph = useCallback(() => {
    const currentIdx = position?.paragraphIndex ?? -1
    const nextIdx = currentIdx + 1
    const currentParagraphs = paragraphsRef.current
    
    if (nextIdx < currentParagraphs.length) {
      cancelSpeech()
      speakParagraphInternal(nextIdx, 0)
    } else if (settings.autoContinue && messageIndex < totalMessages - 1) {
      cancelSpeech()
      onMessageChange?.(messageIndex + 1)
    }
  }, [position, settings.autoContinue, messageIndex, totalMessages, cancelSpeech, speakParagraphInternal, onMessageChange])

  // Previous paragraph
  const prevParagraph = useCallback(() => {
    const currentIdx = position?.paragraphIndex ?? 0
    const prevIdx = Math.max(0, currentIdx - 1)
    
    cancelSpeech()
    speakParagraphInternal(prevIdx, 0)
  }, [position, cancelSpeech, speakParagraphInternal])

  // Set playback rate
  const setRate = useCallback((rate: number) => {
    setSettings(prev => {
      const newSettings = { ...prev, rate: Math.max(0.5, Math.min(2.0, rate)) }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  // Set voice
  const setVoice = useCallback((voiceId: string) => {
    setSettings(prev => {
      const newSettings = { ...prev, voiceId }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  // Set auto-continue
  const setAutoContinue = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, autoContinue: enabled }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  // Speak a specific paragraph
  const speakParagraph = useCallback((paragraphIndex: number) => {
    cancelSpeech()
    speakParagraphInternal(paragraphIndex, 0)
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
    } else {
      cancelSpeech()
      speakParagraphInternal(paragraphIndex, charIndex)
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