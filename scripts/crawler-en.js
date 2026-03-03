const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../src/data/life-study');
const BOOK_ID = '40'; // Matthew
const BOOK_NAME = 'Matthew';
const INDEX_URL = 'https://bibleread.online/life-study-of-the-bible/life-study-of-matthew/';

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function crawlEnglishGenesis() {
    console.log(`📖 Starting to fetch English ${BOOK_NAME} index...`);

    let indexRes;
    try {
        indexRes = await axios.get(INDEX_URL);
    } catch (e) {
        console.error('❌ Failed to fetch index:', e.message);
        return;
    }

    const $index = cheerio.load(indexRes.data);
    const playlist = new Set();

    // Extract all links pointing to specific messages, e.g., /life-study-of-the-bible/life-study-of-matthew/1/
    // Use the book name to match relative paths
    const bookPath = `/life-study-of-the-bible/life-study-of-${BOOK_NAME.toLowerCase()}/`;
    $index('a').each((i, el) => {
        let href = $index(el).attr('href');
        if (href && href.includes(bookPath) && href.match(/\/\d+\/$/)) {
            // Ensure absolute URL
            if (!href.startsWith('http')) {
                href = new URL(href, INDEX_URL).href;
            }
            playlist.add(href);
        }
    });

    // Sort numerically from message 1 to the last
    const playlistArr = Array.from(playlist).sort((a, b) => {
        const numA = parseInt(a.match(/\/(\d+)\/$/)[1], 10);
        const numB = parseInt(b.match(/\/(\d+)\/$/)[1], 10);
        return numA - numB;
    });

    console.log(`📋 Successfully extracted index, ${playlistArr.length} messages! Starting content extraction...`);

    let messages = [];

    for (let i = 0; i < playlistArr.length; i++) {
        const currentUrl = playlistArr[i];
        const msgId = currentUrl.match(/\/(\d+)\/$/)[1];

        try {
            console.log(`🔍 Fetching: ${currentUrl}`);
            const response = await axios.get(currentUrl);
            const $ = cheerio.load(response.data);

            // === DATA CLEANING (CRITICAL) ===
            // 1. Remove <p> tags containing elements with .float_right or .lang_link classes
            $('.float_right, .lang_link').closest('p').remove();
            
            // 2. Remove <p> tags containing <a> links pointing to mybible.ws or biblialeer.online (language switchers)
            $('a[href*="mybible.ws"], a[href*="biblialeer.online"]').closest('p').remove();
            
            // 3. Remove <p> tags containing <a> links pointing to lsm.org (Living Stream Ministry copyright)
            $('a[href*="lsm.org"]').closest('p').remove();
            
            // 4. Remove navigation, footer, sharing, and related posts sections
            $('.post-navigation').remove();
            $('footer').remove();
            $('.sharedaddy').remove();
            $('#jp-relatedposts').remove();

            // Locate main content area
            // The site uses a custom structure - content is directly in body after header
            // Look for content in .section or fall back to body
            const $content = $('.section').length ? $('.section') : $('body');

            // Collect all elements first for lookahead processing
            const allElements = [];
            $content.find('h1, h2, p').each((idx, el) => {
                const $el = $(el);
                const text = $el.text().trim().replace(/[\r\n\t]+/g, ' ');
                const tagName = el.tagName.toLowerCase();
                allElements.push({
                    el,
                    $el,
                    text,
                    tagName
                });
            });
            
            // Helper function to check if an element is a standalone part number
            const isPartNumber = (item) => {
                return item.tagName === 'p' &&
                       item.$el.attr('align') === 'center' &&
                       item.text.match(/^\(\d+\)$/);
            };
            
            // Process with lookahead to merge part numbers with their PRECEDING headings
            // HTML structure: <h1>Title</h1><p align="center">(5)</p>
            // The part number FOLLOWS the heading, so we need to look AHEAD
            let structuredContent = [];
            let finalTitle = `Message ${msgId}`;
            let processedMainTitle = false;
            
            for (let i = 0; i < allElements.length; i++) {
                const item = allElements[i];
                const { el, $el, text, tagName } = item;
                const lower = text.toLowerCase();

                // 1. Skip natural "Message X" texts
                if (text.match(/^message\s+\d+$/i)) continue;
                
                // 2. Skip junk text
                if (!text || lower.includes('next post') || lower.includes('previous post') || lower.includes('speaking the truth in love')) continue;

                // 3. Skip standalone part numbers - they will be merged with preceding heading
                if (isPartNumber(item)) continue;

                // Determine content type
                let type = 'p';
                if (tagName === 'h1') type = 'h4';
                else if (tagName === 'h2') type = 'h5';
                // Auto-detect standalone short text as subheadings
                else if (tagName === 'p') {
                    const isShortText = text.length < 50 && text.length > 0;
                    const noSentenceEnd = !text.match(/[.!?。！？]$/);
                    const hasWords = text.split(/\s+/).length <= 6 && text.split(/\s+/).length >= 1;
                    const noSpecialChars = !text.match(/[;,，、：:]/);
                    
                    if (isShortText && noSentenceEnd && hasWords && noSpecialChars) {
                        type = 'h6';
                    }
                }

                // Look ahead to check if next element is a part number
                let textWithPartNum = text;
                const nextItem = allElements[i + 1];
                if (nextItem && isPartNumber(nextItem)) {
                    textWithPartNum = `${text} ${nextItem.text}`;
                }

                // Handle main title (first h1)
                if (tagName === 'h1' && !processedMainTitle) {
                    finalTitle = textWithPartNum;
                    processedMainTitle = true;
                    continue; // Don't add main title to content
                }

                // Prevent pushing duplicates (same text as previous)
                const isDuplicate = structuredContent.length > 0 && structuredContent[structuredContent.length - 1].text === textWithPartNum;
                if (!isDuplicate) {
                    structuredContent.push({ type, text: textWithPartNum });
                }
            }

            // Update the push logic to use finalTitle
            if (structuredContent.length > 0) {
                messages.push({
                    id: msgId,
                    title: finalTitle,
                    content: structuredContent
                });
                console.log(`✅ [${BOOK_NAME}] ${finalTitle} (ID: ${msgId})`);
            }

            await sleep(500); // Polite delay

        } catch (error) {
            console.error(`❌ Failed to fetch ${currentUrl}: ${error.message}`);
        }
    }

    if (messages.length > 0) {
        // Save with _en suffix for English version
        const outFile = path.join(DATA_DIR, `${BOOK_ID}_en.json`);
        fs.writeFileSync(outFile, JSON.stringify({
            bookId: BOOK_ID,
            bookName: BOOK_NAME,
            messages: messages
        }, null, 2));
        console.log(`\n📦 [COMPLETE] English "${BOOK_NAME}" saved as ${BOOK_ID}_en.json!`);
    }
}

crawlEnglishGenesis();
