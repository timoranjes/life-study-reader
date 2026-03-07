/**
 * Bible Reference Parser
 * 
 * Parses Bible verse references from both English and Chinese formats.
 * Supports various reference patterns found in Life Study messages.
 */

import { bookNamesMap } from './book-names';

// ============================================
// Types
// ============================================

export interface BibleReference {
  bookId: string;           // Book ID matching book-names.ts (1-66)
  chapter: number;
  verseStart: number;
  verseEnd?: number;        // For ranges, undefined if single verse
  originalText: string;     // Original matched text
}

export interface ParsedReference {
  refs: BibleReference[];
  remainingText: string;
}

// ============================================
// English Book Abbreviations
// ============================================

const ENGLISH_BOOK_ABBREVIATIONS: Record<string, string> = {
  // Old Testament
  'Gen.': '1', 'Gen': '1',
  'Ex.': '2', 'Exo.': '2', 'Exod.': '2', 'Ex': '2', 'Exo': '2',
  'Lev.': '3', 'Lev': '3',
  'Num.': '4', 'Num': '4', 'Nb.': '4',
  'Deut.': '5', 'Deu.': '5', 'Deut': '5', 'Deu': '5',
  'Josh.': '6', 'Jos.': '6', 'Josh': '6', 'Jos': '6',
  'Judg.': '7', 'Judges': '7', 'Judg': '7', 'Jdg.': '7',
  'Ruth': '8', 'Rth.': '8', 'Rth': '8',
  '1 Sam.': '9', '1 Sam': '9', '1Sam.': '9', '1Sam': '9', '1Sa.': '9', '1Sa': '9',
  '2 Sam.': '10', '2 Sam': '10', '2Sam.': '10', '2Sam': '10', '2Sa.': '10', '2Sa': '10',
  '1 Kings': '11', '1Kgs.': '11', '1Kgs': '11', '1Ki.': '11', '1Ki': '11',
  '2 Kings': '12', '2Kgs.': '12', '2Kgs': '12', '2Ki.': '12', '2Ki': '12',
  '1 Chron.': '13', '1Chr.': '13', '1Chr': '13', '1Ch.': '13', '1Ch': '13',
  '2 Chron.': '14', '2Chr.': '14', '2Chr': '14', '2Ch.': '14', '2Ch': '14',
  'Ezra': '15', 'Ezr.': '15', 'Ezr': '15',
  'Neh.': '16', 'Neh': '16', 'Ne.': '16',
  'Esth.': '17', 'Esther': '17', 'Esth': '17', 'Est.': '17', 'Est': '17',
  'Job': '18', 'Job.': '18', 'Jb.': '18', 'Jb': '18',
  'Ps.': '19', 'Psa.': '19', 'Psalms': '19', 'Psalm': '19', 'Pss.': '19',
  'Prov.': '20', 'Proverbs': '20', 'Prov': '20', 'Prv.': '20', 'Prv': '20',
  'Eccl.': '21', 'Eccl': '21', 'Eccles.': '21', 'Eccles': '21', 'Ecc.': '21',
  'Song': '22', 'S.S.': '22', 'Song of Songs': '22', 'Song of Sol.': '22', 'SOS': '22',
  'Isa.': '23', 'Isa': '23', 'Is.': '23',
  'Jer.': '24', 'Jer': '24', 'Jr.': '24', 'Jr': '24',
  'Lam.': '25', 'Lam': '25', 'La.': '25',
  'Ezek.': '26', 'Ezek': '26', 'Eze.': '26', 'Eze': '26',
  'Dan.': '27', 'Dan': '27', 'Dn.': '27', 'Dn': '27',
  'Hos.': '28', 'Hos': '28', 'Ho.': '28', 'Ho': '28', 'Hosea': '28',
  'Joel': '29', 'Jl.': '29', 'Jl': '29',
  'Amos': '30', 'Am.': '30', 'Am': '30',
  'Obad.': '31', 'Obad': '31', 'Ob.': '31', 'Ob': '31', 'Obadiah': '31',
  'Jonah': '32', 'Jon.': '32', 'Jon': '32',
  'Mic.': '33', 'Mic': '33', 'Mi.': '33',
  'Nah.': '34', 'Nah': '34', 'Na.': '34', 'Nahum': '34',
  'Hab.': '35', 'Hab': '35', 'Hb.': '35', 'Hb': '35', 'Habakkuk': '35',
  'Zeph.': '36', 'Zeph': '36', 'Zep.': '36', 'Zep': '36', 'Zephaniah': '36',
  'Hag.': '37', 'Hag': '37', 'Hg.': '37', 'Hg': '37', 'Haggai': '37',
  'Zech.': '38', 'Zech': '38', 'Zc.': '38', 'Zc': '38', 'Zechariah': '38',
  'Mal.': '39', 'Mal': '39', 'Ml.': '39', 'Ml': '39', 'Malachi': '39',
  // New Testament
  'Matt.': '40', 'Matt': '40', 'Mt.': '40', 'Mt': '40', 'Matthew': '40',
  'Mark': '41', 'Mk.': '41', 'Mk': '41',
  'Luke': '42', 'Lk.': '42', 'Lk': '42',
  'John': '43', 'Jn.': '43', 'Jn': '43', 'Jhn.': '43', 'Jhn': '43',
  'Acts': '44', 'Ac.': '44', 'Ac': '44',
  'Rom.': '45', 'Rom': '45', 'Ro.': '45', 'Ro': '45', 'Romans': '45',
  '1 Cor.': '46', '1Cor.': '46', '1Cor': '46', '1Co.': '46', '1Co': '46',
  '2 Cor.': '47', '2Cor.': '47', '2Cor': '47', '2Co.': '47', '2Co': '47',
  'Gal.': '48', 'Gal': '48', 'Ga.': '48', 'Ga': '48', 'Galatians': '48',
  'Eph.': '49', 'Eph': '49', 'Ep.': '49', 'Ep': '49', 'Ephesians': '49',
  'Phil.': '50', 'Phil': '50', 'Php.': '50', 'Php': '50', 'Ph.': '50', 'Ph': '50', 'Philippians': '50',
  'Col.': '51', 'Col': '51', 'Cl.': '51', 'Cl': '51', 'Colossians': '51',
  '1 Thess.': '52', '1Thess.': '52', '1Thess': '52', '1Th.': '52', '1Th': '52',
  '2 Thess.': '53', '2Thess.': '53', '2Thess': '53', '2Th.': '53', '2Th': '53',
  '1 Tim.': '54', '1Tim.': '54', '1Tim': '54', '1Ti.': '54', '1Ti': '54',
  '2 Tim.': '55', '2Tim.': '55', '2Tim': '55', '2Ti.': '55', '2Ti': '55',
  'Titus': '56', 'Tit.': '56', 'Tit': '56', 'Ti.': '56', 'Ti': '56',
  'Phlm.': '57', 'Phlm': '57', 'Philem.': '57', 'Philem': '57', 'Philemon': '57',
  'Heb.': '58', 'Heb': '58', 'Hb': '58', 'Hebrews': '58',
  'James': '59', 'Jas.': '59', 'Jas': '59', 'Jm.': '59', 'Jm': '59',
  '1 Pet.': '60', '1Pet.': '60', '1Pet': '60', '1Pe.': '60', '1Pe': '60', '1 Pt.': '60',
  '2 Pet.': '61', '2Pet.': '61', '2Pet': '61', '2Pe.': '61', '2Pe': '61', '2 Pt.': '61',
  '1 John': '62', '1John': '62', '1Jn.': '62', '1Jn': '62', '1 Jn.': '62',
  '2 John': '63', '2John': '63', '2Jn.': '63', '2Jn': '63', '2 Jn.': '63',
  '3 John': '64', '3John': '64', '3Jn.': '64', '3Jn': '64', '3 Jn.': '64',
  'Jude': '65', 'Jud.': '65', 'Jud': '65', 'Jd.': '65', 'Jd': '65',
  'Rev.': '66', 'Rev': '66', 'Re.': '66', 'Re': '66', 'Rv.': '66', 'Rv': '66', 'Revelation': '66'
};

