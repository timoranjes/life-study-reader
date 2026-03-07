// TTS Text Preprocessing Module
// Improves Chinese speech synthesis quality by handling polyphonic characters,
// expanding Bible references, and removing structural markers.

/**
 * Options for text preprocessing
 */
export interface PreprocessorOptions {
  expandBibleReferences?: boolean
  handlePolyphonicCharacters?: boolean
  removeStructuralMarkers?: boolean
  // Naturalness options
  naturalPauses?: boolean
  pauseMultiplier?: number  // 0.5 - 2.0, default 1.0
  emphasizeCapitalized?: boolean
}

/**
 * Pause configuration for natural speech
 * Values are in milliseconds
 */
interface PauseConfig {
  sentence: number      // After sentence end (period, exclamation, question)
  clause: number        // After comma, semicolon, colon
  paragraph: number     // Between paragraphs
  quote: number         // Before/after quotes
  enumeration: number   // Between enumerated items (一、二、三)
}

const DEFAULT_PAUSE_CONFIG: PauseConfig = {
  sentence: 500,
  clause: 250,
  paragraph: 700,
  quote: 150,
  enumeration: 300,
}

/**
 * Common abbreviations that should be expanded for TTS
 */
const ABBREVIATIONS_EN: Record<string, string> = {
  'cf.': 'compare',
  'e.g.': 'for example',
  'i.e.': 'that is',
  'etc.': 'etcetera',
  'vs.': 'versus',
  'v.': 'verse',
  'vv.': 'verses',
  'ch.': 'chapter',
  'chs.': 'chapters',
  'vol.': 'volume',
  'ed.': 'edition',
  'Rev.': 'Revelation',
  'Gen.': 'Genesis',
  'Ex.': 'Exodus',
  'Matt.': 'Matthew',
  'John': 'John', // Already full name
}

/**
 * Chinese punctuation that indicates sentence boundaries
 */
const CHINESE_SENTENCE_END = ['。', '！', '？', '……', '⋯⋯']
const CHINESE_CLAUSE_MARKERS = ['，', '；', '：', '、']
const CHINESE_QUOTE_MARKERS = ['「', '」', '『', '』', '“', '”', '‘', '’']

/**
 * Bible book abbreviations to full names mapping (Traditional Chinese)
 */
const BIBLE_BOOKS: Record<string, string> = {
  '創': '創世記', '出': '出埃及記', '利': '利未記', '民': '民數記',
  '申': '申命記', '書': '約書亞記', '士': '士師記', '得': '路得記',
  '撒上': '撒母耳記上', '撒下': '撒母耳記下',
  '王上': '列王紀上', '王下': '列王紀下',
  '代上': '歷代志上', '代下': '歷代志下',
  '拉': '以斯拉記', '尼': '尼希米記', '斯': '以斯帖記', '伯': '約伯記',
  '詩': '詩篇', '箴': '箴言', '傳': '傳道書', '歌': '雅歌',
  '賽': '以賽亞書', '耶': '耶利米書', '哀': '耶利米哀歌', '結': '以西結書',
  '但': '但以理書', '何': '何西阿書', '珥': '約珥書', '摩': '阿摩司書',
  '俄': '俄巴底亞書', '拿': '約拿書', '彌': '彌迦書', '鴻': '那鴻書',
  '哈': '哈巴谷書', '番': '西番雅書', '該': '哈該書', '亞': '撒迦利亞書',
  '瑪': '瑪拉基書',
  '太': '馬太福音', '可': '馬可福音', '路': '路加福音', '約': '約翰福音',
  '徒': '使徒行傳', '羅': '羅馬書',
  '林前': '哥林多前書', '林後': '哥林多後書',
  '加': '加拉太書', '弗': '以弗所書', '腓': '腓立比書', '西': '歌羅西書',
  '帖前': '帖撒羅尼迦前書', '帖後': '帖撒羅尼迦後書',
  '提前': '提摩太前書', '提後': '提摩太後書',
  '多': '提多書', '門': '腓利門書', '來': '希伯來書',
  '雅': '雅各書', '彼前': '彼得前書', '彼後': '彼得後書',
  '約壹': '約翰壹書', '約貳': '約翰貳書', '約叁': '約翰叁書',
  '猶': '猶大書', '啟': '啟示錄'
}

/**
 * Arabic numerals to Chinese numerals mapping
 */
const CHINESE_NUMERALS: Record<string, string> = {
  '0': '零', '1': '一', '2': '二', '3': '三', '4': '四',
  '5': '五', '6': '六', '7': '七', '8': '八', '9': '九'
}

/**
 * Convert Arabic number to Chinese spoken form
 * Examples: 1 → 一, 10 → 十, 26 → 二十六, 63 → 六十三, 156 → 一百五十六
 */
