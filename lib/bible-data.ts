/**
 * Bible Data Loader
 * 
 * Handles loading and caching Bible verse data from JSON files.
 * Supports lazy loading and efficient verse retrieval.
 */

import type { BibleReference } from './bible-reference-parser';

// ============================================
// Types
// ============================================

export interface Verse {
  verse: number;
  text: string;
}

export interface Chapter {
  chapter: number;
  verses: Verse[];
}

export interface BibleBook {
  bookId: string;
  bookName: string;
  language: 'english' | 'chinese';
  chapters: Chapter[];
}

export interface VerseData {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

// ============================================
// Cache
// ============================================

// In-memory cache for loaded books
const bookCache = new Map<string, BibleBook>();

// Track which books we've attempted to load (to avoid repeated failed attempts)
const loadAttempts = new Set<string>();

// ============================================
// Data Loading Functions
// ============================================

/**
 * Get the cache key for a book
 */
function getCacheKey(bookId: string, language: 'english' | 'chinese'): string {
  return `${bookId}-${language}`;
}

/**
 * Load a Bible book from JSON file
 * Uses fetch to load from API route
 */
async function loadBook(bookId: string, language: 'english' | 'chinese'): Promise<BibleBook | null> {
  const cacheKey = getCacheKey(bookId, language);
  
  // Return from cache if available
  if (bookCache.has(cacheKey)) {
    return bookCache.get(cacheKey)!;
  }
  
  // Check if we've already tried and failed
  if (loadAttempts.has(cacheKey)) {
    return null;
  }
  
  try {
    // Determine file path based on language
    const suffix = language === 'english' ? '_en' : '';
    const filePath = `/data/bible/${bookId}${suffix}.json`;
    
    // Use fetch to load the JSON file
    const response = await fetch(filePath);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data: BibleBook = await response.json();
    
    // Cache the result
    bookCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    // Mark as attempted to avoid repeated failures
    loadAttempts.add(cacheKey);
    console.warn(`Failed to load Bible book ${bookId} (${language}):`, error);
    return null;
  }
}

/**
 * Preload books for faster access
 */
export async function preloadBooks(bookIds: string[], language: 'english' | 'chinese'): Promise<void> {
  await Promise.all(bookIds.map(id => loadBook(id, language)));
}

/**
 * Clear the cache
 */
export function clearCache(): void {
  bookCache.clear();
  loadAttempts.clear();
}

// ============================================
// Verse Retrieval Functions
// ============================================

/**
 * Get a single verse
 */
export async function getVerse(
  bookId: string,
  chapter: number,
  verse: number,
  language: 'english' | 'chinese' = 'chinese'
): Promise<VerseData | null> {
  const book = await loadBook(bookId, language);
  if (!book) return null;
  
  const chapterData = book.chapters.find(c => c.chapter === chapter);
  if (!chapterData) return null;
  
  const verseData = chapterData.verses.find(v => v.verse === verse);
  if (!verseData) return null;
  
  return {
    bookId: book.bookId,
    bookName: book.bookName,
    chapter,
    verse: verseData.verse,
    text: verseData.text
  };
}

/**
 * Get a range of verses
 */
export async function getVerses(
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number,
  language: 'english' | 'chinese' = 'chinese'
): Promise<VerseData[]> {
  const book = await loadBook(bookId, language);
  if (!book) return [];
  
  const chapterData = book.chapters.find(c => c.chapter === chapter);
  if (!chapterData) return [];
  
  const end = verseEnd || verseStart;
  const verses: VerseData[] = [];
  
  for (let v = verseStart; v <= end; v++) {
    const verseData = chapterData.verses.find(verse => verse.verse === v);
    if (verseData) {
      verses.push({
        bookId: book.bookId,
        bookName: book.bookName,
        chapter,
        verse: verseData.verse,
        text: verseData.text
      });
    }
  }
  
  return verses;
}

/**
 * Get verses from a BibleReference object
 */
export async function getVersesFromReference(
  ref: BibleReference,
  language: 'english' | 'chinese' = 'chinese'
): Promise<VerseData[]> {
  return getVerses(
    ref.bookId,
    ref.chapter,
    ref.verseStart,
    ref.verseEnd,
    language
  );
}

/**
 * Get all verses in a chapter
 */
export async function getChapter(
  bookId: string,
  chapter: number,
  language: 'english' | 'chinese' = 'chinese'
): Promise<VerseData[]> {
  const book = await loadBook(bookId, language);
  if (!book) return [];
  
  const chapterData = book.chapters.find(c => c.chapter === chapter);
  if (!chapterData) return [];
  
  return chapterData.verses.map(verse => ({
    bookId: book.bookId,
    bookName: book.bookName,
    chapter,
    verse: verse.verse,
    text: verse.text
  }));
}

/**
 * Check if a book is available
 */
export async function isBookAvailable(bookId: string, language: 'english' | 'chinese'): Promise<boolean> {
  const book = await loadBook(bookId, language);
  return book !== null;
}

/**
 * Get the number of chapters in a book
 */
export async function getChapterCount(bookId: string, language: 'english' | 'chinese'): Promise<number> {
  const book = await loadBook(bookId, language);
  if (!book) return 0;
  return book.chapters.length;
}

/**
 * Get the number of verses in a chapter
 */
export async function getVerseCount(
  bookId: string,
  chapter: number,
  language: 'english' | 'chinese'
): Promise<number> {
  const book = await loadBook(bookId, language);
  if (!book) return 0;
  
  const chapterData = book.chapters.find(c => c.chapter === chapter);
  if (!chapterData) return 0;
  
  return chapterData.verses.length;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format verses for display
 */
export function formatVersesForDisplay(verses: VerseData[], language: 'english' | 'chinese' | 'simplified'): string {
  if (verses.length === 0) return '';
  
  const lines = verses.map(v => {
    const verseNum = language === 'english' ? `[${v.verse}]` : `(${v.verse})`;
    return `${verseNum} ${v.text}`;
  });
  
  return lines.join(' ');
}

/**
 * Get verse text without verse numbers
 */
export function getPlainVerseText(verses: VerseData[]): string {
  return verses.map(v => v.text).join(' ');
}