// ============================================
// Chinese Book Abbreviations
// ============================================

const CHINESE_BOOK_ABBREVIATIONS: Record<string, string> = {
  // Old Testament
  '創': '1', '創世記': '1',
  '出': '2', '出埃及記': '2',
  '利': '3', '利未記': '3',
  '民': '4', '民數記': '4',
  '申': '5', '申命記': '5',
  '書': '6', '約書亞記': '6',
  '士': '7', '士師記': '7',
  '得': '8', '路得記': '8',
  '撒上': '9', '撒母耳記上': '9',
  '撒下': '10', '撒母耳記下': '10',
  '王上': '11', '列王紀上': '11',
  '王下': '12', '列王紀下': '12',
  '代上': '13', '歷代志上': '13',
  '代下': '14', '歷代志下': '14',
  '拉': '15', '以斯拉記': '15',
  '尼': '16', '尼希米記': '16',
  '斯': '17', '以斯帖記': '17',
  '伯': '18', '約伯記': '18',
  '詩': '19', '詩篇': '19',
  '箴': '20', '箴言': '20',
  '傳': '21', '傳道書': '21',
  '歌': '22', '雅歌': '22',
  '賽': '23', '以賽亞書': '23',
  '耶': '24', '耶利米書': '24',
  '哀': '25', '耶利米哀歌': '25',
  '結': '26', '以西結書': '26',
  '但': '27', '但以理書': '27',
  '何': '28', '何西阿書': '28',
  '珥': '29', '約珥書': '29',
  '摩': '30', '阿摩司書': '30',
  '俄': '31', '俄巴底亞書': '31',
  '拿': '32', '約拿書': '32',
  '彌': '33', '彌迦書': '33',
  '鴻': '34', '那鴻書': '34',
  '哈': '35', '哈巴谷書': '35',
  '番': '36', '西番雅書': '36',
  '該': '37', '哈該書': '37',
  '亞': '38', '撒迦利亞書': '38',
  '瑪': '39', '瑪拉基書': '39',
  // New Testament
  '太': '40', '馬太福音': '40',
  '可': '41', '馬可福音': '41',
  '路': '42', '路加福音': '42',
  '約': '43', '約翰福音': '43',
  '徒': '44', '使徒行傳': '44',
  '羅': '45', '羅馬書': '45',
  '林前': '46', '哥林多前書': '46',
  '林後': '47', '哥林多後書': '47',
  '加': '48', '加拉太書': '48',
  '弗': '49', '以弗所書': '49',
  '腓': '50', '腓立比書': '50',
  '西': '51', '歌羅西書': '51',
  '帖前': '52', '帖撒羅尼迦前書': '52',
  '帖後': '53', '帖撒羅尼迦後書': '53',
  '提前': '54', '提摩太前書': '54',
  '提後': '55', '提摩太後書': '55',
  '多': '56', '提多書': '56',
  '門': '57', '腓利門書': '57',
  '來': '58', '希伯來書': '58',
  '雅': '59', '雅各書': '59',
  '彼前': '60', '彼得前書': '60',
  '彼後': '61', '彼得後書': '61',
  '約壹': '62', '約翰一書': '62', '約一': '62',
  '約貳': '63', '約翰二書': '63', '約二': '63',
  '約叁': '64', '約翰三書': '64', '約三': '64',
  '猶': '65', '猶大書': '65',
  '啟': '66', '啟示錄': '66'
};

