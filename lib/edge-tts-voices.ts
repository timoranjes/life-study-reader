// Edge TTS Voice Definitions
// Maps languages to high-quality neural voices from Microsoft Edge TTS

import type { Language } from './reading-data'

export interface EdgeTTSVoice {
  id: string           // Voice ID for Edge TTS API
  name: string         // Display name
  lang: string         // Language code (e.g., 'en-US', 'zh-CN')
  gender: 'female' | 'male'
  language: Language   // App language this voice is for
  region: string       // Region code (e.g., 'US', 'GB', 'CN', 'TW', 'HK')
  regionName: string   // Display name for region
  description?: string // Optional description
}

/**
 * Region definitions with display names
 */
export const REGION_LABELS: Record<string, { en: string; zh: string }> = {
  // English regions
  'US': { en: 'American', zh: '美式英语' },
  'GB': { en: 'British', zh: '英式英语' },
  'AU': { en: 'Australian', zh: '澳式英语' },
  'IN': { en: 'Indian', zh: '印度英语' },
  'CA': { en: 'Canadian', zh: '加拿大英语' },
  // Chinese regions
  'CN': { en: 'Mainland China', zh: '中国大陆' },
  'TW': { en: 'Taiwan', zh: '台湾' },
  'HK': { en: 'Hong Kong', zh: '香港' },
}

/**
 * Available Edge TTS neural voices organized by language and region
 * These are high-quality neural voices provided free by Microsoft
 */
