// Text-to-Speech Type Definitions

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading'

// TTS Engine type - Edge TTS or Browser TTS
export type TTSEngine = 'edge' | 'browser'

// Word timing for highlighting
export interface WordTiming {
  text: string
  start: number  // Start time in seconds
  end: number    // End time in seconds
}

// Audio chunk for chunked playback
export interface AudioChunk {
  id: string
  text: string
  audioBase64: string
  timing: WordTiming[]
  duration: number
  audioUrl?: string  // Blob URL after conversion
}

export interface TTSVoice {
  id: string
  name: string
  lang: string // 'zh-TW', 'zh-CN', 'en-US', 'en-GB', etc.
  nativeLang: 'zh' | 'en' | 'other'
  quality: 'standard' | 'enhanced' | 'neural'
  isDefault: boolean
  originalVoice?: SpeechSynthesisVoice // Reference to original voice object
}

export interface TTSSettings {
  voiceId: string
  // Per-language voice preferences (for persistence)
  voiceIdTraditional: string  // Preferred voice for Traditional Chinese
  voiceIdSimplified: string   // Preferred voice for Simplified Chinese
  voiceIdEnglish: string      // Preferred voice for English
  rate: number // 0.5 - 2.0
  pitch: number // 0.5 - 2.0
  volume: number // 0.0 - 1.0
  autoContinue: boolean // Auto-continue to next message
  expandBibleReferences: boolean // Expand Bible references to full spoken form
  normalizePolyphonicChars: boolean // Handle polyphonic characters for correct pronunciation
  removeStructuralMarkers: boolean // Remove outline markers and structural elements
  // Naturalness settings
  naturalPauses: boolean      // Add natural pauses at punctuation
  pauseMultiplier: number     // Pause duration multiplier (0.5 - 2.0)
  emphasizeCapitalized: boolean // Add emphasis to ALL CAPS words
  // Quality preference
  preferNeuralVoices: boolean // Prefer neural voices when available
  // Edge TTS settings
  engine: TTSEngine           // 'edge' or 'browser'
  edgeVoiceGender: 'female' | 'male' // Gender preference for Edge TTS voices
  edgeVoiceId?: string        // Specific Edge TTS voice ID (takes precedence over gender)
}

export interface TTSSpeechPosition {
  messageIndex: number
  paragraphIndex: number
  charIndex: number
  charLength: number
}

export interface TTSState {
  status: TTSStatus
  position: TTSSpeechPosition | null
  settings: TTSSettings
  availableVoices: TTSVoice[]
}

// Default settings
export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  voiceId: '',
  voiceIdTraditional: '',
  voiceIdSimplified: '',
  voiceIdEnglish: '',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoContinue: true,
  expandBibleReferences: true,
  normalizePolyphonicChars: true,
  removeStructuralMarkers: true,
  naturalPauses: true,
  pauseMultiplier: 1.0,
  emphasizeCapitalized: true,
  preferNeuralVoices: true,
  // Edge TTS settings - default to Edge TTS with female voice
  engine: 'edge',
  edgeVoiceGender: 'female',
  edgeVoiceId: undefined, // Will be auto-selected based on language and gender
}

// Rate presets
export const RATE_PRESETS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1.0x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 1.75, label: '1.75x' },
  { value: 2.0, label: '2.0x' },
]

// Language to voice language mapping
export const LANGUAGE_TO_VOICE_LANG: Record<string, string[]> = {
  traditional: ['zh-TW', 'zh-HK', 'zh-Hant'],
  simplified: ['zh-CN', 'zh-Hans'],
  english: ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN'],
}

// Neural voice name patterns - these voices have the highest quality
export const NEURAL_VOICE_PATTERNS = [
  /Natural/i,
  /Neural/i,
  /Online\s*\(Natural\)/i,
  /Enhanced/i,
]

// Check if a voice name indicates neural/high-quality synthesis
export function isNeuralVoice(voiceName: string): boolean {
  return NEURAL_VOICE_PATTERNS.some(pattern => pattern.test(voiceName))
}

// Recommended voice names for each language (partial match)
// Ordered by preference - Google voices prioritized for best compatibility
export const RECOMMENDED_VOICES: Record<string, string[]> = {
  'zh-TW': [
    // Google Cantonese voice (best for Traditional Chinese)
    'Google 粤语',
    'Google Cantonese',
    // Other Google voices
    'Google 臺灣華語',
    // Neural voices (good quality but may not work at high speeds)
    'Microsoft HsiaoChen Online (Natural)',
    'Microsoft YunJhe Online (Natural)',
    // Standard voices
    'Microsoft HsiaoChen',
    'Ting-Ting',
  ],
  'zh-CN': [
    // Google Mandarin voice (best for Simplified Chinese)
    'Google 普通话',
    'Google Mandarin',
    // Neural voices
    'Microsoft Xiaoxiao Online (Natural)',
    'Microsoft Yunxi Online (Natural)',
    // Standard voices
    'Microsoft Xiaoxiao',
    'Sin-Ji',
  ],
  'en-US': [
    // Google US English (preferred)
    'Google US English',
    // Neural voices
    'Microsoft Jenny Online (Natural)',
    'Microsoft Guy Online (Natural)',
    // Standard voices
    'Microsoft Jenny',
    'Samantha',
    'Alex',
  ],
  'en-GB': [
    // Google UK English
    'Google UK English',
    // Neural voices
    'Microsoft Mia Online (Natural)',
    'Microsoft Ryan Online (Natural)',
    // Standard voices
    'Microsoft Mia',
    'Daniel',
  ],
}