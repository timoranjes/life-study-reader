/**
 * Bible Scraper for Recovery Version (Traditional Chinese & English)
 * 
 * Sources:
 * - English: https://text.recoveryversion.bible/
 * - Chinese: https://line.twgbr.org/recoveryversion/bible/
 * 
 * Usage:
 *   node scripts/crawler-bible.js [--lang=en|zh] [--book=1-66] [--test]
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Configuration
const DATA_DIR = path.join(__dirname, '../src/data/bible');
const PROGRESS_FILE = path.join(__dirname, '../progress-bible.json');

// Source URLs
const EN_BASE_URL = 'https://text.recoveryversion.bible';
const ZH_BASE_URL = 'https://line.twgbr.org/recoveryversion/bible';

// Book information mapping (bookId -> {enName, zhName, enNum, zhNum, chapters})
const BOOK_INFO = {
  '1': { enName: 'Genesis', zhName: '創世記', enNum: '01', chapters: 50 },
  '2': { enName: 'Exodus', zhName: '出埃及記', enNum: '02', chapters: 40 },
  '3': { enName: 'Leviticus', zhName: '利未記', enNum: '03', chapters: 27 },
  '4': { enName: 'Numbers', zhName: '民數記', enNum: '04', chapters: 36 },
  '5': { enName: 'Deuteronomy', zhName: '申命記', enNum: '05', chapters: 34 },
  '6': { enName: 'Joshua', zhName: '約書亞記', enNum: '06', chapters: 24 },
  '7': { enName: 'Judges', zhName: '士師記', enNum: '07', chapters: 21 },
  '8': { enName: 'Ruth', zhName: '路得記', enNum: '08', chapters: 4 },
  '9': { enName: '1_Samuel', zhName: '撒母耳記上', enNum: '09', chapters: 31 },
  '10': { enName: '2_Samuel', zhName: '撒母耳記下', enNum: '10', chapters: 24 },
  '11': { enName: '1_Kings', zhName: '列王紀上', enNum: '11', chapters: 22 },
  '12': { enName: '2_Kings', zhName: '列王紀下', enNum: '12', chapters: 25 },
  '13': { enName: '1_Chronicles', zhName: '歷代志上', enNum: '13', chapters: 29 },
  '14': { enName: '2_Chronicles', zhName: '歷代志下', enNum: '14', chapters: 36 },
  '15': { enName: 'Ezra', zhName: '以斯拉記', enNum: '15', chapters: 10 },
  '16': { enName: 'Nehemiah', zhName: '尼希米記', enNum: '16', chapters: 13 },
  '17': { enName: 'Esther', zhName: '以斯帖記', enNum: '17', chapters: 10 },
  '18': { enName: 'Job', zhName: '約伯記', enNum: '18', chapters: 42 },
  '19': { enName: 'Psalms', zhName: '詩篇', enNum: '19', chapters: 150 },
  '20': { enName: 'Proverbs', zhName: '箴言', enNum: '20', chapters: 31 },
  '21': { enName: 'Ecclesiastes', zhName: '傳道書', enNum: '21', chapters: 12 },
  '22': { enName: 'Song_of_Songs', zhName: '雅歌', enNum: '22', chapters: 8 },
  '23': { enName: 'Isaiah', zhName: '以賽亞書', enNum: '23', chapters: 66 },
  '24': { enName: 'Jeremiah', zhName: '耶利米書', enNum: '24', chapters: 52 },
  '25': { enName: 'Lamentations', zhName: '耶利米哀歌', enNum: '25', chapters: 5 },
  '26': { enName: 'Ezekiel', zhName: '以西結書', enNum: '26', chapters: 48 },
  '27': { enName: 'Daniel', zhName: '但以理書', enNum: '27', chapters: 12 },
  '28': { enName: 'Hosea', zhName: '何西阿書', enNum: '28', chapters: 14 },
  '29': { enName: 'Joel', zhName: '約珥書', enNum: '29', chapters: 3 },
  '30': { enName: 'Amos', zhName: '阿摩司書', enNum: '30', chapters: 9 },
  '31': { enName: 'Obadiah', zhName: '俄巴底亞書', enNum: '31', chapters: 1 },
  '32': { enName: 'Jonah', zhName: '約拿書', enNum: '32', chapters: 4 },
  '33': { enName: 'Micah', zhName: '彌迦書', enNum: '33', chapters: 7 },
  '34': { enName: 'Nahum', zhName: '那鴻書', enNum: '34', chapters: 3 },
  '35': { enName: 'Habakkuk', zhName: '哈巴谷書', enNum: '35', chapters: 3 },
  '36': { enName: 'Zephaniah', zhName: '西番雅書', enNum: '36', chapters: 3 },
  '37': { enName: 'Haggai', zhName: '哈該書', enNum: '37', chapters: 2 },
  '38': { enName: 'Zechariah', zhName: '撒迦利亞書', enNum: '38', chapters: 14 },
  '39': { enName: 'Malachi', zhName: '瑪拉基書', enNum: '39', chapters: 4 },
  '40': { enName: 'Matthew', zhName: '馬太福音', enNum: '40', chapters: 28 },
  '41': { enName: 'Mark', zhName: '馬可福音', enNum: '41', chapters: 16 },
  '42': { enName: 'Luke', zhName: '路加福音', enNum: '42', chapters: 24 },
  '43': { enName: 'John', zhName: '約翰福音', enNum: '43', chapters: 21 },
  '44': { enName: 'Acts', zhName: '使徒行傳', enNum: '44', chapters: 28 },
  '45': { enName: 'Romans', zhName: '羅馬書', enNum: '45', chapters: 16 },
  '46': { enName: '1_Corinthians', zhName: '哥林多前書', enNum: '46', chapters: 16 },
  '47': { enName: '2_Corinthians', zhName: '哥林多後書', enNum: '47', chapters: 13 },
  '48': { enName: 'Galatians', zhName: '加拉太書', enNum: '48', chapters: 6 },
  '49': { enName: 'Ephesians', zhName: '以弗所書', enNum: '49', chapters: 6 },
  '50': { enName: 'Philippians', zhName: '腓立比書', enNum: '50', chapters: 4 },
  '51': { enName: 'Colossians', zhName: '歌羅西書', enNum: '51', chapters: 4 },
  '52': { enName: '1_Thessalonians', zhName: '帖撒羅尼迦前書', enNum: '52', chapters: 5 },
  '53': { enName: '2_Thessalonians', zhName: '帖撒羅尼迦後書', enNum: '53', chapters: 3 },
  '54': { enName: '1_Timothy', zhName: '提摩太前書', enNum: '54', chapters: 6 },
  '55': { enName: '2_Timothy', zhName: '提摩太後書', enNum: '55', chapters: 4 },
  '56': { enName: 'Titus', zhName: '提多書', enNum: '56', chapters: 3 },
  '57': { enName: 'Philemon', zhName: '腓利門書', enNum: '57', chapters: 1 },
  '58': { enName: 'Hebrews', zhName: '希伯來書', enNum: '58', chapters: 13 },
  '59': { enName: 'James', zhName: '雅各書', enNum: '59', chapters: 5 },
  '60': { enName: '1_Peter', zhName: '彼得前書', enNum: '60', chapters: 5 },
  '61': { enName: '2_Peter', zhName: '彼得後書', enNum: '61', chapters: 3 },
  '62': { enName: '1_John', zhName: '約翰壹書', enNum: '62', chapters: 5 },
  '63': { enName: '2_John', zhName: '約翰貳書', enNum: '63', chapters: 1 },
  '64': { enName: '3_John', zhName: '約翰叁書', enNum: '64', chapters: 1 },
  '65': { enName: 'Jude', zhName: '猶大書', enNum: '65', chapters: 1 },
  '66': { enName: 'Revelation', zhName: '啟示錄', enNum: '66', chapters: 22 }
};

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load/save progress
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      return data;
    } catch (e) {
      return { english: [], chinese: [] };
    }
  }
  return { english: [], chinese: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Scrape English Bible from text.recoveryversion.bible
 */