function numberToChinese(num: number): string {
  if (num === 0) return '零'
  if (num < 0) return '負' + numberToChinese(-num)
  
  const units = ['', '十', '百', '千']
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  
  if (num < 10) return digits[num]
  if (num === 10) return '十'
  if (num < 20) return '十' + digits[num - 10]
  if (num < 100) {
    const tens = Math.floor(num / 10)
    const ones = num % 10
    return digits[tens] + '十' + (ones > 0 ? digits[ones] : '')
  }
  if (num < 1000) {
    const hundreds = Math.floor(num / 100)
    const remainder = num % 100
    if (remainder === 0) return digits[hundreds] + '百'
    if (remainder < 10) return digits[hundreds] + '百零' + digits[remainder]
    if (remainder < 20) return digits[hundreds] + '百十' + (remainder > 10 ? digits[remainder - 10] : '')
    return digits[hundreds] + '百' + numberToChinese(remainder)
  }
  if (num < 10000) {
    const thousands = Math.floor(num / 1000)
    const remainder = num % 1000
    if (remainder === 0) return digits[thousands] + '千'
    if (remainder < 100) return digits[thousands] + '千零' + numberToChinese(remainder)
    return digits[thousands] + '千' + numberToChinese(remainder)
  }
  
  // For numbers >= 10000, handle with 萬
  const wan = Math.floor(num / 10000)
  const remainder = num % 10000
  if (remainder === 0) return numberToChinese(wan) + '萬'
  return numberToChinese(wan) + '萬' + (remainder < 1000 ? '零' : '') + numberToChinese(remainder)
}

/**
 * Parse a Bible reference string and expand it to spoken form
 * Handles formats like:
 * - "創一 26" → "創世記一章二十六節"
 * - "約六 63" → "約翰福音六章六十三節"
 * - "加三 7，29" → "加拉太書三章七節、二十九節"
 * - "羅十五 4" → "羅馬書十五章四節"
 * - "提後三 16～17" → "提摩太後書三章十六至十七節"
 */
function expandBibleReference(ref: string): string {
  // Pattern to match Bible references
  // Format: Book+Chapter Space/Verses
  // Book can be 1-3 characters (e.g., 創, 撒上, 約壹)
  // Chapter is Chinese numerals or Arabic
  // Verse can be single, comma-separated, or range with ～ or -
  
  // Match pattern: (Book)(Chapter) (Verses)
  // Try to match longer book names first
  const sortedBooks = Object.keys(BIBLE_BOOKS).sort((a, b) => b.length - a.length)
  
  for (const abbr of sortedBooks) {
    const fullName = BIBLE_BOOKS[abbr]
    // Escape special regex characters
    const escapedAbbr = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Pattern: book + chapter (Chinese/Arabic) + optional space + verses
    // Verses can be: single number, comma-separated, or range
    const pattern = new RegExp(
      `${escapedAbbr}([一二三四五六七八九十百千零\\d]+)[\\s　]*([\\d,，、～\\-～]+)`,
      'g'
    )
    
    ref = ref.replace(pattern, (match, chapter, verses) => {
      // Convert chapter to Chinese number
      let chapterNum: number
      if (/^\d+$/.test(chapter.trim())) {
        chapterNum = parseInt(chapter.trim(), 10)
      } else {
        // Convert Chinese numerals to Arabic for processing
        chapterNum = chineseToNumber(chapter.trim())
      }
      const chapterChinese = numberToChinese(chapterNum)
      
      // Parse verses
      const verseParts = parseVerses(verses)
      const verseChinese = verseParts.map(v => numberToChinese(v) + '節').join('、')
      
      return `${fullName}${chapterChinese}章${verseChinese}`
    })
  }
  
  return ref
}

/**
 * Convert Chinese numerals to Arabic number
 */
function chineseToNumber(chinese: string): number {
  const digits: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100, '千': 1000
  }
  
  let result = 0
  let temp = 0
  
  for (let i = 0; i < chinese.length; i++) {
    const char = chinese[i]
    const value = digits[char]
    
    if (value === undefined) continue
    
    if (value >= 10) {
      // Unit character (十, 百, 千)
      if (temp === 0) temp = 1 // Handle cases like 十 (ten)
      result += temp * value
      temp = 0
    } else {
      // Digit character
      temp = value
    }
  }
  
  result += temp
  return result || 0
}

/**
 * Parse verse string into array of verse numbers
 * Handles: "26", "7，29", "16～17", "16-17", "1,3,5"
 */
