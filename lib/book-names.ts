// Book name mapping for multi-language support
// Keys are book IDs (as strings)

export interface BookNames {
  english: string
  chinese: string
  chineseSimplified: string
  englishShort: string
  chineseShort: string
  chineseShortSimplified: string
}

export const bookNamesMap: Record<string, BookNames> = {
  "1": { english: "Genesis", chinese: "創世記", chineseSimplified: "创世记", englishShort: "Gen.", chineseShort: "創", chineseShortSimplified: "创" },
  "2": { english: "Exodus", chinese: "出埃及記", chineseSimplified: "出埃及记", englishShort: "Exo.", chineseShort: "出", chineseShortSimplified: "出" },
  "3": { english: "Leviticus", chinese: "利未記", chineseSimplified: "利未记", englishShort: "Lev.", chineseShort: "利", chineseShortSimplified: "利" },
  "4": { english: "Numbers", chinese: "民數記", chineseSimplified: "民数记", englishShort: "Num.", chineseShort: "民", chineseShortSimplified: "民" },
  "5": { english: "Deuteronomy", chinese: "申命記", chineseSimplified: "申命记", englishShort: "Deut.", chineseShort: "申", chineseShortSimplified: "申" },
  "6": { english: "Joshua", chinese: "約書亞記", chineseSimplified: "约书亚记", englishShort: "Josh.", chineseShort: "書", chineseShortSimplified: "书" },
  "7": { english: "Judges", chinese: "士師記", chineseSimplified: "士师记", englishShort: "Judg.", chineseShort: "士", chineseShortSimplified: "士" },
  "8": { english: "Ruth", chinese: "路得記", chineseSimplified: "路得记", englishShort: "Ruth", chineseShort: "得", chineseShortSimplified: "得" },
  "9": { english: "1 Samuel", chinese: "撒母耳記上", chineseSimplified: "撒母耳记上", englishShort: "1 Sam.", chineseShort: "撒上", chineseShortSimplified: "撒上" },
  "10": { english: "2 Samuel", chinese: "撒母耳記下", chineseSimplified: "撒母耳记下", englishShort: "2 Sam.", chineseShort: "撒下", chineseShortSimplified: "撒下" },
  "11": { english: "1 Kings", chinese: "列王紀上", chineseSimplified: "列王纪上", englishShort: "1 Kings", chineseShort: "王上", chineseShortSimplified: "王上" },
  "12": { english: "2 Kings", chinese: "列王紀下", chineseSimplified: "列王纪下", englishShort: "2 Kings", chineseShort: "王下", chineseShortSimplified: "王下" },
  "13": { english: "1 Chronicles", chinese: "歷代志上", chineseSimplified: "历代志上", englishShort: "1 Chron.", chineseShort: "代上", chineseShortSimplified: "代上" },
  "14": { english: "2 Chronicles", chinese: "歷代志下", chineseSimplified: "历代志下", englishShort: "2 Chron.", chineseShort: "代下", chineseShortSimplified: "代下" },
  "15": { english: "Ezra", chinese: "以斯拉記", chineseSimplified: "以斯拉记", englishShort: "Ezra", chineseShort: "拉", chineseShortSimplified: "拉" },
  "16": { english: "Nehemiah", chinese: "尼希米記", chineseSimplified: "尼希米记", englishShort: "Neh.", chineseShort: "尼", chineseShortSimplified: "尼" },
  "17": { english: "Esther", chinese: "以斯帖記", chineseSimplified: "以斯帖记", englishShort: "Esth.", chineseShort: "斯", chineseShortSimplified: "斯" },
  "18": { english: "Job", chinese: "約伯記", chineseSimplified: "约伯记", englishShort: "Job", chineseShort: "伯", chineseShortSimplified: "伯" },
  "19": { english: "Psalms", chinese: "詩篇", chineseSimplified: "诗篇", englishShort: "Ps.", chineseShort: "詩", chineseShortSimplified: "诗" },
  "20": { english: "Proverbs", chinese: "箴言", chineseSimplified: "箴言", englishShort: "Prov.", chineseShort: "箴", chineseShortSimplified: "箴" },
  "21": { english: "Ecclesiastes", chinese: "傳道書", chineseSimplified: "传道书", englishShort: "Eccl.", chineseShort: "傳", chineseShortSimplified: "传" },
  "22": { english: "Song of Songs", chinese: "雅歌", chineseSimplified: "雅歌", englishShort: "Song", chineseShort: "歌", chineseShortSimplified: "歌" },
  "23": { english: "Isaiah", chinese: "以賽亞書", chineseSimplified: "以赛亚书", englishShort: "Isa.", chineseShort: "賽", chineseShortSimplified: "赛" },
  "24": { english: "Jeremiah", chinese: "耶利米書", chineseSimplified: "耶利米书", englishShort: "Jer.", chineseShort: "耶", chineseShortSimplified: "耶" },
  "25": { english: "Lamentations", chinese: "耶利米哀歌", chineseSimplified: "耶利米哀歌", englishShort: "Lam.", chineseShort: "哀", chineseShortSimplified: "哀" },
  "26": { english: "Ezekiel", chinese: "以西結書", chineseSimplified: "以西结书", englishShort: "Ezek.", chineseShort: "結", chineseShortSimplified: "结" },
  "27": { english: "Daniel", chinese: "但以理書", chineseSimplified: "但以理书", englishShort: "Dan.", chineseShort: "但", chineseShortSimplified: "但" },
  "28": { english: "Hosea", chinese: "何西阿書", chineseSimplified: "何西阿书", englishShort: "Hos.", chineseShort: "何", chineseShortSimplified: "何" },
  "29": { english: "Joel", chinese: "約珥書", chineseSimplified: "约珥书", englishShort: "Joel", chineseShort: "珥", chineseShortSimplified: "珥" },
  "30": { english: "Amos", chinese: "阿摩司書", chineseSimplified: "阿摩司书", englishShort: "Amos", chineseShort: "摩", chineseShortSimplified: "摩" },
  "31": { english: "Obadiah", chinese: "俄巴底亞書", chineseSimplified: "俄巴底亚书", englishShort: "Obad.", chineseShort: "俄", chineseShortSimplified: "俄" },
  "32": { english: "Jonah", chinese: "約拿書", chineseSimplified: "约拿书", englishShort: "Jonah", chineseShort: "拿", chineseShortSimplified: "拿" },
  "33": { english: "Micah", chinese: "彌迦書", chineseSimplified: "弥迦书", englishShort: "Mic.", chineseShort: "彌", chineseShortSimplified: "弥" },
  "34": { english: "Nahum", chinese: "那鴻書", chineseSimplified: "那鸿书", englishShort: "Nah.", chineseShort: "鴻", chineseShortSimplified: "鸿" },
  "35": { english: "Habakkuk", chinese: "哈巴谷書", chineseSimplified: "哈巴谷书", englishShort: "Hab.", chineseShort: "哈", chineseShortSimplified: "哈" },
  "36": { english: "Zephaniah", chinese: "西番雅書", chineseSimplified: "西番雅书", englishShort: "Zeph.", chineseShort: "番", chineseShortSimplified: "番" },
  "37": { english: "Haggai", chinese: "哈該書", chineseSimplified: "哈该书", englishShort: "Hag.", chineseShort: "該", chineseShortSimplified: "该" },
  "38": { english: "Zechariah", chinese: "撒迦利亞書", chineseSimplified: "撒迦利亚书", englishShort: "Zech.", chineseShort: "亞", chineseShortSimplified: "亚" },
  "39": { english: "Malachi", chinese: "瑪拉基書", chineseSimplified: "玛拉基书", englishShort: "Mal.", chineseShort: "瑪", chineseShortSimplified: "玛" },
  "40": { english: "Matthew", chinese: "馬太福音", chineseSimplified: "马太福音", englishShort: "Matt.", chineseShort: "太", chineseShortSimplified: "太" },
  "41": { english: "Mark", chinese: "馬可福音", chineseSimplified: "马可福音", englishShort: "Mark", chineseShort: "可", chineseShortSimplified: "可" },
  "42": { english: "Luke", chinese: "路加福音", chineseSimplified: "路加福音", englishShort: "Luke", chineseShort: "路", chineseShortSimplified: "路" },
  "43": { english: "John", chinese: "約翰福音", chineseSimplified: "约翰福音", englishShort: "John", chineseShort: "約", chineseShortSimplified: "约" },
  "44": { english: "Acts", chinese: "使徒行傳", chineseSimplified: "使徒行传", englishShort: "Acts", chineseShort: "徒", chineseShortSimplified: "徒" },
  "45": { english: "Romans", chinese: "羅馬書", chineseSimplified: "罗马书", englishShort: "Rom.", chineseShort: "羅", chineseShortSimplified: "罗" },
  "46": { english: "1 Corinthians", chinese: "哥林多前書", chineseSimplified: "哥林多前书", englishShort: "1 Cor.", chineseShort: "林前", chineseShortSimplified: "林前" },
  "47": { english: "2 Corinthians", chinese: "哥林多後書", chineseSimplified: "哥林多后书", englishShort: "2 Cor.", chineseShort: "林後", chineseShortSimplified: "林后" },
  "48": { english: "Galatians", chinese: "加拉太書", chineseSimplified: "加拉太书", englishShort: "Gal.", chineseShort: "加", chineseShortSimplified: "加" },
  "49": { english: "Ephesians", chinese: "以弗所書", chineseSimplified: "以弗所书", englishShort: "Eph.", chineseShort: "弗", chineseShortSimplified: "弗" },
  "50": { english: "Philippians", chinese: "腓立比書", chineseSimplified: "腓立比书", englishShort: "Phil.", chineseShort: "腓", chineseShortSimplified: "腓" },
  "51": { english: "Colossians", chinese: "歌羅西書", chineseSimplified: "歌罗西书", englishShort: "Col.", chineseShort: "西", chineseShortSimplified: "西" },
  "52": { english: "1 Thessalonians", chinese: "帖撒羅尼迦前書", chineseSimplified: "帖撒罗尼迦前书", englishShort: "1 Thess.", chineseShort: "帖前", chineseShortSimplified: "帖前" },
  "53": { english: "2 Thessalonians", chinese: "帖撒羅尼迦後書", chineseSimplified: "帖撒罗尼迦后书", englishShort: "2 Thess.", chineseShort: "帖後", chineseShortSimplified: "帖后" },
  "54": { english: "1 Timothy", chinese: "提摩太前書", chineseSimplified: "提摩太前书", englishShort: "1 Tim.", chineseShort: "提前", chineseShortSimplified: "提前" },
  "55": { english: "2 Timothy", chinese: "提摩太後書", chineseSimplified: "提摩太后书", englishShort: "2 Tim.", chineseShort: "提後", chineseShortSimplified: "提后" },
  "56": { english: "Titus", chinese: "提多書", chineseSimplified: "提多书", englishShort: "Titus", chineseShort: "多", chineseShortSimplified: "多" },
  "57": { english: "Philemon", chinese: "腓利門書", chineseSimplified: "腓利门书", englishShort: "Phlm.", chineseShort: "門", chineseShortSimplified: "门" },
  "58": { english: "Hebrews", chinese: "希伯來書", chineseSimplified: "希伯来书", englishShort: "Heb.", chineseShort: "來", chineseShortSimplified: "来" },
  "59": { english: "James", chinese: "雅各書", chineseSimplified: "雅各书", englishShort: "James", chineseShort: "雅", chineseShortSimplified: "雅" },
  "60": { english: "1 Peter", chinese: "彼得前書", chineseSimplified: "彼得前书", englishShort: "1 Pet.", chineseShort: "彼前", chineseShortSimplified: "彼前" },
  "61": { english: "2 Peter", chinese: "彼得後書", chineseSimplified: "彼得后书", englishShort: "2 Pet.", chineseShort: "彼後", chineseShortSimplified: "彼后" },
  "62": { english: "1 John", chinese: "約翰一書", chineseSimplified: "约翰一书", englishShort: "1 John", chineseShort: "約壹", chineseShortSimplified: "约壹" },
  "63": { english: "2 John", chinese: "約翰二書", chineseSimplified: "约翰二书", englishShort: "2 John", chineseShort: "約貳", chineseShortSimplified: "约贰" },
  "64": { english: "3 John", chinese: "約翰三書", chineseSimplified: "约翰三书", englishShort: "3 John", chineseShort: "約參", chineseShortSimplified: "约叁" },
  "65": { english: "Jude", chinese: "猶大書", chineseSimplified: "犹大书", englishShort: "Jude", chineseShort: "猶", chineseShortSimplified: "犹" },
  "66": { english: "Revelation", chinese: "啟示錄", chineseSimplified: "启示录", englishShort: "Rev.", chineseShort: "啟", chineseShortSimplified: "启" },
}

// Get full book name by language
export function getBookName(bookId: string, language: string, chineseName: string): string {
  const book = bookNamesMap[bookId]
  if (!book) return chineseName
  if (language === "english") return book.english
  if (language === "simplified") return book.chineseSimplified
  return book.chinese
}

// Get short book name by language
export function getBookShortName(bookId: string, language: string, chineseName: string): string {
  const book = bookNamesMap[bookId]
  if (!book) {
    // Fallback: use first character for Chinese, or full name
    if (language === "english") return chineseName
    return chineseName.charAt(0)
  }
  if (language === "english") return book.englishShort
  if (language === "simplified") return book.chineseShortSimplified
  return book.chineseShort
}