async function scrapeEnglishBook(bookId) {
  const book = BOOK_INFO[bookId];
  if (!book) {
    console.error(`❌ Unknown book ID: ${bookId}`);
    return null;
  }

  console.log(`📖 Scraping English ${book.enName} (${bookId}/66)...`);
  
  const chapters = [];
  
  for (let chapter = 1; chapter <= book.chapters; chapter++) {
    const url = `${EN_BASE_URL}/${book.enNum}_${book.enName}_${chapter}.htm`;
    
    try {
      console.log(`  📄 Chapter ${chapter}/${book.chapters}: ${url}`);
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      const verses = [];
      
      // Find all verse paragraphs
      $('p.verse').each((i, el) => {
        const $el = $(el);
        const id = $el.attr('id') || '';
        
        // Extract verse number from id (e.g., "Gen1-1" -> 1)
        const verseMatch = id.match(/(\d+)$/);
        if (!verseMatch) return;
        
        const verseNum = parseInt(verseMatch[1], 10);
        
        // Get the full text and remove the reference prefix (e.g., "Gen. 1:1 ")
        let text = $el.text().trim();
        // Remove verse reference prefix like "Gen. 1:1 " or "Gen. 1:1"
        text = text.replace(/^[A-Za-z0-9_.\s]+:\d+\s*/i, '');
        
        if (text) {
          verses.push({
            verse: verseNum,
            text: text
          });
        }
      });
      
      if (verses.length > 0) {
        chapters.push({
          chapter: chapter,
          verses: verses
        });
      }
      
      // Rate limiting
      await sleep(200);
      
    } catch (error) {
      console.error(`  ❌ Failed to fetch chapter ${chapter}: ${error.message}`);
      // Continue with next chapter
    }
  }
  
  if (chapters.length === 0) {
    console.error(`❌ No chapters found for ${book.enName}`);
    return null;
  }
  
  return {
    bookId: bookId,
    bookName: book.enName,
    language: 'english',
    chapters: chapters
  };
}

