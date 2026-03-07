/**
 * Bookmark types for the life-study reader
 */

/**
 * Available bookmark colors
 */
export type BookmarkColor = 'default' | 'red' | 'orange' | 'green' | 'blue' | 'purple'

/**
 * Bookmark data structure
 */
export interface Bookmark {
  id: string
  bookId: string
  messageIndex: number
  paragraphIndex?: number          // Optional specific paragraph
  label: string                    // User-defined label
  color: BookmarkColor
  note?: string                    // Optional note
  createdAt: string
  updatedAt?: string
}

/**
 * Bookmark category for organization
 */
export interface BookmarkCategory {
  id: string
  name: string
  color: BookmarkColor
  order: number
}

/**
 * Storage key for bookmarks
 */
export const BOOKMARKS_STORAGE_KEY = "life-study:bookmarks"

/**
 * Default bookmark colors with their Tailwind classes
 */
export const bookmarkColors: Record<BookmarkColor, { bg: string; text: string; dot: string }> = {
  default: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", dot: "bg-gray-400" },
  red: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", dot: "bg-red-400" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-400" },
  green: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-300", dot: "bg-green-400" },
  blue: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-400" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-400" },
}