function parseVerses(verses: string): number[] {
  const result: number[] = []
  
  // Handle range (～ or -)
  if (verses.includes('～') || verses.includes('-') || verses.includes('—')) {
    const separator = verses.includes('～') ? '～' : verses.includes('—') ? '—' : '-'
    const parts = verses.split(separator)
    if (parts.length === 2) {
      const start = parseInt(parts[0].trim(), 10)
      const end = parseInt(parts[1].trim(), 10)
      if (!isNaN(start) && !isNaN(end)) {
        // For ranges, we use "至" (to) in the output
        // Return start and end for special handling
        result.push(start, -end) // Negative indicates end of range
      }
    }
  } else {
    // Handle comma-separated verses
    const parts = verses.split(/[,，、]/)
    for (const part of parts) {
      const num = parseInt(part.trim(), 10)
      if (!isNaN(num)) {
        result.push(num)
      }
    }
  }
  
  return result
}

/**
 * Format verses for speech output
 */
function formatVerses(verses: string): string {
  // Handle range (～ or -)
  if (verses.includes('～') || verses.includes('-') || verses.includes('—')) {
    const separator = verses.includes('～') ? '～' : verses.includes('—') ? '—' : '-'
    const parts = verses.split(separator)
    if (parts.length === 2) {
      const start = parseInt(parts[0].trim(), 10)
      const end = parseInt(parts[1].trim(), 10)
      if (!isNaN(start) && !isNaN(end)) {
        return `${numberToChinese(start)}至${numberToChinese(end)}節`
      }
    }
  }
  
  // Handle comma-separated verses
  const parts = verses.split(/[,，、]/)
  const numbers = parts
    .map(p => parseInt(p.trim(), 10))
    .filter(n => !isNaN(n))
  
  if (numbers.length === 0) return ''
  if (numbers.length === 1) return `${numberToChinese(numbers[0])}節`
  
  return numbers.map(n => `${numberToChinese(n)}節`).join('、')
}

/**
 * Main Bible reference expansion function
 */
function processBibleReferences(text: string): string {
  // Pattern to match Bible references
  // More comprehensive pattern that handles various formats
  const sortedBooks = Object.keys(BIBLE_BOOKS).sort((a, b) => b.length - a.length)
  
  let result = text
  
  for (const abbr of sortedBooks) {
    const fullName = BIBLE_BOOKS[abbr]
    const escapedAbbr = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Match: Book + Chapter (Chinese/Arabic) + optional space + Verses
    // Chapter can be Chinese numerals or Arabic numbers
    // Verses can be single, comma-separated, or range
    const pattern = new RegExp(
      `${escapedAbbr}([一二三四五六七八九十百千\\d]+)[\\s　]*([\\d,，、～\\-～—]+)`,
      'g'
    )
    
    result = result.replace(pattern, (match, chapter, verses) => {
      // Convert chapter to number then to Chinese
      let chapterNum: number
      if (/^\d+$/.test(chapter.trim())) {
        chapterNum = parseInt(chapter.trim(), 10)
      } else {
        chapterNum = chineseToNumber(chapter.trim())
      }
      const chapterChinese = numberToChinese(chapterNum)
      
      // Format verses
      const verseStr = formatVerses(verses.trim())
      
      return `${fullName}${chapterChinese}章${verseStr}`
    })
  }
  
  return result
}

/**
 * Polyphonic character definitions with context-aware rules
 */
interface PolyphonicChar {
  char: string
  default: string  // Default reading (pinyin with tone)
  contexts: Array<{
    pattern: RegExp
    reading: string
    replacement?: string  // Optional replacement text for TTS
  }>
}

/**
 * Polyphonic characters dictionary
 * Each entry contains the character, default reading, and context-specific rules
 */