/**
 * Scrape Chinese Bible from line.twgbr.org
 * The Chinese site has all chapters on a single page per book
 */
async function scrapeChineseBook(bookId) {
  const book = BOOK_INFO[bookId];
  if (!book) {
    console.error(`❌ Unknown book ID: ${bookId}`);
    return null;
  }

  console.log(`📖 Scraping Chinese ${book.zhName} (${bookId}/66)...`);
  
  // Chinese site has all chapters in one page
  const url = `${ZH_BASE_URL}/${bookId.toString().padStart(2, '0')}.html`;
  
  try {
    console.log(`  📄 Fetching: ${url}`);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const chapters = [];
    let currentChapter = 0;
    let currentVerses = [];
    
    // Process the content
    // Chapters are marked by <h3 id="C1Gen">創世記 第 1 章</h3>
    // Verses are in <p class="calibre2"><sup>1</sup>text</p>
    
    // Find all chapter headers and verse paragraphs
    const contentElements = $('#verses').find('h3, p.calibre2');
    
    contentElements.each((i, el) => {
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();
      
      if (tagName === 'h3') {
        // Save previous chapter if exists
        if (currentChapter > 0 && currentVerses.length > 0) {
          chapters.push({
            chapter: currentChapter,
            verses: currentVerses
          });
        }
        
        // Extract chapter number from header like "創世記 第 1 章"
        const headerText = $el.text();
        const chapterMatch = headerText.match(/第\s*(\d+)\s*章/);
        if (chapterMatch) {
          currentChapter = parseInt(chapterMatch[1], 10);
          currentVerses = [];
        }
      } else if (tagName === 'p' && currentChapter > 0) {
        // Parse verses from paragraph
        // Format: <sup>1</sup>text<sup>2</sup>text...
        const html = $el.html();
        if (!html) return;
        
        // Split by <sup> tags
        const parts = html.split(/<sup>(\d+)<\/sup>/);
        
        // parts will be: ['', '1', 'verse text', '2', 'verse text', ...]
        for (let j = 1; j < parts.length; j += 2) {
          const verseNum = parseInt(parts[j], 10);
          let verseText = parts[j + 1] || '';
          
          // Clean up HTML entities and tags
          verseText = verseText
            .replace(/<[^>]+>/g, '')  // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .trim();
          
          if (verseText && verseNum) {
            currentVerses.push({
              verse: verseNum,
              text: verseText
            });
          }
        }
      }
    });
    
    // Save last chapter
    if (currentChapter > 0 && currentVerses.length > 0) {
      chapters.push({
        chapter: currentChapter,
        verses: currentVerses
      });
    }
    
    if (chapters.length === 0) {
      console.error(`❌ No chapters found for ${book.zhName}`);
      return null;
    }
    
    console.log(`  ✅ Found ${chapters.length} chapters`);
    
    return {
      bookId: bookId,
      bookName: book.zhName,
      language: 'chinese',
      chapters: chapters
    };
    
  } catch (error) {
    console.error(`❌ Failed to fetch ${book.zhName}: ${error.message}`);
    return null;
  }
}