// ============================================
// Chinese Numeral Conversion
// ============================================

const CHINESE_NUMERALS: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '廿': 20, '卅': 30, '卌': 40
};

/**
 * Convert Chinese numerals to Arabic numbers
 * Handles: 一, 二, 三... 十, 廿, 卅, and combinations like 十一, 二十三
 */
function chineseToNumber(str: string): number | null {
  if (!str) return null;
  
  // If already a number
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }
  
  let result = 0;
  let i = 0;
  
  // Handle special characters first
  if (str.startsWith('廿')) {
    result = 20;
    i = 1;
    if (str.length > 1 && CHINESE_NUMERALS[str[1]]) {
      result += CHINESE_NUMERALS[str[1]];
    }
  } else if (str.startsWith('卅')) {
    result = 30;
    i = 1;
    if (str.length > 1 && CHINESE_NUMERALS[str[1]]) {
      result += CHINESE_NUMERALS[str[1]];
    }
  } else {
    // Standard conversion
    const chars = str.split('');
    let hasTen = false;
    
    for (const char of chars) {
      const val = CHINESE_NUMERALS[char];
      if (val === undefined) continue;
      
      if (val === 10) {
        hasTen = true;
        if (result === 0) result = 10;
      } else if (hasTen && result >= 10) {
        result += val;
      } else {
        if (result > 0 && val < 10) {
          result = result * 10 + val;
        } else {
          result = val;
        }
      }
    }
  }
  
  return result > 0 ? result : null;
}

// ============================================
// Reference Parsing Functions
// ============================================

/**
 * Parse English Bible reference
 * Examples: "Gen. 1:1", "John 3:16-18", "Rom. 1:1, 3-5"
 */
function parseEnglishReference(text: string, startIndex: number): { ref: BibleReference; endIndex: number } | null {
  // Match book name (with optional period and space)
  const bookPattern = Object.keys(ENGLISH_BOOK_ABBREVIATIONS)
    .sort((a, b) => b.length - a.length) // Try longer matches first
    .map(b => b.replace(/\./g, '\\.?'))
    .join('|');
  
  const pattern = new RegExp(
    `(${bookPattern})\\s*(\\d+)\\s*:\\s*(\\d+)(?:\\s*[-–—]\\s*(\\d+))?`,
    'gi'
  );
  
  pattern.lastIndex = startIndex;
  const match = pattern.exec(text);
  
  if (!match) return null;
  
  const bookAbbr = match[1].replace(/\.$/, '').replace(/\s+/g, ' ');
  const bookId = ENGLISH_BOOK_ABBREVIATIONS[bookAbbr] || ENGLISH_BOOK_ABBREVIATIONS[bookAbbr + '.'];
  
  if (!bookId) return null;
  
  const chapter = parseInt(match[2], 10);
  const verseStart = parseInt(match[3], 10);
  const verseEnd = match[4] ? parseInt(match[4], 10) : undefined;
  
  return {
    ref: {
      bookId,
      chapter,
      verseStart,
      verseEnd,
      originalText: match[0]
    },
    endIndex: match.index + match[0].length
  };
}