const POLYPHONIC_CHARS: PolyphonicChar[] = [
  // 長 (cháng/zhǎng)
  {
    char: '長',
    default: 'cháng',
    contexts: [
      { pattern: /長老/g, reading: 'zhǎng', replacement: '長老' },
      { pattern: /長大/g, reading: 'zhǎng', replacement: '長大' },
      { pattern: /長進/g, reading: 'zhǎng', replacement: '長進' },
      { pattern: /成長/g, reading: 'zhǎng', replacement: '成長' },
      { pattern: /生長/g, reading: 'zhǎng', replacement: '生長' },
      { pattern: /長久/g, reading: 'cháng', replacement: '長久' },
      { pattern: /長遠/g, reading: 'cháng', replacement: '長遠' },
      { pattern: /永遠長存/g, reading: 'cháng', replacement: '永遠長存' },
    ]
  },
  // 行 (xíng/háng)
  {
    char: '行',
    default: 'xíng',
    contexts: [
      { pattern: /行為/g, reading: 'xíng', replacement: '行為' },
      { pattern: /行事/g, reading: 'xíng', replacement: '行事' },
      { pattern: /行走/g, reading: 'xíng', replacement: '行走' },
      { pattern: /實行/g, reading: 'xíng', replacement: '實行' },
      { pattern: /運行/g, reading: 'xíng', replacement: '運行' },
      { pattern: /排行/g, reading: 'háng', replacement: '排行' },
      { pattern: /行家/g, reading: 'háng', replacement: '行家' },
      { pattern: /行業/g, reading: 'háng', replacement: '行業' },
    ]
  },
  // 重 (zhòng/chóng)
  {
    char: '重',
    default: 'zhòng',
    contexts: [
      { pattern: /重生/g, reading: 'chóng', replacement: '重生' },
      { pattern: /重新/g, reading: 'chóng', replacement: '重新' },
      { pattern: /重複/g, reading: 'chóng', replacement: '重複' },
      { pattern: /重要/g, reading: 'zhòng', replacement: '重要' },
      { pattern: /看重/g, reading: 'zhòng', replacement: '看重' },
      { pattern: /尊重/g, reading: 'zhòng', replacement: '尊重' },
      { pattern: /沉重/g, reading: 'zhòng', replacement: '沉重' },
    ]
  },
  // 樂 (lè/yuè)
  {
    char: '樂',
    default: 'lè',
    contexts: [
      { pattern: /音樂/g, reading: 'yuè', replacement: '音樂' },
      { pattern: /樂器/g, reading: 'yuè', replacement: '樂器' },
      { pattern: /樂章/g, reading: 'yuè', replacement: '樂章' },
      { pattern: /快樂/g, reading: 'lè', replacement: '快樂' },
      { pattern: /喜樂/g, reading: 'lè', replacement: '喜樂' },
      { pattern: /平安喜樂/g, reading: 'lè', replacement: '平安喜樂' },
    ]
  },
  // 說 (shuō/shuì)
  {
    char: '說',
    default: 'shuō',
    contexts: [
      { pattern: /說服/g, reading: 'shuì', replacement: '說服' },
      { pattern: /遊說/g, reading: 'shuì', replacement: '遊說' },
      { pattern: /說話/g, reading: 'shuō', replacement: '說話' },
      { pattern: /說明/g, reading: 'shuō', replacement: '說明' },
    ]
  },
  // 處 (chù/chǔ)
  {
    char: '處',
    default: 'chù',
    contexts: [
      { pattern: /處理/g, reading: 'chǔ', replacement: '處理' },
      { pattern: /處世/g, reading: 'chǔ', replacement: '處世' },
      { pattern: /相處/g, reading: 'chǔ', replacement: '相處' },
      { pattern: /處所/g, reading: 'chù', replacement: '處所' },
      { pattern: /到處/g, reading: 'chù', replacement: '到處' },
      { pattern: /處處/g, reading: 'chù', replacement: '處處' },
    ]
  },
  // 當 (dāng/dàng)
  {
    char: '當',
    default: 'dāng',
    contexts: [
      { pattern: /應當/g, reading: 'dāng', replacement: '應當' },
      { pattern: /當然/g, reading: 'dāng', replacement: '當然' },
      { pattern: /當時/g, reading: 'dāng', replacement: '當時' },
      { pattern: /恰當/g, reading: 'dàng', replacement: '恰當' },
      { pattern: /妥當/g, reading: 'dàng', replacement: '妥當' },
      { pattern: /當作/g, reading: 'dàng', replacement: '當作' },
    ]
  },
  // 著 (zhe/zhuó)
  {
    char: '著',
    default: 'zhe',
    contexts: [
      { pattern: /穿著/g, reading: 'zhuó', replacement: '穿著' },
      { pattern: /著想/g, reading: 'zhuó', replacement: '著想' },
      { pattern: /著落/g, reading: 'zhuó', replacement: '著落' },
      { pattern: /看著/g, reading: 'zhe', replacement: '看著' },
      { pattern: /聽著/g, reading: 'zhe', replacement: '聽著' },
      { pattern: /走著/g, reading: 'zhe', replacement: '走著' },
    ]
  },
  // 了 (le/liǎo)
  {
    char: '了',
    default: 'le',
    contexts: [
      { pattern: /了解/g, reading: 'liǎo', replacement: '了解' },
      { pattern: /明了/g, reading: 'liǎo', replacement: '明了' },
      { pattern: /了結/g, reading: 'liǎo', replacement: '了結' },
      { pattern: /了悟/g, reading: 'liǎo', replacement: '了悟' },
      { pattern: /走了/g, reading: 'le', replacement: '走了' },
      { pattern: /好了/g, reading: 'le', replacement: '好了' },
      { pattern: /來了/g, reading: 'le', replacement: '來了' },
    ]
  },
  // 地 (de/dì)
  {
    char: '地',
    default: 'dì',
    contexts: [
      // Adverbial marker: usually preceded by an adjective ending in 地
      { pattern: /慢慢地/g, reading: 'de', replacement: '慢慢地' },
      { pattern: /輕輕地/g, reading: 'de', replacement: '輕輕地' },
      { pattern: /漸漸地/g, reading: 'de', replacement: '漸漸地' },
      { pattern: /特特地/g, reading: 'de', replacement: '特特地' },
      // Noun usage
      { pattern: /地方/g, reading: 'dì', replacement: '地方' },
      { pattern: /土地/g, reading: 'dì', replacement: '土地' },
      { pattern: /天地/g, reading: 'dì', replacement: '天地' },
      { pattern: /地土/g, reading: 'dì', replacement: '地土' },
    ]
  },
]

