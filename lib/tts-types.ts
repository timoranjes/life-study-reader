// Text-to-Speech Type Definitions

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading'

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
  rate: number // 0.5 - 2.0
  pitch: number // 0.5 - 2.0
  volume: number // 0.0 - 1.0
  autoContinue: boolean // Auto-continue to next message
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
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoContinue: true,
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

// Recommended voice names for each language (partial match)
export const RECOMMENDED_VOICES: Record<string, string[]> = {
  'zh-TW': ['Google 臺灣華語', 'Microsoft HsiaoChen', 'Ting-Ting'],
  'zh-CN': ['Google 普通话', 'Microsoft Xiaoxiao', 'Sin-Ji'],
  'en-US': ['Google US English', 'Microsoft Jenny', 'Samantha', 'Alex'],
  'en-GB': ['Google UK English', 'Microsoft Mia', 'Daniel'],
}