export const EDGE_TTS_VOICES: EdgeTTSVoice[] = [
  // ==================== ENGLISH VOICES ====================
  
  // English (US) voices
  {
    id: 'en-US-AriaNeural',
    name: 'Aria',
    lang: 'en-US',
    gender: 'female',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Natural American English female voice',
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny',
    lang: 'en-US',
    gender: 'female',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Friendly American English female voice',
  },
  {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher',
    lang: 'en-US',
    gender: 'male',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Natural American English male voice',
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy',
    lang: 'en-US',
    gender: 'male',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Deep American English male voice',
  },
  {
    id: 'en-US-MichelleNeural',
    name: 'Michelle',
    lang: 'en-US',
    gender: 'female',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Warm American English female voice',
  },
  {
    id: 'en-US-EricNeural',
    name: 'Eric',
    lang: 'en-US',
    gender: 'male',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Professional American English male voice',
  },
  {
    id: 'en-US-AnaNeural',
    name: 'Ana',
    lang: 'en-US',
    gender: 'female',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Young American English female voice',
  },
  {
    id: 'en-US-BrandonNeural',
    name: 'Brandon',
    lang: 'en-US',
    gender: 'male',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Casual American English male voice',
  },
  {
    id: 'en-US-EmmaNeural',
    name: 'Emma',
    lang: 'en-US',
    gender: 'female',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Expressive American English female voice',
  },
  {
    id: 'en-US-BrianNeural',
    name: 'Brian',
    lang: 'en-US',
    gender: 'male',
    language: 'english',
    region: 'US',
    regionName: 'American English',
    description: 'Versatile American English male voice',
  },

  // English (UK) voices
  {
    id: 'en-GB-MiaNeural',
    name: 'Mia',
    lang: 'en-GB',
    gender: 'female',
    language: 'english',
    region: 'GB',
    regionName: 'British English',
    description: 'Natural British English female voice',
  },
  {
    id: 'en-GB-LibbyNeural',
    name: 'Libby',
    lang: 'en-GB',
    gender: 'female',
    language: 'english',
    region: 'GB',
    regionName: 'British English',
    description: 'Friendly British English female voice',
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia',
    lang: 'en-GB',
    gender: 'female',
    language: 'english',
    region: 'GB',
    regionName: 'British English',
    description: 'Professional British English female voice',
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan',
    lang: 'en-GB',
    gender: 'male',
    language: 'english',
    region: 'GB',
    regionName: 'British English',
    description: 'Natural British English male voice',
  },
  {
    id: 'en-GB-ThomasNeural',
    name: 'Thomas',
    lang: 'en-GB',
    gender: 'male',
    language: 'english',
    region: 'GB',
    regionName: 'British English',
    description: 'Casual British English male voice',
  },

  // English (Australian) voices
  {
    id: 'en-AU-NatashaNeural',
    name: 'Natasha',
    lang: 'en-AU',
    gender: 'female',
    language: 'english',
    region: 'AU',
    regionName: 'Australian English',
    description: 'Natural Australian English female voice',
  },
  {
    id: 'en-AU-WilliamNeural',
    name: 'William',
    lang: 'en-AU',
    gender: 'male',
    language: 'english',
    region: 'AU',
    regionName: 'Australian English',
    description: 'Natural Australian English male voice',
  },
  {
    id: 'en-AU-AnnetteNeural',
    name: 'Annette',
    lang: 'en-AU',
    gender: 'female',
    language: 'english',
    region: 'AU',
    regionName: 'Australian English',
    description: 'Warm Australian English female voice',
  },
  {
    id: 'en-AU-CarlyNeural',
    name: 'Carly',
    lang: 'en-AU',
    gender: 'female',
    language: 'english',
    region: 'AU',
    regionName: 'Australian English',
    description: 'Friendly Australian English female voice',
  },
  {
    id: 'en-AU-DarrenNeural',
    name: 'Darren',
    lang: 'en-AU',
    gender: 'male',
    language: 'english',
    region: 'AU',
    regionName: 'Australian English',
    description: 'Casual Australian English male voice',
  },
  {
    id: 'en-AU-KenNeural',
    name: 'Ken',
    lang: 'en-AU',
    gender: 'male',
    language: 'english',
    region: 'AU',
    regionName: 'Australian English',
    description: 'Professional Australian English male voice',
  },

  // English (Indian) voices
  {
    id: 'en-IN-NeerjaNeural',
    name: 'Neerja',
    lang: 'en-IN',
    gender: 'female',
    language: 'english',
    region: 'IN',
    regionName: 'Indian English',
    description: 'Natural Indian English female voice',
  },
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Prabhat',
    lang: 'en-IN',
    gender: 'male',
    language: 'english',
    region: 'IN',
    regionName: 'Indian English',
    description: 'Natural Indian English male voice',
  },

  // English (Canadian) voices
  {
    id: 'en-CA-ClaraNeural',
    name: 'Clara',
    lang: 'en-CA',
    gender: 'female',
    language: 'english',
    region: 'CA',
    regionName: 'Canadian English',
    description: 'Natural Canadian English female voice',
  },
  {
    id: 'en-CA-LiamNeural',
    name: 'Liam',
    lang: 'en-CA',
    gender: 'male',
    language: 'english',
    region: 'CA',
    regionName: 'Canadian English',
    description: 'Natural Canadian English male voice',
  },

  // ==================== CHINESE VOICES ====================
  
  // Simplified Chinese (Mainland China) voices
  {
    id: 'zh-CN-XiaoxiaoNeural',
    name: '晓晓',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Natural Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-YunxiNeural',
    name: '云希',
    lang: 'zh-CN',
    gender: 'male',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Natural Mandarin Chinese male voice',
  },
  {
    id: 'zh-CN-XiaoyiNeural',
    name: '晓伊',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Sweet Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-YunjianNeural',
    name: '云健',
    lang: 'zh-CN',
    gender: 'male',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Professional Mandarin Chinese male voice',
  },
  {
    id: 'zh-CN-XiaochenNeural',
    name: '晓辰',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Broadcast Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-XiaohanNeural',
    name: '晓涵',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Warm Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-XiaomengNeural',
    name: '晓梦',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Cheerful Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-XiaomoNeural',
    name: '晓墨',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Expressive Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-XiaoruiNeural',
    name: '晓睿',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Child Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-XiaoshuangNeural',
    name: '晓双',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Youth Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-XiaoxuanNeural',
    name: '晓萱',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Gentle Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-XiaoyanNeural',
    name: '晓妍',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Storytelling Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-XiaoyouNeural',
    name: '晓悠',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Young Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-YunfengNeural',
    name: '云枫',
    lang: 'zh-CN',
    gender: 'male',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Mature Mandarin Chinese male voice',
  },
  {
    id: 'zh-CN-YunhaoNeural',
    name: '云皓',
    lang: 'zh-CN',
    gender: 'male',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Young Mandarin Chinese male voice',
  },
  {
    id: 'zh-CN-YunjiaNeural',
    name: '云夏',
    lang: 'zh-CN',
    gender: 'female',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'News Mandarin Chinese female voice',
  },
  {
    id: 'zh-CN-YunxiaNeural',
    name: '云夏',
    lang: 'zh-CN',
    gender: 'male',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Narration Mandarin Chinese male voice',
  },
  {
    id: 'zh-CN-YunxiangNeural',
    name: '云翔',
    lang: 'zh-CN',
    gender: 'male',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Versatile Mandarin Chinese male voice',
  },
  {
    id: 'zh-CN-YunyangNeural',
    name: '云扬',
    lang: 'zh-CN',
    gender: 'male',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Documentary Mandarin Chinese male voice',
  },
  {
    id: 'zh-CN-YunzeNeural',
    name: '云泽',
    lang: 'zh-CN',
    gender: 'male',
    language: 'simplified',
    region: 'CN',
    regionName: '中国大陆',
    description: 'Deep Mandarin Chinese male voice',
  },

  // Traditional Chinese (Taiwan) voices
  {
    id: 'zh-TW-HsiaoChenNeural',
    name: '曉臻',
    lang: 'zh-TW',
    gender: 'female',
    language: 'traditional',
    region: 'TW',
    regionName: '台湾',
    description: 'Natural Taiwan Mandarin female voice',
  },
  {
    id: 'zh-TW-YunJheNeural',
    name: '雲哲',
    lang: 'zh-TW',
    gender: 'male',
    language: 'traditional',
    region: 'TW',
    regionName: '台湾',
    description: 'Natural Taiwan Mandarin male voice',
  },
  {
    id: 'zh-TW-HsiaoYuNeural',
    name: '曉雨',
    lang: 'zh-TW',
    gender: 'female',
    language: 'traditional',
    region: 'TW',
    regionName: '台湾',
    description: 'Young Taiwan Mandarin female voice',
  },
  // Note: zh-TW-YunJungNeural was removed as it doesn't exist in Azure

  // Traditional Chinese (Hong Kong) - Cantonese voices
  {
    id: 'zh-HK-HiuMaanNeural',
    name: '曉曼',
    lang: 'zh-HK',
    gender: 'female',
    language: 'traditional',
    region: 'HK',
    regionName: '香港',
    description: 'Natural Cantonese female voice',
  },
  {
    id: 'zh-HK-WanLungNeural',
    name: '雲龍',
    lang: 'zh-HK',
    gender: 'male',
    language: 'traditional',
    region: 'HK',
    regionName: '香港',
    description: 'Natural Cantonese male voice',
  },
  {
    id: 'zh-HK-HiuGaaiNeural',
    name: '曉佳',
    lang: 'zh-HK',
    gender: 'female',
    language: 'traditional',
    region: 'HK',
    regionName: '香港',
    description: 'Friendly Cantonese female voice',
  },
  // Note: zh-HK-WanNeural was removed as it doesn't exist in Azure
]