/**
 * Convert 著 to 着 for TTS pronunciation
 * In Traditional Chinese texts, 著 is often used where 着 would be used in Simplified
 * For TTS to pronounce correctly, we need to convert:
 * - 為著 → 為着 (wèizhe - "for the purpose of")
 * - verb + 著 → verb + 着 (aspect marker zhe)
 * But keep 著 for: 著作 (zhùzuò), 著名 (zhùmíng), 穿著 (zhuó), etc.
 */
function convertZhuoToZhe(text: string): string {
  let result = text
  
  // Patterns where 著 should be pronounced as 着 (zhe) - particle/aspect marker
  // These are cases where 著 functions as a particle after verbs or in phrases
  const zhePatterns = [
    // "為著" - for the purpose of (very common in religious texts)
    { pattern: /為著/g, replacement: '為着' },
    // Verb + 著 patterns (aspect marker)
    { pattern: /看著/g, replacement: '看着' },
    { pattern: /聽著/g, replacement: '聽着' },
    { pattern: /走著/g, replacement: '走着' },
    { pattern: /說著/g, replacement: '說着' },
    { pattern: /想著/g, replacement: '想着' },
    { pattern: /愛著/g, replacement: '愛着' },
    { pattern: /跟著/g, replacement: '跟着' },
    { pattern: /住著/g, replacement: '住着' },
    { pattern: /坐著/g, replacement: '坐着' },
    { pattern: /站著/g, replacement: '站着' },
    { pattern: /拿著/g, replacement: '拿着' },
    { pattern: /帶著/g, replacement: '帶着' },
    { pattern: /含著/g, replacement: '含着' },
    { pattern: /懷著/g, replacement: '懷着' },
    { pattern: /存著/g, replacement: '存着' },
    { pattern: /守著/g, replacement: '守着' },
    { pattern: /等著/g, replacement: '等着' },
    { pattern: /過著/g, replacement: '過着' },
    { pattern: /活著/g, replacement: '活着' },
    { pattern: /死著/g, replacement: '死着' },
    { pattern: /跑著/g, replacement: '跑着' },
    { pattern: /飛著/g, replacement: '飛着' },
    { pattern: /寫著/g, replacement: '寫着' },
    { pattern: /讀著/g, replacement: '讀着' },
    { pattern: /唱著/g, replacement: '唱着' },
    { pattern: /哭著/g, replacement: '哭着' },
    { pattern: /笑著/g, replacement: '笑着' },
    { pattern: /忙著/g, replacement: '忙着' },
    { pattern: /急著/g, replacement: '急着' },
    { pattern: /留著/g, replacement: '留着' },
    { pattern: /記著/g, replacement: '記着' },
    { pattern: /忘著/g, replacement: '忘着' },
    { pattern: /藏著/g, replacement: '藏着' },
    { pattern: /抱著/g, replacement: '抱着' },
    { pattern: /提著/g, replacement: '提着' },
    { pattern: /背著/g, replacement: '背着' },
    { pattern: /扶著/g, replacement: '扶着' },
    { pattern: /牽著/g, replacement: '牽着' },
    { pattern: /拉著/g, replacement: '拉着' },
    { pattern: /推著/g, replacement: '推着' },
    { pattern: /壓著/g, replacement: '壓着' },
    { pattern: /蓋著/g, replacement: '蓋着' },
    { pattern: /披著/g, replacement: '披着' },
    { pattern: /穿著(?!想|落)/g, replacement: '穿着' },  // 穿著 but not 穿著想, 穿著落
    { pattern: /戴著/g, replacement: '戴着' },
    { pattern: /掛著/g, replacement: '掛着' },
    { pattern: /吊著/g, replacement: '吊着' },
    { pattern: /放著/g, replacement: '放着' },
    { pattern: /擺著/g, replacement: '擺着' },
    { pattern: /鋪著/g, replacement: '鋪着' },
    { pattern: /充滿著/g, replacement: '充滿着' },
    { pattern: /含著/g, replacement: '含着' },
    { pattern: /順著/g, replacement: '順着' },
    { pattern: /沿著/g, replacement: '沿着' },
    { pattern: /朝著/g, replacement: '朝着' },
    { pattern: /照著/g, replacement: '照着' },
    { pattern: /按著/g, replacement: '按着' },
    { pattern: /依著/g, replacement: '依着' },
    { pattern: /據著/g, replacement: '據着' },
    { pattern: /憑著/g, replacement: '憑着' },
    { pattern: /靠著/g, replacement: '靠着' },
    { pattern: /本著/g, replacement: '本着' },
    { pattern: /為著/g, replacement: '為着' },
    { pattern: /對著/g, replacement: '對着' },
    { pattern: /向著/g, replacement: '向着' },
    { pattern: /望著/g, replacement: '望着' },
    { pattern: /指著/g, replacement: '指着' },
    { pattern: /點著/g, replacement: '點着' },
    { pattern: /接著/g, replacement: '接着' },
    { pattern: /連著/g, replacement: '連着' },
    { pattern: /隨著/g, replacement: '隨着' },
    { pattern: /伴著/g, replacement: '伴着' },
    { pattern: /同著/g, replacement: '同着' },
    { pattern: /跟著/g, replacement: '跟着' },
    { pattern: /並著/g, replacement: '並着' },
    { pattern: /挨著/g, replacement: '挨着' },
    { pattern: /貼著/g, replacement: '貼着' },
    { pattern: /靠著/g, replacement: '靠着' },
    { pattern: /依偎著/g, replacement: '依偎着' },
    { pattern: /纏著/g, replacement: '纏着' },
    { pattern: /繞著/g, replacement: '繞着' },
    { pattern: /圍著/g, replacement: '圍着' },
    { pattern: /裹著/g, replacement: '裹着' },
    { pattern: /包著/g, replacement: '包着' },
    { pattern: /捲著/g, replacement: '捲着' },
    { pattern: /捲著/g, replacement: '捲着' },
    { pattern: /折著/g, replacement: '折着' },
    { pattern: /疊著/g, replacement: '疊着' },
    { pattern: /堆著/g, replacement: '堆着' },
    { pattern: /積著/g, replacement: '積着' },
    { pattern: /存著/g, replacement: '存着' },
    { pattern: /蓄著/g, replacement: '蓄着' },
    { pattern: /養著/g, replacement: '養着' },
    { pattern: /長著/g, replacement: '長着' },
    { pattern: /生著/g, replacement: '生着' },
    { pattern: /發著/g, replacement: '發着' },
    { pattern: /亮著/g, replacement: '亮着' },
    { pattern: /燃著/g, replacement: '燃着' },
    { pattern: /燒著/g, replacement: '燒着' },
    { pattern: /開著/g, replacement: '開着' },
    { pattern: /關著/g, replacement: '關着' },
    { pattern: /鎖著/g, replacement: '鎖着' },
    { pattern: /封著/g, replacement: '封着' },
    { pattern: /堵著/g, replacement: '堵着' },
    { pattern: /塞著/g, replacement: '塞着' },
    { pattern: /埋著/g, replacement: '埋着' },
    { pattern: /遮著/g, replacement: '遮着' },
    { pattern: /掩著/g, replacement: '掩着' },
    { pattern: /擋著/g, replacement: '擋着' },
    { pattern: /遮蓋著/g, replacement: '遮蓋着' },
    { pattern: /覆蓋著/g, replacement: '覆蓋着' },
    { pattern: /充滿著/g, replacement: '充滿着' },
    { pattern: /滿載著/g, replacement: '滿載着' },
    { pattern: /載著/g, replacement: '載着' },
    { pattern: /盛著/g, replacement: '盛着' },
    { pattern: /裝著/g, replacement: '裝着' },
    { pattern: /含著/g, replacement: '含着' },
    { pattern: /握著/g, replacement: '握着' },
    { pattern: /執著/g, replacement: '執着' },
    { pattern: /堅持著/g, replacement: '堅持着' },
    { pattern: /保持著/g, replacement: '保持着' },
    { pattern: /維持著/g, replacement: '維持着' },
    { pattern: /持續著/g, replacement: '持續着' },
    { pattern: /繼續著/g, replacement: '繼續着' },
    { pattern: /延續著/g, replacement: '延續着' },
    { pattern: /進行著/g, replacement: '進行着' },
    { pattern: /發展著/g, replacement: '發展着' },
    { pattern: /演變著/g, replacement: '演變着' },
    { pattern: /變化著/g, replacement: '變化着' },
    { pattern: /流動著/g, replacement: '流動着' },
    { pattern: /流淌著/g, replacement: '流淌着' },
    { pattern: /流著/g, replacement: '流着' },
    { pattern: /湧著/g, replacement: '湧着' },
    { pattern: /湧流著/g, replacement: '湧流着' },
    { pattern: /運行著/g, replacement: '運行着' },
    { pattern: /運作著/g, replacement: '運作着' },
    { pattern: /運轉著/g, replacement: '運轉着' },
    { pattern: /轉動著/g, replacement: '轉動着' },
    { pattern: /旋轉著/g, replacement: '旋轉着' },
    { pattern: /飛舞著/g, replacement: '飛舞着' },
    { pattern: /飄揚著/g, replacement: '飄揚着' },
    { pattern: /飄著/g, replacement: '飄着' },
    { pattern: /吹著/g, replacement: '吹着' },
    { pattern: /飄落著/g, replacement: '飄落着' },
    { pattern: /下著/g, replacement: '下着' },
    { pattern: /落著/g, replacement: '落着' },
    { pattern: /降著/g, replacement: '降着' },
    { pattern: /沉降著/g, replacement: '沉降着' },
    { pattern: /瀰漫著/g, replacement: '瀰漫着' },
    { pattern: /散發著/g, replacement: '散發着' },
    { pattern: /散布著/g, replacement: '散布着' },
    { pattern: /分佈著/g, replacement: '分佈着' },
    { pattern: /遍布著/g, replacement: '遍布着' },
    { pattern: /滿布著/g, replacement: '滿布着' },
    { pattern: /充滿著/g, replacement: '充滿着' },
    { pattern: /充盈著/g, replacement: '充盈着' },
    { pattern: /洋溢著/g, replacement: '洋溢著' },
    // Sentence-final 著 as particle
    { pattern: /著。/g, replacement: '着。' },
    { pattern: /著，/g, replacement: '着，' },
    { pattern: /著；/g, replacement: '着；' },
    { pattern: /著、/g, replacement: '着、' },
    { pattern: /著！/g, replacement: '着！' },
    { pattern: /著？/g, replacement: '着？' },
  ]
  
  // Apply all replacements
  for (const { pattern, replacement } of zhePatterns) {
    result = result.replace(pattern, replacement)
  }
  
  // Handle "著" at the end of words/sentences (likely particle usage)
  // But preserve known zhuó readings
  // 著作 (zhùzuò), 著名 (zhùmíng), 著述 (zhùshù), 著錄 (zhùlù), 著書 (zhùshū)
  // 著想 (zhuóxiǎng), 著落 (zhuóluò), 穿著 (zhuózhuó)
  
  return result
}

