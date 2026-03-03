const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "data", "life-study");
const OUTPUT_FILE = path.join(DATA_DIR, "index.json");

function isNumericJson(filename) {
  return /^\d+\.json$/.test(filename);
}

function main() {
  const files = fs.readdirSync(DATA_DIR).filter(isNumericJson);

  const books = [];
  const byName = new Map();

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    try {
      const raw = fs.readFileSync(fullPath, "utf8");
      const json = JSON.parse(raw);
      const bookId = String(json.bookId ?? path.basename(file, ".json"));
      const bookName = json.bookName ?? bookId;
      const existing = byName.get(bookName);
      if (!existing) {
        byName.set(bookName, { bookId, bookName });
      } else {
        const prevId = Number(existing.bookId);
        const nextId = Number(bookId);
        if (Number.isFinite(nextId) && (!Number.isFinite(prevId) || nextId < prevId)) {
          byName.set(bookName, { bookId, bookName });
        }
      }
    } catch (err) {
      console.error(`Failed to read/parse ${file}:`, err.message);
    }
  }

  const deduped = Array.from(byName.values());
  deduped.sort((a, b) => Number(a.bookId) - Number(b.bookId));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deduped, null, 2), "utf8");
  console.log(`Wrote ${deduped.length} unique book entries to ${OUTPUT_FILE}`);
}

main();
