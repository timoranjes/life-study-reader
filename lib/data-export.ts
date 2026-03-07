import type { 
  ExportData, 
  ExportOptions, 
  MessageReadingState,
  ReaderSettings,
  TTSSettings 
} from "@/types/export-import"
import { EXPORT_SCHEMA_VERSION } from "@/types/export-import"
import type { Highlight, Note, Language } from "@/lib/reading-data"

/**
 * Storage key patterns used in the app
 */
const STORAGE_KEYS = {
  readingState: (bookId: string, messageIndex: number, language: Language) => 
    `life-study-reader:${bookId}:${messageIndex}:${language}`,
  messageIndex: (bookId: string) => 
    `life-study-reader:${bookId}:messageIndex`,
  readerSettings: "life-study:reader-settings",
  ttsSettings: "life-study:tts-settings",
}

/**
 * Get all storage keys matching a pattern
 */
function getStorageKeysByPattern(pattern: RegExp): string[] {
  if (typeof window === "undefined") return []
  
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && pattern.test(key)) {
      keys.push(key)
    }
  }
  return keys
}

/**
 * Extract bookId, messageIndex, and language from storage key
 */
function parseReadingStateKey(key: string): { bookId: string; messageIndex: number; language: Language } | null {
  // Pattern: life-study-reader:${bookId}:${messageIndex}:${language}
  const match = key.match(/^life-study-reader:([^:]+):(\d+):(simplified|traditional|english)$/)
  if (!match) return null
  
  return {
    bookId: match[1],
    messageIndex: parseInt(match[2], 10),
    language: match[3] as Language,
  }
}

/**
 * Get all reading states from localStorage
 */
function getAllReadingStates(bookIds?: string[]): MessageReadingState[] {
  if (typeof window === "undefined") return []
  
  const states: MessageReadingState[] = []
  const keys = getStorageKeysByPattern(/^life-study-reader:[^:]+:\d+:(simplified|traditional|english)$/)
  
  for (const key of keys) {
    const parsed = parseReadingStateKey(key)
    if (!parsed) continue
    
    // Filter by bookIds if specified
    if (bookIds && !bookIds.includes(parsed.bookId)) continue
    
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      
      const data = JSON.parse(raw)
      
      states.push({
        bookId: parsed.bookId,
        messageIndex: parsed.messageIndex,
        language: parsed.language,
        highlights: data.highlights || [],
        notes: data.notes || [],
        scrollProgress: data.scrollProgress || 0,
        scrollY: data.scrollY || 0,
        lastReadAt: data.lastReadAt || new Date().toISOString(),
      })
    } catch (error) {
      console.warn(`Failed to parse reading state for key ${key}:`, error)
    }
  }
  
  return states
}

/**
 * Get message progress for all books
 */
function getMessageProgress(bookIds?: string[]): Record<string, number> {
  if (typeof window === "undefined") return {}
  
  const progress: Record<string, number> = {}
  const keys = getStorageKeysByPattern(/^life-study-reader:[^:]+:messageIndex$/)
  
  for (const key of keys) {
    // Extract bookId from key: life-study-reader:${bookId}:messageIndex
    const match = key.match(/^life-study-reader:([^:]+):messageIndex$/)
    if (!match) continue
    
    const bookId = match[1]
    
    // Filter by bookIds if specified
    if (bookIds && !bookIds.includes(bookId)) continue
    
    try {
      const value = localStorage.getItem(key)
      if (value !== null) {
        progress[bookId] = parseInt(value, 10)
      }
    } catch (error) {
      console.warn(`Failed to get message progress for key ${key}:`, error)
    }
  }
  
  return progress
}

/**
 * Get reader settings
 */
function getReaderSettings(): ReaderSettings | null {
  if (typeof window === "undefined") return null
  
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.readerSettings)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Get TTS settings
 */
function getTTSSettings(): TTSSettings | null {
  if (typeof window === "undefined") return null
  
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ttsSettings)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Count total highlights and notes
 */
function countAnnotations(states: MessageReadingState[]): { highlights: number; notes: number } {
  return states.reduce(
    (acc, state) => ({
      highlights: acc.highlights + state.highlights.length,
      notes: acc.notes + state.notes.length,
    }),
    { highlights: 0, notes: 0 }
  )
}

/**
 * Get unique book IDs from reading states
 */
function getUniqueBookIds(states: MessageReadingState[]): string[] {
  const bookIds = new Set(states.map((s) => s.bookId))
  return Array.from(bookIds)
}

/**
 * Export all user data
 */
export function exportUserData(options: ExportOptions = {
  includeReadingStates: true,
  includeProgress: true,
  includeSettings: true,
  includeTTSSettings: true,
}): ExportData {
  const readingStates = options.includeReadingStates 
    ? getAllReadingStates(options.bookIds)
    : []
  
  const messageProgress = options.includeProgress 
    ? getMessageProgress(options.bookIds)
    : {}
  
  const readerSettings = options.includeSettings 
    ? getReaderSettings()
    : null
  
  const ttsSettings = options.includeTTSSettings 
    ? getTTSSettings()
    : null
  
  const { highlights: totalHighlights, notes: totalNotes } = countAnnotations(readingStates)
  const booksIncluded = getUniqueBookIds(readingStates)
  
  return {
    version: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: "1.0.0", // Could be dynamically imported from package.json
    data: {
      readingStates,
      messageProgress,
      readerSettings,
      ttsSettings,
    },
    metadata: {
      totalHighlights,
      totalNotes,
      booksIncluded,
      exportType: options.bookIds ? "partial" : "full",
    },
  }
}

/**
 * Download export data as JSON file
 */
export function downloadExportFile(data: ExportData, filename?: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  
  const defaultFilename = `life-study-backup-${new Date().toISOString().split("T")[0]}.json`
  const finalFilename = filename || defaultFilename
  
  const link = document.createElement("a")
  link.href = url
  link.download = finalFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export and immediately download
 */
export function exportAndDownload(options?: ExportOptions, filename?: string): ExportData {
  const data = exportUserData(options)
  downloadExportFile(data, filename)
  return data
}

/**
 * Get export summary for preview
 */
export function getExportSummary(options?: ExportOptions): {
  readingStatesCount: number
  totalHighlights: number
  totalNotes: number
  booksCount: number
  hasSettings: boolean
  hasTTSSettings: boolean
} {
  const states = options?.includeReadingStates 
    ? getAllReadingStates(options.bookIds)
    : []
  const { highlights, notes } = countAnnotations(states)
  
  return {
    readingStatesCount: states.length,
    totalHighlights: highlights,
    totalNotes: notes,
    booksCount: getUniqueBookIds(states).length,
    hasSettings: options?.includeSettings ? !!getReaderSettings() : false,
    hasTTSSettings: options?.includeTTSSettings ? !!getTTSSettings() : false,
  }
}

/**
 * Format file size for display
 */
export function formatExportSize(data: ExportData): string {
  const json = JSON.stringify(data)
  const bytes = new Blob([json]).size
  
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}