/**
 * Process polyphonic characters in text
 * Note: Web Speech API doesn't directly support pronunciation hints,
 * but we can add SSML-like annotations or modify the text for clarity.
 * For now, this function primarily documents the correct readings
 * and can be extended to add SSML markup if the TTS engine supports it.
 */
function processPolyphonicCharacters(text: string): string {
  let result = text
  
  // First, convert 著 to 着 for proper TTS pronunciation
  result = convertZhuoToZhe(result)
  
  // For each polyphonic character, check context patterns
  for (const char of POLYPHONIC_CHARS) {
    for (const context of char.contexts) {
      // Check if pattern matches and apply any replacement
      if (context.pattern.test(result)) {
        // The pattern matching is done; we don't modify text directly
        // but the context information is available for SSML generation
        // or for advanced TTS engines that support pronunciation hints
      }
    }
  }
  
  return result
}

/**
 * Remove or convert structural markers that shouldn't be spoken
 */
function processStructuralMarkers(text: string): string {
  let result = text
  
  // Remove parenthetical outline markers like (一), (二), (三)
  result = result.replace(/[（(][一二三四五六七八九十]+[)）]/g, '')
  
  // Remove full-width numbers at start of paragraphs (outline markers)
  result = result.replace(/^[１２３４５６７８９０]+\s*/gm, '')
  
  // Remove full-width letters at start of paragraphs (outline markers)
  result = result.replace(/^[ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ]+\s*/gm, '')
  
  // Remove Chinese numeral outline markers at start of paragraphs (壹, 貳, 參, etc.)
  result = result.replace(/^[壹貳參肆伍陸柒捌玖拾]+\s*/gm, '')
  
  // Remove Roman numeral outline markers at start of paragraphs
  result = result.replace(/^[IVXLCDM]+\.?\s*/gm, '')
  result = result.replace(/^[ivxlcdm]+\.?\s*/gm, '')
  
  // Remove Arabic numeral outline markers at start of paragraphs
  result = result.replace(/^\d+[\.\)、]\s*/gm, '')
  
  // Clean up multiple spaces
  result = result.replace(/  +/g, ' ')
  
  // Clean up empty lines at start
  result = result.replace(/^\s+/gm, '')
  
  return result
}