/**
 * Save Bible data to JSON file
 */
function saveBibleData(data, language) {
  if (!data) return false;
  
  const suffix = language === 'english' ? '_en' : '';
  const filename = `${data.bookId}${suffix}.json`;
  const filepath = path.join(DATA_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  💾 Saved: ${filename}`);
  
  return true;
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const langArg = args.find(a => a.startsWith('--lang='));
  const bookArg = args.find(a => a.startsWith('--book='));
  const isTest = args.includes('--test');
  
  const lang = langArg ? langArg.split('=')[1] : 'all';  // 'en', 'zh', or 'all'
  const bookId = bookArg ? bookArg.split('=')[1] : null;  // specific book ID or null for all
  
  console.log('========================================');
  console.log('📖 Bible Scraper - Recovery Version');
  console.log('========================================\n');
  
  const progress = loadProgress();
  
  // Determine which books to process
  let bookIds = [];
  if (bookId) {
    bookIds = [bookId];
  } else {
    bookIds = Object.keys(BOOK_INFO);
  }
  
  // Test mode: only process Genesis
  if (isTest) {
    bookIds = ['1'];
    console.log('🧪 Test mode: Only processing Genesis\n');
  }
  
  // Process English books
  if (lang === 'all' || lang === 'en') {
    console.log('\n📚 Processing English Bible...\n');
    for (const id of bookIds) {
      if (progress.english.includes(id)) {
        console.log(`⏭️ Skipping ${id} (already completed)`);
        continue;
      }
      
      const data = await scrapeEnglishBook(id);
      if (data) {
        saveBibleData(data, 'english');
        progress.english.push(id);
        saveProgress(progress);
      }
      
      await sleep(500);  // Rate limiting between books
    }
  }
  
  // Process Chinese books
  if (lang === 'all' || lang === 'zh') {
    console.log('\n📚 Processing Chinese Bible...\n');
    for (const id of bookIds) {
      if (progress.chinese.includes(id)) {
        console.log(`⏭️ Skipping ${id} (already completed)`);
        continue;
      }
      
      const data = await scrapeChineseBook(id);
      if (data) {
        saveBibleData(data, 'chinese');
        progress.chinese.push(id);
        saveProgress(progress);
      }
      
      await sleep(500);  // Rate limiting between books
    }
  }
  
  console.log('\n========================================');
  console.log('✅ Bible scraping complete!');
  console.log(`📊 English: ${progress.english.length}/66 books`);
  console.log(`📊 Chinese: ${progress.chinese.length}/66 books`);
  console.log('========================================\n');
}

// Run the scraper
main().catch(console.error);