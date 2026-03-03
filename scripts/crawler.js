const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://line.twgbr.org/life-study/';
const DATA_DIR = path.join(__dirname, '../src/data/life-study');
const PROGRESS_FILE = path.join(__dirname, '../progress.json');

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

async function crawl() {
    let completedBooks = loadProgress();

    console.log('📖 正在获取总目录...');
    let indexResponse;
    try {
        indexResponse = await axios.get(BASE_URL + 'index.html');
    } catch (e) {
        console.error('❌ 获取目录失败，请检查网络:', e.message);
        return;
    }

    const $index = cheerio.load(indexResponse.data);
    const books = [];

    // 获取 60 多卷书的入口
    $index('a').each((i, el) => {
        const href = $index(el).attr('href');
        const shortName = $index(el).text().trim();
        if (href && href.match(/^\d+\.html$/)) {
            books.push({
                startUrl: href,
                bookId: href.replace('.html', ''),
                shortName: shortName
            });
        }
    });

    console.log(`🎯 在目录中找到 ${books.length} 卷书。准备开始【矩阵精确巡航】抓取...\n`);

    for (const book of books) {
        if (completedBooks.includes(book.bookId)) {
            console.log(`⏭️ [跳过] 卷书 ID: ${book.bookId} (${book.shortName}) 已经抓取过。`);
            continue;
        }

        console.log(`\n🚀 ================= 开始抓取: ${book.shortName} =================`);
        
        // 步骤一：先访问第一页，提取这卷书的“完整篇章列表 (Playlist)”
        const firstUrl = BASE_URL + book.startUrl;
        let firstPageResponse;
        try {
            firstPageResponse = await axios.get(firstUrl);
        } catch (e) {
            console.error(`❌ 获取《${book.shortName}》第一页失败，跳过该卷书:`, e.message);
            continue; 
        }

        const $first = cheerio.load(firstPageResponse.data);
        
        // 提取全名
        let fullBookName = book.shortName;
        let headerText = $first('#header').text() || $first('title').text();
        let match = headerText.match(/(.+?)生命讀經/);
        if (match) fullBookName = match[1].trim();

        // 构建 Playlist Set（自动去重）
        const playlist = new Set();
        playlist.add(book.startUrl); // 第一篇肯定要加进去

        // 提取那个 001 到 xxx 的数字矩阵里的所有合法链接
        const bookIdPrefix = book.bookId;
        // 使用正则精确匹配：比如 bookId 是 12，只匹配 12.html 或 12_xxx.html
        const regex = new RegExp(`^${bookIdPrefix}(_\\d+)?\\.html$`); 
        
        $first('a').each((i, el) => {
            const href = $first(el).attr('href');
            if (href && regex.test(href)) {
                playlist.add(href);
            }
        });

        // 将 Set 转为数组，并按篇章逻辑排序（保证第一篇、第二篇...的顺序）
        const playlistArr = Array.from(playlist).sort((a, b) => {
            const getNum = (str) => {
                const parts = str.replace('.html', '').split('_');
                return parts.length > 1 ? parseInt(parts[1], 10) : 1;
            };
            return getNum(a) - getNum(b);
        });

        console.log(`📋 成功提取《${fullBookName}》篇章目录矩阵，共找到 ${playlistArr.length} 篇！开始批量获取...`);

        let messages = [];

        // 步骤二：根据提取到的确切 Playlist，依次抓取每一篇
        for (let i = 0; i < playlistArr.length; i++) {
            const currentUrl = playlistArr[i];
            try {
                const response = await axios.get(BASE_URL + currentUrl);
                const $ = cheerio.load(response.data);

                $('button, input, script, style, img, br, hr').remove();

                let title = $('h3').first().text().trim();
                let structuredContent = [];

                // 无限层级自适应：抓取所有 <p> 与 class 中包含 O* 的 div
                $('p, div[class*="O"]').each((idx, el) => {
                    const $el = $(el);
                    let text = $el.text().trim().replace(/[\r\n\t]+/g, ' ');

                    if (!text || text.includes('上一篇') || text.includes('下一篇') || 
                        text.includes('回主頁') || text.includes('來源：') || 
                        text.includes('臺灣福音書房') || text.includes('©')) {
                        return;
                    }

                    let type = 'p';
                    const className = $el.attr('class') || '';
                    const match = className.match(/\bO(\d+)\b/); // 匹配 O0, O1, O12 等
                    if (match) {
                        type = `O${match[1]}`;
                    }

                    structuredContent.push({ type, text });
                });

                if (title && structuredContent.length > 0) {
                    messages.push({
                        id: currentUrl.replace('.html', ''),
                        title: title,
                        content: structuredContent
                    });
                    console.log(`✅ [${fullBookName}] ${title}`);
                }

                await sleep(Math.floor(Math.random() * 1000) + 500);

            } catch (error) {
                // 如果在 Playlist 中碰到 404，说明这篇确实不存在，跳过即可，绝不中断整个循环！
                if (error.response && error.response.status === 404) {
                    console.log(`🚫 404 错误 (${currentUrl})，该篇在服务器上丢失，自动跳过，继续下一篇。`);
                } else {
                    console.error(`❌ 抓取 ${currentUrl} 失败: ${error.message}`);
                }
            }
        } // 结束这卷书的 for 循环

        // 步骤三：打包该书卷
        if (messages.length > 0) {
            console.log(`\n📦 【打包】《${fullBookName}》已结构化抓取完毕，实际入库 ${messages.length} 篇！`);
            const outFile = path.join(DATA_DIR, `${book.bookId}.json`);
            fs.writeFileSync(outFile, JSON.stringify({
                bookId: book.bookId,
                bookName: fullBookName,
                messages: messages
            }, null, 2));

            completedBooks.push(book.bookId);
            saveProgress(completedBooks);
        }

    } // 结束总书卷 for 循环

    console.log('\n🎉 恭喜！整套《生命读经》所有书卷结构化抓取圆满完成！');
}

crawl();