/**
 * Parse Chinese Bible reference
 * Examples: "創一1", "約三16", "羅一1～3"
 */
function parseChineseReference(text: string, startIndex: number): { ref: BibleReference; endIndex: number } | null {
  // Match Chinese book abbreviations followed by chapter and verse
  const bookPattern = Object.keys(CHINESE_BOOK_ABBREVIATIONS)
    .sort((a, b) => b.length - a.length) // Try longer matches first
    .join('|');
  
  // Pattern: Book + Chapter(Chinese/Arabic) + Verse(Chinese/Arabic)
  // Examples: 創一1, 創世記1:1, 約三16, 羅一1～3
  const pattern = new RegExp(
    `(${bookPattern})([一二三四五六七八九十百千\\d]+)[章篇]?[:：]?([一二三四五六七八九十廿卅百千\\d]+)(?:[-–—～~至]([一二三四五六七八九十廿卅百千\\d]+))?`,
    'g'
  );
  
  pattern.lastIndex = startIndex;
  const match = pattern.exec(text);
  
  if (!match) return null;
  
  const bookName = match[1];
  const bookId = CHINESE_BOOK_ABBREVIATIONS[bookName];
  
  if (!bookId) return null;
  
  const chapter = chineseToNumber(match[2]) || parseInt(match[2], 10);
  const verseStart = chineseToNumber(match[3]) || parseInt(match[3], 10);
  const verseEnd = match[4] ? (chineseToNumber(match[4]) || parseInt(match[4], 10)) : undefined;
  
  if (isNaN(chapter) || isNaN(verseStart)) return null;
  
  return {
    ref: {
      bookId,
      chapter,
      verseStart,
      verseEnd,
      originalText: match[0]
    },
    endIndex: match.index + match[0].length
  };
}

/**
 * Parse all Bible references in text
 * Handles both English and Chinese references
 */
export function parseBibleReferences(text: string): BibleReference[] {
  const refs: BibleReference[] = [];
  let index = 0;
  
  while (index < text.length) {
    // Try English pattern first
    const enResult = parseEnglishReference(text, index);
    if (enResult) {
      refs.push(enResult.ref);
      index = enResult.endIndex;
      continue;
    }
    
    // Try Chinese pattern
    const zhResult = parseChineseReference(text, index);
    if (zhResult) {
      refs.push(zhResult.ref);
      index = zhResult.endIndex;
      continue;
    }
    
    index++;
  }
  
  return refs;
}

/**
 * Find all Bible references with their positions in text
 */
export interface ReferenceMatch {
  ref: BibleReference;
  startIndex: number;
  endIndex: number;
}

export function findBibleReferences(text: string): ReferenceMatch[] {
  const matches: ReferenceMatch[] = [];
  let index = 0;
  
  while (index < text.length) {
    // Try English pattern first
    const enResult = parseEnglishReference(text, index);
    if (enResult) {
      matches.push({
        ref: enResult.ref,
        startIndex: index,
        endIndex: enResult.endIndex
      });
      index = enResult.endIndex;
      continue;
    }
    
    // Try Chinese pattern
    const zhResult = parseChineseReference(text, index);
    if (zhResult) {
      matches.push({
        ref: zhResult.ref,
        startIndex: index,
        endIndex: zhResult.endIndex
      });
      index = zhResult.endIndex;
      continue;
    }
    
    index++;
  }
  
  return matches;
}

/**
 * Get display name for a book
 */
export function getBookDisplayName(bookId: string, language: 'english' | 'chinese' | 'simplified'): string {
  const book = bookNamesMap[bookId];
  if (!book) return `Book ${bookId}`;
  
  switch (language) {
    case 'english':
      return book.english;
    case 'simplified':
      return book.chineseSimplified;
    case 'chinese':
    default:
      return book.chinese;
  }
}

/**
 * Format a Bible reference for display
 */
export function formatBibleReference(ref: BibleReference, language: 'english' | 'chinese' | 'simplified'): string {
  const bookName = getBookDisplayName(ref.bookId, language);
  
  if (ref.verseEnd) {
    return `${bookName} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
  }
  
  return `${bookName} ${ref.chapter}:${ref.verseStart}`;
}

/**
 * Create a unique key for a Bible reference (for use as React key or cache key)
 */
export function getReferenceKey(ref: BibleReference): string {
  if (ref.verseEnd) {
    return `${ref.bookId}-${ref.chapter}-${ref.verseStart}-${ref.verseEnd}`;
  }
  return `${ref.bookId}-${ref.chapter}-${ref.verseStart}`;
}