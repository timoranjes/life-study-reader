/**
 * Bookmark storage and management utilities
 */

import type { Bookmark, BookmarkColor } from "@/types/bookmark"
import { BOOKMARKS_STORAGE_KEY } from "@/types/bookmark"

/**
 * Generate a unique bookmark ID
 */
export function generateBookmarkId(): string {
  return `bm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Get all bookmarks from localStorage
 */
export function getBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return []
  
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY)
    if (!raw) return []
    
    const bookmarks = JSON.parse(raw)
    return Array.isArray(bookmarks) ? bookmarks : []
  } catch (error) {
    console.error("Failed to load bookmarks:", error)
    return []
  }
}

/**
 * Save all bookmarks to localStorage
 */
export function saveBookmarks(bookmarks: Bookmark[]): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks))
  } catch (error) {
    console.error("Failed to save bookmarks:", error)
  }
}

/**
 * Add a new bookmark
 */
export function addBookmark(bookmark: Omit<Bookmark, "id" | "createdAt">): Bookmark {
  const bookmarks = getBookmarks()
  
  const newBookmark: Bookmark = {
    ...bookmark,
    id: generateBookmarkId(),
    createdAt: new Date().toISOString(),
  }
  
  bookmarks.push(newBookmark)
  saveBookmarks(bookmarks)
  
  return newBookmark
}

/**
 * Update an existing bookmark
 */
export function updateBookmark(id: string, updates: Partial<Bookmark>): Bookmark | null {
  const bookmarks = getBookmarks()
  const index = bookmarks.findIndex((b) => b.id === id)
  
  if (index === -1) return null
  
  bookmarks[index] = {
    ...bookmarks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  
  saveBookmarks(bookmarks)
  return bookmarks[index]
}

/**
 * Delete a bookmark
 */
export function deleteBookmark(id: string): boolean {
  const bookmarks = getBookmarks()
  const filtered = bookmarks.filter((b) => b.id !== id)
  
  if (filtered.length === bookmarks.length) return false
  
  saveBookmarks(filtered)
  return true
}

/**
 * Get bookmarks for a specific book
 */
export function getBookmarksForBook(bookId: string): Bookmark[] {
  return getBookmarks().filter((b) => b.bookId === bookId)
}

/**
 * Get bookmarks for a specific message
 */
export function getBookmarksForMessage(bookId: string, messageIndex: number): Bookmark[] {
  return getBookmarks().filter(
    (b) => b.bookId === bookId && b.messageIndex === messageIndex
  )
}

/**
 * Check if a location is bookmarked
 */
export function isBookmarked(
  bookId: string,
  messageIndex: number,
  paragraphIndex?: number
): Bookmark | undefined {
  return getBookmarks().find((b) => {
    if (b.bookId !== bookId || b.messageIndex !== messageIndex) return false
    if (paragraphIndex !== undefined && b.paragraphIndex !== undefined) {
      return b.paragraphIndex === paragraphIndex
    }
    // If no paragraph specified, match bookmarks without paragraph
    return paragraphIndex === undefined && b.paragraphIndex === undefined
  })
}

/**
 * Clear all bookmarks
 */
export function clearAllBookmarks(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(BOOKMARKS_STORAGE_KEY)
}

/**
 * Export bookmarks data
 */
export function exportBookmarks(): Bookmark[] {
  return getBookmarks()
}

/**
 * Import bookmarks data (merge with existing)
 */
export function importBookmarks(bookmarks: Bookmark[], merge = true): void {
  if (merge) {
    const existing = getBookmarks()
    const existingIds = new Set(existing.map((b) => b.id))
    
    // Add only new bookmarks
    const newBookmarks = bookmarks.filter((b) => !existingIds.has(b.id))
    saveBookmarks([...existing, ...newBookmarks])
  } else {
    saveBookmarks(bookmarks)
  }
}

/**
 * Get bookmark color classes
 */
export function getBookmarkColorClasses(color: BookmarkColor) {
  const colors = {
    default: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", dot: "bg-gray-400" },
    red: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", dot: "bg-red-400" },
    orange: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-400" },
    green: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-300", dot: "bg-green-400" },
    blue: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-400" },
    purple: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-400" },
  }
  return colors[color] || colors.default
}