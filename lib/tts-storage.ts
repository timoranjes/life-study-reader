// Text-to-Speech Storage Utilities

import type { TTSSettings, TTSVoice, TTSSpeechPosition } from './tts-types'
import { DEFAULT_TTS_SETTINGS, isNeuralVoice } from './tts-types'
import type { Language } from './reading-data'
import { LANGUAGE_TO_VOICE_LANG, RECOMMENDED_VOICES } from './tts-types'

// Maximum recommended rate for server-side voices (Google voices)
// These voices produce garbled output at rates above ~1.5x
export const MAX_RATE_FOR_SERVER_VOICES = 1.5

// Voice name patterns that indicate server-side synthesis (prone to garbling at high speeds)
const SERVER_VOICE_PATTERNS = [
  /^Google/i,           // Google US English, Google UK English, etc.
  /^Microsoft.*Online/i, // Microsoft online voices
  /^Apple.*Online/i,    // Apple online voices
]

/**
 * High-quality English voice names to allow (whitelist)
 * Only these voices will be shown for English content
 */
const ALLOWED_ENGLISH_VOICES = [
  // US English
  'Samantha', 'Tessa',
  // UK English
  'Daniel', 'Karen',
  // Irish English
  'Moira',
  // Indian English
  'Rishi',
  // Australian English
  'Karen', // Also available in Australian
]

/**
 * High-quality Chinese voice names to allow (whitelist)
 * Only these voices will be shown for Chinese content
 */
const ALLOWED_CHINESE_VOICES = [
  // Traditional Chinese (Taiwan)
  'Meijia', 'Ting-Ting', 'Tingting',
  // Simplified Chinese (Mainland)
  'Ting-Ting', 'Tingting', 'Sin-Ji', 'Sinji',
  // Cantonese (Hong Kong)
  'Sin-Ji', 'Sinji',
]

/**
 * Check if a voice should be shown based on language and quality
 * Uses a whitelist approach for better control
 * @param voiceName - The name of the voice to check
 * @param voiceLang - The language code of the voice
 * @returns True if the voice should be shown
 */
export function isQualityVoice(voiceName: string, voiceLang: string): boolean {
  const name = voiceName.toLowerCase()
  const lang = voiceLang.toLowerCase()
  
  // For English voices, use strict whitelist
  if (lang.startsWith('en')) {
    return ALLOWED_ENGLISH_VOICES.some(allowed =>
      name.includes(allowed.toLowerCase())
    )
  }
  
  // For Chinese voices, use whitelist
  if (lang.startsWith('zh')) {
    return ALLOWED_CHINESE_VOICES.some(allowed =>
      name.includes(allowed.toLowerCase())
    )
  }
  
  // For other languages, allow all (no filtering)
  return true
}

/**
 * Deduplicate voices by name, keeping the first occurrence
 * @param voices - Array of TTSVoice to deduplicate
 * @returns Deduplicated array
 */
export function deduplicateVoices(voices: TTSVoice[]): TTSVoice[] {
  const seen = new Set<string>()
  return voices.filter(voice => {
    const key = voice.name.toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * Check if a voice uses server-side synthesis that may produce garbled output at high speeds
 * Server-side voices like Google voices stream audio and don't handle time-stretching well
 */
export function isServerSideVoice(voice: TTSVoice | null): boolean {
  if (!voice) return false
  return SERVER_VOICE_PATTERNS.some(pattern => pattern.test(voice.name))
}

/**
 * Get the effective rate for a voice, capping server-side voices to prevent garbled output
 * @param requestedRate - The user's requested playback rate
 * @param voice - The voice being used
 * @returns The effective rate to use (may be capped for server-side voices)
 */
export function getEffectiveRate(requestedRate: number, voice: TTSVoice | null): number {
  if (!voice) return requestedRate
  
  // For server-side voices, cap the rate to prevent garbled output
  if (isServerSideVoice(voice)) {
    return Math.min(requestedRate, MAX_RATE_FOR_SERVER_VOICES)
  }
  
  return requestedRate
}

const TTS_SETTINGS_KEY = 'life-study:tts-settings'
const TTS_POSITION_KEY = 'life-study:tts-position'

/**
 * Detect if the user is on an iOS device
 * iOS Safari has issues with the Web Speech API when using artificial pause markers
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check for iOS using userAgent
  const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || ''
  
  // iOS detection patterns
  const iosPattern = /iPad|iPhone|iPod/
  const isIOSDevice = iosPattern.test(userAgent)
  
  // Also check for iPad on iOS 13+ (reports as Macintosh)
  const isIPadOnIOS13Plus = /Macintosh/.test(userAgent) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1
  
  return isIOSDevice || isIPadOnIOS13Plus
}

// Load TTS settings from localStorage
export function loadTTSSettings(): TTSSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_TTS_SETTINGS }
  }

  try {
    const saved = localStorage.getItem(TTS_SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const settings = {
        ...DEFAULT_TTS_SETTINGS,
        ...parsed,
      }
      
      // For iOS devices, if the user hasn't explicitly set naturalPauses, disable it
      // This prevents garbled audio caused by ellipsis markers on iOS Web Speech API
      if (isIOS() && parsed.naturalPauses === undefined) {
        settings.naturalPauses = false
      }
      
      return settings
    }
  } catch (error) {
    console.warn('Failed to load TTS settings:', error)
  }

  // For new users on iOS, disable natural pauses by default
  if (isIOS()) {
    return {
      ...DEFAULT_TTS_SETTINGS,
      naturalPauses: false,
    }
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

  // Determine quality based on voice name using neural voice detection
  if (isNeuralVoice(voice.name)) {
    quality = 'neural'
  } else if (voice.name.toLowerCase().includes('enhanced') || voice.name.toLowerCase().includes('online')) {
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

// Get the voice ID key for a specific language
export function getVoiceIdKeyForLanguage(language: Language): keyof TTSSettings {
  switch (language) {
    case 'traditional':
      return 'voiceIdTraditional'
    case 'simplified':
      return 'voiceIdSimplified'
    case 'english':
      return 'voiceIdEnglish'
    default:
      return 'voiceIdTraditional'
  }
}

// Get saved voice ID for a specific language
export function getSavedVoiceIdForLanguage(settings: TTSSettings, language: Language): string {
  const key = getVoiceIdKeyForLanguage(language)
  const voiceId = settings[key]
  // Only return the language-specific voice ID if it's set
  // Don't fall back to voiceId - let auto-selection pick the right voice for the language
  if (typeof voiceId === 'string' && voiceId) {
    return voiceId
  }
  return '' // Return empty to trigger auto-selection for this language
}

// Select the best voice for a language, considering user preferences
export function selectBestVoice(
  voices: TTSVoice[],
  language: Language,
  settings?: TTSSettings
): TTSVoice | null {
  const filteredVoices = getVoicesForLanguage(voices, language)
  
  if (filteredVoices.length === 0) {
    return null
  }

  // If user has a saved preference for this language, try to use it
  if (settings) {
    const savedVoiceId = getSavedVoiceIdForLanguage(settings, language)
    if (savedVoiceId) {
      const savedVoice = filteredVoices.find(v => v.id === savedVoiceId)
      if (savedVoice) {
        return savedVoice
      }
      // Saved voice not found, fall through to auto-selection
    }
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