/**
 * Convert full-width punctuation to half-width for better TTS handling
 */
function normalizePunctuation(text: string): string {
  let result = text
  
  // Convert full-width punctuation to normalized forms for TTS
  // Some TTS engines handle full-width punctuation poorly
  // But for Chinese TTS, full-width is often preferred, so we keep most
  
  // Ensure consistent spacing around certain punctuation
  result = result.replace(/\s*，\s*/g, '，')
  result = result.replace(/\s*。\s*/g, '。')
  result = result.replace(/\s*、\s*/g, '、')
  
  return result
}

/**
 * Add natural pauses to text for more human-like speech
 * Uses comma (,) as pause markers that TTS engines interpret as natural pauses
 *
 * @param text - The input text
 * @param multiplier - Pause duration multiplier (0.5 - 2.0)
 * @returns Text with pause markers inserted
 */
function addNaturalPauses(text: string, multiplier: number = 1.0): string {
  const config: PauseConfig = {
    sentence: Math.round(DEFAULT_PAUSE_CONFIG.sentence * multiplier),
    clause: Math.round(DEFAULT_PAUSE_CONFIG.clause * multiplier),
    paragraph: Math.round(DEFAULT_PAUSE_CONFIG.paragraph * multiplier),
    quote: Math.round(DEFAULT_PAUSE_CONFIG.quote * multiplier),
    enumeration: Math.round(DEFAULT_PAUSE_CONFIG.enumeration * multiplier),
  }
  
  let result = text
  
  // Add pause markers after sentence-ending punctuation
  // Use ellipsis (...) for longer pauses - most TTS engines interpret this naturally
  const sentencePauseMarker = '... '  // ~500ms pause
  const clausePauseMarker = ', '       // ~250ms pause
  
  // Chinese sentence end markers
  for (const marker of CHINESE_SENTENCE_END) {
    const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`${escapedMarker}`, 'g'), `${marker}${sentencePauseMarker}`)
  }
  
  // English sentence end markers (but not abbreviations like "St.")
  result = result.replace(/([.!?])\s+/g, `$1${sentencePauseMarker}`)
  
  // Add brief pause after clause markers (Chinese)
  for (const marker of CHINESE_CLAUSE_MARKERS) {
    const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Don't add pause after enumeration comma (、) - it's too short
    if (marker === '、') continue
    result = result.replace(new RegExp(`${escapedMarker}`, 'g'), `${marker}${clausePauseMarker}`)
  }
  
  // Add pause around quotes for better separation
  result = result.replace(/「/g, `「 `)
  result = result.replace(/」/g, ` 」`)
  result = result.replace(/『/g, `『 `)
  result = result.replace(/』/g, ` 』`)
  
  // Clean up multiple spaces
  result = result.replace(/  +/g, ' ')
  
  return result
}

