import type { Highlight, Note, Language, FontFamily } from "@/lib/reading-data"

/**
 * Export data schema version for compatibility checking
 */
export const EXPORT_SCHEMA_VERSION = "1.0.0"

/**
 * Highlight color type
 */
export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "purple" | "red"

/**
 * Reading progress for a single message
 */
export interface MessageReadingState {
  bookId: string
  messageIndex: number
  language: Language
  highlights: Highlight[]
  notes: Note[]
  scrollProgress: number
  scrollY: number
  lastReadAt: string
}

/**
 * Reader settings
 */
export interface ReaderSettings {
  theme: "light" | "dark" | "system"
  fontFamily: FontFamily
  fontSize: number
  lineHeight: number
  language: Language
}

/**
 * TTS settings
 */
export interface TTSSettings {
  rate: number
  pitch: number
  volume: number
  voiceId?: string
  useEdgeTTS: boolean
  autoContinue: boolean
}

/**
 * Full export data structure
 */
export interface ExportData {
  version: string
  exportedAt: string
  appVersion: string
  data: {
    readingStates: MessageReadingState[]
    messageProgress: Record<string, number> // bookId -> messageIndex
    readerSettings: ReaderSettings | null
    ttsSettings: TTSSettings | null
  }
  metadata: {
    totalHighlights: number
    totalNotes: number
    booksIncluded: string[]
    exportType: "full" | "partial"
  }
}

/**
 * Import result status
 */
export type ImportStatus = "success" | "partial" | "failed"

/**
 * Result of import operation
 */
export interface ImportResult {
  status: ImportStatus
  message: string
  details: {
    highlightsImported: number
    notesImported: number
    progressRestored: number
    settingsRestored: boolean
  }
  errors: string[]
  warnings: string[]
}

/**
 * Validation error for import data
 */
export interface ValidationError {
  path: string
  message: string
  value?: unknown
}

/**
 * Options for export operation
 */
export interface ExportOptions {
  includeReadingStates: boolean
  includeProgress: boolean
  includeSettings: boolean
  includeTTSSettings: boolean
  bookIds?: string[] // If specified, only export these books
}

/**
 * Options for import operation
 */
export interface ImportOptions {
  merge: boolean // If true, merge with existing data; if false, replace
  overwriteProgress: boolean
  overwriteSettings: boolean
}