/**
 * Get voices grouped by region for a specific language
 * @param language - The app language
 * @returns Object with regions as keys and arrays of voices as values
 */
export function getVoicesByRegion(language: Language): Record<string, EdgeTTSVoice[]> {
  const voices = EDGE_TTS_VOICES.filter(v => v.language === language)
  const grouped: Record<string, EdgeTTSVoice[]> = {}
  
  for (const voice of voices) {
    if (!grouped[voice.region]) {
      grouped[voice.region] = []
    }
    grouped[voice.region].push(voice)
  }
  
  // Sort voices within each region by gender (female first) then name
  for (const region of Object.keys(grouped)) {
    grouped[region].sort((a, b) => {
      if (a.gender !== b.gender) {
        return a.gender === 'female' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }
  
  return grouped
}

/**
 * Get the default voice for a language
 * @param language - The app language
 * @param gender - Preferred gender (default: female)
 * @param region - Optional region preference
 * @returns The voice ID string
 */
export function getDefaultVoiceForLanguage(
  language: Language,
  gender: 'female' | 'male' = 'female',
  region?: string
): string {
  // If region is specified, try to find a voice for that region
  if (region) {
    const regionVoice = EDGE_TTS_VOICES.find(
      v => v.language === language && v.region === region && v.gender === gender
    )
    if (regionVoice) return regionVoice.id
  }
  
  // For traditional Chinese, prefer Taiwan voices over Hong Kong
  if (language === 'traditional') {
    const taiwanVoice = EDGE_TTS_VOICES.find(
      v => v.language === 'traditional' && v.region === 'TW' && v.gender === gender
    )
    if (taiwanVoice) return taiwanVoice.id
  }
  
  // For English, prefer US voices
  if (language === 'english') {
    const usVoice = EDGE_TTS_VOICES.find(
      v => v.language === 'english' && v.region === 'US' && v.gender === gender
    )
    if (usVoice) return usVoice.id
  }
  
  // Fallback to first matching voice
  const voice = EDGE_TTS_VOICES.find(
    v => v.language === language && v.gender === gender
  )
  return voice?.id || 'en-US-AriaNeural'
}

/**
 * Get all voices for a specific language
 * @param language - The app language
 * @returns Array of voices for that language
 */
export function getVoicesForLanguage(language: Language): EdgeTTSVoice[] {
  return EDGE_TTS_VOICES.filter(v => v.language === language)
}

/**
 * Get all unique regions available for a language
 * @param language - The app language
 * @returns Array of region codes
 */
export function getRegionsForLanguage(language: Language): string[] {
  const voices = EDGE_TTS_VOICES.filter(v => v.language === language)
  const regions = [...new Set(voices.map(v => v.region))]
  
  // Sort regions in a logical order
  const regionOrder: Record<string, number> = {
    // English regions
    'US': 1,
    'GB': 2,
    'AU': 3,
    'CA': 4,
    'IN': 5,
    // Chinese regions
    'CN': 1,
    'TW': 2,
    'HK': 3,
  }
  
  return regions.sort((a, b) => (regionOrder[a] || 99) - (regionOrder[b] || 99))
}

/**
 * Get a voice by its ID
 * @param voiceId - The Edge TTS voice ID
 * @returns The voice object or undefined
 */
export function getVoiceById(voiceId: string): EdgeTTSVoice | undefined {
  return EDGE_TTS_VOICES.find(v => v.id === voiceId)
}

/**
 * Get voice display name for UI
 * @param voiceId - The Edge TTS voice ID
 * @returns Display name or the ID if not found
 */
export function getVoiceDisplayName(voiceId: string): string {
  const voice = getVoiceById(voiceId)
  if (!voice) return voiceId
  return `${voice.name} (${voice.lang})`
}

/**
 * Language labels for UI
 */
export const LANGUAGE_LABELS: Record<Language, { name: string; voices: string }> = {
  english: { name: 'English', voices: 'English Voices' },
  simplified: { name: '简体中文', voices: '普通话语音' },
  traditional: { name: '繁體中文', voices: '國語/粵語語音' },
}

/**
 * Gender labels for UI
 */
export const GENDER_LABELS = {
  female: { en: 'Female', zh: '女声' },
  male: { en: 'Male', zh: '男声' },
}