/**
 * Process ALL CAPS text to add emphasis indicators
 * Note: Web Speech API has limited SSML support, so we use text markers
 *
 * @param text - The input text
 * @returns Text with emphasis markers
 */
function processEmphasis(text: string): string {
  let result = text
  
  // Find ALL CAPS words (English) and add slight emphasis
  // We can't truly change emphasis with Web Speech API, but we can
  // add a brief pause before them to draw attention
  result = result.replace(/\b([A-Z]{2,})\b/g, (match) => {
    // Add a brief pause before the emphasized word
    return `... ${match}`
  })
  
  // Handle words wrapped in *asterisks* (common markdown for emphasis)
  result = result.replace(/\*([^*]+)\*/g, '$1')
  
  return result
}

/**
 * Expand common abbreviations for better TTS pronunciation
 *
 * @param text - The input text
 * @returns Text with expanded abbreviations
 */
function expandAbbreviations(text: string): string {
  let result = text
  
  // Expand English abbreviations
  for (const [abbr, expansion] of Object.entries(ABBREVIATIONS_EN)) {
    // Case-insensitive replacement
    const regex = new RegExp(`\\b${abbr.replace('.', '\\.')}`, 'gi')
    result = result.replace(regex, expansion)
  }
  
  return result
}

/**
 * Main preprocessing function for TTS
 * Transforms text before sending to Web Speech API
 *
 * @param text - The input text to preprocess
 * @param options - Preprocessing options
 * @returns The preprocessed text
 */
export function preprocessTextForTTS(
  text: string,
  options: PreprocessorOptions = {}
): string {
  let result = text
  
  // Apply preprocessing based on options
  if (options.expandBibleReferences) {
    result = processBibleReferences(result)
  }
  
  if (options.handlePolyphonicCharacters) {
    result = processPolyphonicCharacters(result)
  }
  
  if (options.removeStructuralMarkers) {
    result = processStructuralMarkers(result)
  }
  
  // Apply naturalness options
  if (options.naturalPauses) {
    const multiplier = options.pauseMultiplier ?? 1.0
    result = addNaturalPauses(result, multiplier)
  }
  
  if (options.emphasizeCapitalized) {
    result = processEmphasis(result)
  }
  
  // Expand abbreviations for better pronunciation
  result = expandAbbreviations(result)
  
  // Always normalize punctuation
  result = normalizePunctuation(result)
  
  return result
}

/**
 * Export helper functions for testing
 */
export const TTS_PREPROCESSOR_HELPERS = {
  numberToChinese,
  chineseToNumber,
  processBibleReferences,
  processPolyphonicCharacters,
  processStructuralMarkers,
  BIBLE_BOOKS,
  POLYPHONIC_CHARS,
}