const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../src/data/life-study');
const PROGRESS_FILE = path.join(__dirname, '../progress-en.json');
const BASE_URL = 'https://bibleread.online/life-study-of-the-bible/';

// Book ID to English name mapping (URL-friendly format)
const BOOK_NAMES = {
    "1": "genesis",
    "2": "exodus",
    "3": "leviticus",
    "4": "numbers",
    "5": "deuteronomy",
    "6": "joshua",
    "7": "judges",
    "8": "ruth",
    "9": "1-samuel",
    "10": "2-samuel",
    "11": "1-kings",
    "12": "2-kings",
    "13": "1-chronicles",
    "14": "2-chronicles",
    "15": "ezra",
    "16": "nehemiah",
    "17": "esther",
    "18": "job",
    "19": "psalms",
    "20": "proverbs",
    "21": "ecclesiastes",
    "22": "song-of-songs",
    "23": "isaiah",
    "24": "jeremiah",
    "25": "lamentations",
    "26": "ezekiel",
    "27": "daniel",
    "28": "hosea",
    "29": "joel",
    "30": "amos",
    "31": "obadiah",
    "32": "jonah",
    "33": "micah",
    "34": "nahum",
    "35": "habakkuk",
    "36": "zephaniah",
    "37": "haggai",
    "38": "zechariah",
    "39": "malachi",
    "40": "matthew",
    "41": "mark",
    "42": "luke",
    "43": "john",
    "44": "acts",
    "45": "romans",
    "46": "1-corinthians",
    "47": "2-corinthians",
    "48": "galatians",
    "49": "ephesians",
    "50": "philippians",
    "51": "colossians",
    "52": "1-thessalonians",
    "53": "2-thessalonians",
    "54": "1-timothy",
    "55": "2-timothy",
    "56": "titus",
    "57": "philemon",
    "58": "hebrews",
    "59": "james",
    "60": "1-peter",
    "61": "2-peter",
    "62": "1-john",
    "63": "2-john",
    "64": "3-john",
    "65": "jude",
    "66": "revelation"
};

// Display names for console output
const DISPLAY_NAMES = {
    "1": "Genesis",
    "2": "Exodus",
    "3": "Leviticus",
    "4": "Numbers",
    "5": "Deuteronomy",
    "6": "Joshua",
    "7": "Judges",
    "8": "Ruth",
    "9": "1 Samuel",
    "10": "2 Samuel",
    "11": "1 Kings",
    "12": "2 Kings",
    "13": "1 Chronicles",
    "14": "2 Chronicles",
    "15": "Ezra",
    "16": "Nehemiah",
    "17": "Esther",
    "18": "Job",
    "19": "Psalms",
    "20": "Proverbs",
    "21": "Ecclesiastes",
    "22": "Song of Songs",
    "23": "Isaiah",
    "24": "Jeremiah",
    "25": "Lamentations",
    "26": "Ezekiel",
    "27": "Daniel",
    "28": "Hosea",
    "29": "Joel",
    "30": "Amos",
    "31": "Obadiah",
    "32": "Jonah",
    "33": "Micah",
    "34": "Nahum",
    "35": "Habakkuk",
    "36": "Zephaniah",
    "37": "Haggai",
    "38": "Zechariah",
    "39": "Malachi",
    "40": "Matthew",
    "41": "Mark",
    "42": "Luke",
    "43": "John",
    "44": "Acts",
    "45": "Romans",
    "46": "1 Corinthians",
    "47": "2 Corinthians",
    "48": "Galatians",
    "49": "Ephesians",
    "50": "Philippians",
    "51": "Colossians",
    "52": "1 Thessalonians",
    "53": "2 Thessalonians",
    "54": "1 Timothy",
    "55": "2 Timothy",
    "56": "Titus",
    "57": "Philemon",
    "58": "Hebrews",
    "59": "James",
    "60": "1 Peter",
    "61": "2 Peter",
    "62": "1 John",
    "63": "2 John",
    "64": "3 John",
    "65": "Jude",
    "66": "Revelation"
};

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
            return Array.isArray(data) ? data : [];
        } catch (e) { return []; }
    }
    return [];
}

function saveProgress(completedBooks) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(completedBooks, null, 2));
}

function getExistingEnglishBooks() {
    const files = fs.readdirSync(DATA_DIR);
    return files
        .filter(f => f.endsWith('_en.json'))
        .map(f => f.replace('_en.json', ''));
}

// Helper function to check if an element is a standalone part number
function isPartNumber(item) {
    return item.tagName === 'p' &&
           item.$el.attr('align') === 'center' &&
           item.text.match(/^\(\d+\)$/);
}

