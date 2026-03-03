// Text-to-Speech Storage Utilities

import type { TTSSettings, TTSVoice, TTSSpeechPosition } from './tts-types'
import { DEFAULT_TTS_SETTINGS } from './tts-types'
import type { Language } from './reading-data'
import { LANGUAGE_TO_VOICE_LANG, RECOMMENDED_VOICES } from './tts-types'

const TTS_SETTINGS_KEY = 'life-study:tts-settings'
const TTS_POSITION_KEY = 'life-study:tts-position'

// Load TTS settings from localStorage
export function loadTTSSettings(): TTSSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_TTS_SETTINGS }
  }

  try {
    const saved = localStorage.getItem(TTS_SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...DEFAULT_TTS_SETTINGS,
        ...parsed,
      }
    }
  } catch (error) {
    console.warn('Failed to load TTS settings:', error)
  }

  return { ...DEFAULT_TTS_SETTINGS }
}

// Save TTS settings to localStorage
export function saveTTSSettings(settings: TTSSettings): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.warn('Failed to save TTS settings:', error)
  }
}

// Load TTS position from sessionStorage (for resume functionality)
export function loadTTSPosition(): TTSSpeechPosition | null {
  if (typeof window === 'undefined') return null

  try {
    const saved = sessionStorage.getItem(TTS_POSITION_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.warn('Failed to load TTS position:', error)
  }

  return null
}

// Save TTS position to sessionStorage
export function saveTTSPosition(position: TTSSpeechPosition | null): void {
  if (typeof window === 'undefined') return

  try {
    if (position) {
      sessionStorage.setItem(TTS_POSITION_KEY, JSON.stringify(position))
    } else {
      sessionStorage.removeItem(TTS_POSITION_KEY)
    }
  } catch (error) {
    console.warn('Failed to save TTS position:', error)
  }
}

// Clear TTS position
export function clearTTSPosition(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(TTS_POSITION_KEY)
}

// Map SpeechSynthesisVoice to TTSVoice
export function mapVoiceToTTSVoice(voice: SpeechSynthesisVoice): TTSVoice {
  const lang = voice.lang
  let nativeLang: 'zh' | 'en' | 'other' = 'other'
  let quality: 'standard' | 'enhanced' | 'neural' = 'standard'

  // Determine native language
  if (lang.startsWith('zh')) {
    nativeLang = 'zh'
  } else if (lang.startsWith('en')) {
    nativeLang = 'en'
  }

  // Determine quality based on voice name
  const name = voice.name.toLowerCase()
  if (name.includes('neural') || name.includes('natural') || name.includes('premium')) {
    quality = 'neural'
  } else if (name.includes('enhanced') || name.includes('online')) {
    quality = 'enhanced'
  }

  // Check if it's a recommended voice
  const recommendedForLang = RECOMMENDED_VOICES[lang] || []
  const isRecommended = recommendedForLang.some(
    recName => voice.name.includes(recName) || recName.includes(voice.name)
  )

  return {
    id: voice.voiceURI || voice.name,
    name: voice.name,
    lang: voice.lang,
    nativeLang,
    quality,
    isDefault: voice.default || isRecommended,
    originalVoice: voice,
  }
}

// Get available voices filtered by language
export function getVoicesForLanguage(voices: TTSVoice[], language: Language): TTSVoice[] {
  const targetLangs = LANGUAGE_TO_VOICE_LANG[language] || []
  
  // First, try to find voices that match the language codes
  const matchingVoices = voices.filter(voice => 
    targetLangs.some(lang => 
      voice.lang.startsWith(lang) || lang.startsWith(voice.lang.split('-')[0])
    )
  )

  if (matchingVoices.length > 0) {
    return matchingVoices
  }

  // Fallback: filter by native language
  const nativeLang = language === 'english' ? 'en' : 'zh'
  return voices.filter(voice => voice.nativeLang === nativeLang)
}

// Select the best voice for a language
export function selectBestVoice(voices: TTSVoice[], language: Language): TTSVoice | null {
  const filteredVoices = getVoicesForLanguage(voices, language)
  
  if (filteredVoices.length === 0) {
    return null
  }

  // Prefer voices in this order: neural > enhanced > standard
  // Among same quality, prefer default or recommended voices
  const sortedVoices = [...filteredVoices].sort((a, b) => {
    // Quality priority
    const qualityOrder = { neural: 3, enhanced: 2, standard: 1 }
    const qualityDiff = qualityOrder[b.quality] - qualityOrder[a.quality]
    if (qualityDiff !== 0) return qualityDiff

    // Default voice priority
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1

    // Alphabetical by name
    return a.name.localeCompare(b.name)
  })

  return sortedVoices[0]
}

// Check if TTS is supported
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Get speech synthesis instance
export function getSpeechSynthesis(): SpeechSynthesis | null {
  if (!isTTSSupported()) return null
  return window.speechSynthesis
}