async function crawlBook(bookId) {
    const bookName = BOOK_NAMES[bookId];
    const displayName = DISPLAY_NAMES[bookId];
    
    if (!bookName) {
        console.error(`❌ Unknown book ID: ${bookId}`);
        return false;
    }

    const indexUrl = `${BASE_URL}life-study-of-${bookName}/`;
    console.log(`\n📖 Starting to fetch English ${displayName} (${bookId})...`);
    console.log(`   URL: ${indexUrl}`);

    let indexRes;
    try {
        indexRes = await axios.get(indexUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
    } catch (e) {
        console.error(`❌ Failed to fetch index for ${displayName}:`, e.message);
        return false;
    }

    const $index = cheerio.load(indexRes.data);
    const playlist = new Set();

    // Extract all links pointing to specific messages
    const bookPath = `/life-study-of-the-bible/life-study-of-${bookName}/`;
    $index('a').each((i, el) => {
        let href = $index(el).attr('href');
        if (href && href.includes(bookPath) && href.match(/\/\d+\/$/)) {
            if (!href.startsWith('http')) {
                href = new URL(href, indexUrl).href;
            }
            playlist.add(href);
        }
    });

    if (playlist.size === 0) {
        // Try alternative URL patterns
        $index('a').each((i, el) => {
            let href = $index(el).attr('href');
            if (href && href.match(/\/life-study-of-[\w-]+\/\d+\/$/)) {
                if (!href.startsWith('http')) {
                    href = new URL(href, indexUrl).href;
                }
                playlist.add(href);
            }
        });
    }

    const playlistArr = Array.from(playlist).sort((a, b) => {
        const matchA = a.match(/\/(\d+)\/$/);
        const matchB = b.match(/\/(\d+)\/$/);
        if (!matchA || !matchB) return 0;
        return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
    });

    if (playlistArr.length === 0) {
        console.error(`❌ No messages found for ${displayName}`);
        return false;
    }

    console.log(`📋 Found ${playlistArr.length} messages for ${displayName}`);

    let messages = [];

    for (let i = 0; i < playlistArr.length; i++) {
        const currentUrl = playlistArr[i];
        const msgIdMatch = currentUrl.match(/\/(\d+)\/$/);
        const msgId = msgIdMatch ? msgIdMatch[1] : String(i + 1);

        try {
            console.log(`   [${i + 1}/${playlistArr.length}] Fetching message ${msgId}...`);
            const response = await axios.get(currentUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);

            // Data cleaning
            $('.float_right, .lang_link').closest('p').remove();
            $('a[href*="mybible.ws"], a[href*="biblialeer.online"]').closest('p').remove();
            $('a[href*="lsm.org"]').closest('p').remove();
            $('.post-navigation').remove();
            $('footer').remove();
            $('.sharedaddy').remove();
            $('#jp-relatedposts').remove();

            const $content = $('.section').length ? $('.section') : $('body');

            const allElements = [];
            $content.find('h1, h2, p').each((idx, el) => {
                const $el = $(el);
                const text = $el.text().trim().replace(/[\r\n\t]+/g, ' ');
                const tagName = el.tagName.toLowerCase();
                allElements.push({ el, $el, text, tagName });
            });

            let structuredContent = [];
            let finalTitle = `Message ${msgId}`;
            let processedMainTitle = false;
            
            // Helper function to detect if text is likely Spanish (not English)
            function isSpanishText(txt) {
                // Common Spanish words/phrases that indicate Spanish content
                const spanishIndicators = [
                    'estudio-vida', 'estudio vida', ' de ', ' y ', ' del ', ' los ', ' las ',
                    ' reyes', ' samuel', ' crónicas', ' corintios', ' tesalonicenses',
                    ' génesis', ' éxodo', ' levítico', ' números', ' deuteronomio',
                    ' josué', ' jueces', ' rut', ' esdras', ' nehemas', ' ester',
                    ' job', ' salmos', ' proverbios', ' eclesiastés', ' cantares',
                    ' isaías', ' jeremías', ' lamentaciones', ' ezekiel', ' daniel',
                    ' oseas', ' joel', ' amós', ' abdías', ' jonás', ' miqueas',
                    ' nahúm', ' habacuc', ' sofonías', ' hageo', ' zacarías', ' malaquías',
                    ' mateo', ' marcos', ' lucas', ' juan', ' hechos', ' romanos',
                    ' timoteo', ' tito', ' filemón', ' hebreos', ' santiago', ' pedro',
                    ' jude', ' apocalipsis'
                ];
                const lowerTxt = txt.toLowerCase();
                // Check for Spanish indicators
                for (const indicator of spanishIndicators) {
                    if (lowerTxt.includes(indicator)) {
                        // Verify it's not English by checking for English-specific patterns
                        // English would have "Life-study of" not "Estudio-vida de"
                        if (lowerTxt.includes('estudio-vida') || lowerTxt.includes('estudio vida')) {
                            return true;
                        }
                        // If it has Spanish book names with Spanish articles
                        if ((lowerTxt.includes(' de ') || lowerTxt.includes(' y ')) &&
                            !lowerTxt.includes('life-study of')) {
                            return true;
                        }
                    }
                }
                return false;
            }

            for (let j = 0; j < allElements.length; j++) {
                const item = allElements[j];
                const { el, $el, text, tagName } = item;
                const lower = text.toLowerCase();

                if (text.match(/^message\s+\d+$/i)) continue;
                if (!text || lower.includes('next post') || lower.includes('previous post') || lower.includes('speaking the truth in love')) continue;
                if (isPartNumber(item)) continue;

                let type = 'p';
                if (tagName === 'h1') type = 'h4';
                else if (tagName === 'h2') type = 'h5';
                else if (tagName === 'p') {
                    const isShortText = text.length < 50 && text.length > 0;
                    const noSentenceEnd = !text.match(/[.!?。！？]$/);
                    const hasWords = text.split(/\s+/).length <= 6 && text.split(/\s+/).length >= 1;
                    const noSpecialChars = !text.match(/[;,，、：:]/);
                    
                    if (isShortText && noSentenceEnd && hasWords && noSpecialChars) {
                        type = 'h6';
                    }
                }

                let textWithPartNum = text;
                const nextItem = allElements[j + 1];
                if (nextItem && isPartNumber(nextItem)) {
                    textWithPartNum = `${text} ${nextItem.text}`;
                }

                if (tagName === 'h1' && !processedMainTitle) {
                    // Skip Spanish titles - look for English title in content instead
                    if (!isSpanishText(textWithPartNum)) {
                        finalTitle = textWithPartNum;
                    } else {
                        // Try to find English title from h2 or first meaningful content
                        for (let k = j + 1; k < allElements.length; k++) {
                            const nextElem = allElements[k];
                            if (nextElem.tagName === 'h2' || nextElem.tagName === 'h5') {
                                const candidateTitle = nextElem.text;
                                if (!isSpanishText(candidateTitle) && candidateTitle.length > 3) {
                                    finalTitle = candidateTitle;
                                    break;
                                }
                            }
                        }
                    }
                    processedMainTitle = true;
                    continue;
                }

                const isDuplicate = structuredContent.length > 0 && 
                    structuredContent[structuredContent.length - 1].text === textWithPartNum;
                if (!isDuplicate) {
                    structuredContent.push({ type, text: textWithPartNum });
                }
            }

            if (structuredContent.length > 0) {
                messages.push({
                    id: msgId,
                    title: finalTitle,
                    content: structuredContent
                });
            }

            await sleep(300);

        } catch (error) {
            console.error(`   ❌ Failed to fetch message ${msgId}: ${error.message}`);
        }
    }

    if (messages.length > 0) {
        const outFile = path.join(DATA_DIR, `${bookId}_en.json`);
        fs.writeFileSync(outFile, JSON.stringify({
            bookId: bookId,
            bookName: displayName,
            messages: messages
        }, null, 2));
        console.log(`\n✅ [COMPLETE] English "${displayName}" saved as ${bookId}_en.json (${messages.length} messages)`);
        return true;
    } else {
        console.error(`\n❌ No messages collected for ${displayName}`);
        return false;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('📚 English Life-Study Crawler');
    console.log('='.repeat(60));
    
    const existingBooks = getExistingEnglishBooks();
    const completedBooks = loadProgress();
    
    console.log(`\n📋 Already downloaded: ${existingBooks.join(', ') || 'none'}`);
    
    // Get all book IDs that need to be downloaded
    const allBookIds = Object.keys(BOOK_NAMES);
    const booksToDownload = allBookIds.filter(id => 
        !existingBooks.includes(id) && !completedBooks.includes(id)
    );
    
    console.log(`📝 Books to download: ${booksToDownload.length}`);
    
    if (booksToDownload.length === 0) {
        console.log('\n✅ All English books are already downloaded!');
        return;
    }
    
    console.log(`   Books: ${booksToDownload.map(id => DISPLAY_NAMES[id]).join(', ')}`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const bookId of booksToDownload) {
        const success = await crawlBook(bookId);
        
        if (success) {
            successCount++;
            completedBooks.push(bookId);
            saveProgress(completedBooks);
        } else {
            failCount++;
        }
        
        // Longer delay between books
        await sleep(1000);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Summary: ${successCount} succeeded, ${failCount} failed`);
    console.log('='.repeat(60));
}

main().catch(console.error);