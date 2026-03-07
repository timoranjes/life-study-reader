import type {
  ExportData,
  ImportResult,
  ImportOptions,
  ValidationError,
  MessageReadingState,
} from "@/types/export-import"
import { EXPORT_SCHEMA_VERSION } from "@/types/export-import"
import type { Highlight, Note, Language, HighlightColor } from "@/lib/reading-data"

/**
 * Valid highlight colors
 */
const VALID_HIGHLIGHT_COLORS: HighlightColor[] = ["yellow", "green", "blue", "pink", "purple", "red"]

/**
 * Valid languages
 */
const VALID_LANGUAGES: Language[] = ["simplified", "traditional", "english"]

/**
 * Validate schema version compatibility
 */
function validateVersion(version: string): { valid: boolean; message: string } {
  if (!version) {
    return { valid: false, message: "Missing version field" }
  }
  
  const [major] = version.split(".")
  const [currentMajor] = EXPORT_SCHEMA_VERSION.split(".")
  
  if (major !== currentMajor) {
    return {
      valid: false,
      message: `Incompatible version: ${version}. Current version: ${EXPORT_SCHEMA_VERSION}. Major version mismatch.`,
    }
  }
  
  return { valid: true, message: "Version compatible" }
}

/**
 * Validate a single highlight
 */
function validateHighlight(highlight: unknown, path: string): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (!highlight || typeof highlight !== "object") {
    errors.push({ path, message: "Highlight must be an object", value: highlight })
    return errors
  }
  
  const h = highlight as Record<string, unknown>
  
  // Required fields
  if (typeof h.id !== "string" || !h.id) {
    errors.push({ path: `${path}.id`, message: "Highlight id is required and must be a string", value: h.id })
  }
  
  if (typeof h.paragraphIndex !== "number" || h.paragraphIndex < 0) {
    errors.push({ path: `${path}.paragraphIndex`, message: "paragraphIndex must be a non-negative number", value: h.paragraphIndex })
  }
  
  if (typeof h.startOffset !== "number" || h.startOffset < 0) {
    errors.push({ path: `${path}.startOffset`, message: "startOffset must be a non-negative number", value: h.startOffset })
  }
  
  if (typeof h.endOffset !== "number" || h.endOffset < 0) {
    errors.push({ path: `${path}.endOffset`, message: "endOffset must be a non-negative number", value: h.endOffset })
  }
  
  if (h.startOffset !== undefined && h.endOffset !== undefined && h.startOffset > h.endOffset) {
    errors.push({ path, message: "startOffset must be less than or equal to endOffset", value: `${h.startOffset} > ${h.endOffset}` })
  }
  
  if (!VALID_HIGHLIGHT_COLORS.includes(h.color as HighlightColor)) {
    errors.push({ path: `${path}.color`, message: `Invalid color. Must be one of: ${VALID_HIGHLIGHT_COLORS.join(", ")}`, value: h.color })
  }
  
  if (typeof h.createdAt !== "string" || !h.createdAt) {
    errors.push({ path: `${path}.createdAt`, message: "createdAt must be an ISO date string", value: h.createdAt })
  }
  
  // Optional fields
  if (h.noteId !== undefined && typeof h.noteId !== "string") {
    errors.push({ path: `${path}.noteId`, message: "noteId must be a string if provided", value: h.noteId })
  }
  
  return errors
}

/**
 * Validate a single note
 */
function validateNote(note: unknown, path: string): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (!note || typeof note !== "object") {
    errors.push({ path, message: "Note must be an object", value: note })
    return errors
  }
  
  const n = note as Record<string, unknown>
  
  // Required fields
  if (typeof n.id !== "string" || !n.id) {
    errors.push({ path: `${path}.id`, message: "Note id is required and must be a string", value: n.id })
  }
  
  if (typeof n.highlightId !== "string" || !n.highlightId) {
    errors.push({ path: `${path}.highlightId`, message: "highlightId is required and must be a string", value: n.highlightId })
  }
  
  if (typeof n.highlightParagraphIndex !== "number" || n.highlightParagraphIndex < 0) {
    errors.push({ path: `${path}.highlightParagraphIndex`, message: "highlightParagraphIndex must be a non-negative number", value: n.highlightParagraphIndex })
  }
  
  if (typeof n.quotedText !== "string") {
    errors.push({ path: `${path}.quotedText`, message: "quotedText must be a string", value: n.quotedText })
  }
  
  if (typeof n.content !== "string") {
    errors.push({ path: `${path}.content`, message: "content must be a string", value: n.content })
  }
  
  if (typeof n.createdAt !== "string" || !n.createdAt) {
    errors.push({ path: `${path}.createdAt`, message: "createdAt must be an ISO date string", value: n.createdAt })
  }
  
  // Optional fields
  if (n.updatedAt !== undefined && typeof n.updatedAt !== "string") {
    errors.push({ path: `${path}.updatedAt`, message: "updatedAt must be a string if provided", value: n.updatedAt })
  }
  
  return errors
}

/**
 * Validate a reading state
 */
function validateReadingState(state: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = []
  const path = `data.readingStates[${index}]`
  
  if (!state || typeof state !== "object") {
    errors.push({ path, message: "Reading state must be an object", value: state })
    return errors
  }
  
  const s = state as Record<string, unknown>
  
  // Required fields
  if (typeof s.bookId !== "string" || !s.bookId) {
    errors.push({ path: `${path}.bookId`, message: "bookId is required", value: s.bookId })
  }
  
  if (typeof s.messageIndex !== "number" || s.messageIndex < 0) {
    errors.push({ path: `${path}.messageIndex`, message: "messageIndex must be a non-negative number", value: s.messageIndex })
  }
  
  if (!VALID_LANGUAGES.includes(s.language as Language)) {
    errors.push({ path: `${path}.language`, message: `Invalid language. Must be one of: ${VALID_LANGUAGES.join(", ")}`, value: s.language })
  }
  
  // Validate highlights array
  if (!Array.isArray(s.highlights)) {
    errors.push({ path: `${path}.highlights`, message: "highlights must be an array", value: s.highlights })
  } else {
    s.highlights.forEach((h, i) => {
      errors.push(...validateHighlight(h, `${path}.highlights[${i}]`))
    })
  }
  
  // Validate notes array
  if (!Array.isArray(s.notes)) {
    errors.push({ path: `${path}.notes`, message: "notes must be an array", value: s.notes })
  } else {
    s.notes.forEach((n, i) => {
      errors.push(...validateNote(n, `${path}.notes[${i}]`))
    })
  }
  
  // Optional fields
  if (s.scrollProgress !== undefined && (typeof s.scrollProgress !== "number" || s.scrollProgress < 0 || s.scrollProgress > 100)) {
    errors.push({ path: `${path}.scrollProgress`, message: "scrollProgress must be a number between 0 and 100", value: s.scrollProgress })
  }
  
  if (s.scrollY !== undefined && typeof s.scrollY !== "number") {
    errors.push({ path: `${path}.scrollY`, message: "scrollY must be a number", value: s.scrollY })
  }
  
  return errors
}

/**
 * Validate export data structure
 */
export function validateExportData(data: unknown): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  
  if (!data || typeof data !== "object") {
    errors.push({ path: "root", message: "Data must be an object", value: data })
    return { valid: false, errors }
  }
  
  const d = data as Record<string, unknown>
  
  // Check version
  if (typeof d.version !== "string") {
    errors.push({ path: "version", message: "version is required and must be a string", value: d.version })
  } else {
    const versionResult = validateVersion(d.version)
    if (!versionResult.valid) {
      errors.push({ path: "version", message: versionResult.message, value: d.version })
    }
  }
  
  // Check exportedAt
  if (typeof d.exportedAt !== "string") {
    errors.push({ path: "exportedAt", message: "exportedAt is required and must be an ISO date string", value: d.exportedAt })
  }
  
  // Check data object
  if (!d.data || typeof d.data !== "object") {
    errors.push({ path: "data", message: "data object is required", value: d.data })
    return { valid: false, errors }
  }
  
  const dataObj = d.data as Record<string, unknown>
  
  // Validate reading states
  if (!Array.isArray(dataObj.readingStates)) {
    errors.push({ path: "data.readingStates", message: "readingStates must be an array", value: dataObj.readingStates })
  } else {
    dataObj.readingStates.forEach((state, i) => {
      errors.push(...validateReadingState(state, i))
    })
  }
  
  // Validate message progress
  if (dataObj.messageProgress !== undefined && typeof dataObj.messageProgress !== "object") {
    errors.push({ path: "data.messageProgress", message: "messageProgress must be an object", value: dataObj.messageProgress })
  }
  
  // Validate metadata
  if (d.metadata && typeof d.metadata === "object") {
    const m = d.metadata as Record<string, unknown>
    if (typeof m.totalHighlights !== "number") {
      errors.push({ path: "metadata.totalHighlights", message: "totalHighlights must be a number", value: m.totalHighlights })
    }
    if (typeof m.totalNotes !== "number") {
      errors.push({ path: "metadata.totalNotes", message: "totalNotes must be a number", value: m.totalNotes })
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Parse import file from JSON string
 */
export function parseImportFile(jsonString: string): { data: ExportData | null; error: string | null } {
  try {
    const data = JSON.parse(jsonString)
    return { data, error: null }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown parsing error"
    return { data: null, error: `Failed to parse JSON: ${errorMessage}` }
  }
}

/**
 * Read file as text
 */
export function readImportFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to read file as text"))
      }
    }
    
    reader.onerror = () => {
      reject(new Error("File read error"))
    }
    
    reader.readAsText(file)
  })
}

/**
 * Generate storage key for reading state
 */
function getStorageKey(bookId: string, messageIndex: number, language: Language): string {
  return `life-study-reader:${bookId}:${messageIndex}:${language}`
}

/**
 * Save reading state to localStorage
 */
function saveReadingState(state: MessageReadingState): void {
  const key = getStorageKey(state.bookId, state.messageIndex, state.language)
  const payload = {
    highlights: state.highlights,
    notes: state.notes,
    scrollProgress: state.scrollProgress,
    scrollY: state.scrollY,
    lastReadAt: state.lastReadAt || new Date().toISOString(),
  }
  localStorage.setItem(key, JSON.stringify(payload))
}

/**
 * Get existing reading state from localStorage
 */
function getExistingReadingState(bookId: string, messageIndex: number, language: Language): MessageReadingState | null {
  const key = getStorageKey(bookId, messageIndex, language)
  const raw = localStorage.getItem(key)
  
  if (!raw) return null
  
  try {
    const data = JSON.parse(raw)
    return {
      bookId,
      messageIndex,
      language,
      highlights: data.highlights || [],
      notes: data.notes || [],
      scrollProgress: data.scrollProgress || 0,
      scrollY: data.scrollY || 0,
      lastReadAt: data.lastReadAt || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/**
 * Merge highlights (imported overwrites existing with same id)
 */
function mergeHighlights(existing: Highlight[], imported: Highlight[]): Highlight[] {
  const map = new Map<string, Highlight>()
  
  // Add existing first
  existing.forEach((h) => map.set(h.id, h))
  
  // Override with imported
  imported.forEach((h) => map.set(h.id, h))
  
  return Array.from(map.values())
}

/**
 * Merge notes (imported overwrites existing with same id)
 */
function mergeNotes(existing: Note[], imported: Note[]): Note[] {
  const map = new Map<string, Note>()
  
  // Add existing first
  existing.forEach((n) => map.set(n.id, n))
  
  // Override with imported
  imported.forEach((n) => map.set(n.id, n))
  
  return Array.from(map.values())
}

/**
 * Import user data
 */
export function importUserData(
  data: ExportData,
  options: ImportOptions = {
    merge: true,
    overwriteProgress: true,
    overwriteSettings: true,
  }
): ImportResult {
  const result: ImportResult = {
    status: "success",
    message: "",
    details: {
      highlightsImported: 0,
      notesImported: 0,
      progressRestored: 0,
      settingsRestored: false,
    },
    errors: [],
    warnings: [],
  }
  
  if (typeof window === "undefined") {
    result.status = "failed"
    result.message = "Cannot import data on server side"
    result.errors.push("localStorage is not available on server side")
    return result
  }
  
  try {
    // Import reading states
    if (data.data.readingStates.length > 0) {
      for (const state of data.data.readingStates) {
        try {
          if (options.merge) {
            // Merge with existing data
            const existing = getExistingReadingState(state.bookId, state.messageIndex, state.language)
            
            if (existing) {
              const mergedState: MessageReadingState = {
                ...state,
                highlights: mergeHighlights(existing.highlights, state.highlights),
                notes: mergeNotes(existing.notes, state.notes),
                scrollProgress: options.overwriteProgress ? state.scrollProgress : existing.scrollProgress,
                scrollY: options.overwriteProgress ? state.scrollY : existing.scrollY,
              }
              saveReadingState(mergedState)
            } else {
              saveReadingState(state)
            }
          } else {
            // Replace entirely
            saveReadingState(state)
          }
          
          result.details.highlightsImported += state.highlights.length
          result.details.notesImported += state.notes.length
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "Unknown error"
          result.warnings.push(`Failed to import state for ${state.bookId}:${state.messageIndex}:${state.language}: ${errorMessage}`)
        }
      }
    }
    
    // Import message progress
    if (data.data.messageProgress && Object.keys(data.data.messageProgress).length > 0) {
      for (const [bookId, messageIndex] of Object.entries(data.data.messageProgress)) {
        try {
          const key = `life-study-reader:${bookId}:messageIndex`
          
          if (options.merge && !options.overwriteProgress) {
            const existing = localStorage.getItem(key)
            if (existing !== null) {
              const existingIndex = parseInt(existing, 10)
              if (messageIndex > existingIndex) {
                localStorage.setItem(key, String(messageIndex))
              }
            } else {
              localStorage.setItem(key, String(messageIndex))
            }
          } else {
            localStorage.setItem(key, String(messageIndex))
          }
          
          result.details.progressRestored++
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "Unknown error"
          result.warnings.push(`Failed to restore progress for ${bookId}: ${errorMessage}`)
        }
      }
    }
    
    // Import reader settings
    if (data.data.readerSettings && options.overwriteSettings) {
      try {
        localStorage.setItem("life-study:reader-settings", JSON.stringify(data.data.readerSettings))
        result.details.settingsRestored = true
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error"
        result.warnings.push(`Failed to restore reader settings: ${errorMessage}`)
      }
    }
    
    // Import TTS settings
    if (data.data.ttsSettings && options.overwriteSettings) {
      try {
        localStorage.setItem("life-study:tts-settings", JSON.stringify(data.data.ttsSettings))
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error"
        result.warnings.push(`Failed to restore TTS settings: ${errorMessage}`)
      }
    }
    
    // Determine final status
    if (result.warnings.length > 0) {
      result.status = result.details.highlightsImported > 0 ? "partial" : "failed"
    }
    
    // Generate message
    if (result.status === "success") {
      result.message = `Successfully imported ${result.details.highlightsImported} highlights and ${result.details.notesImported} notes`
    } else if (result.status === "partial") {
      result.message = `Partially imported data with ${result.warnings.length} warnings`
    } else {
      result.message = "Import failed"
    }
    
  } catch (e) {
    result.status = "failed"
    const errorMessage = e instanceof Error ? e.message : "Unknown error"
    result.message = `Import failed: ${errorMessage}`
    result.errors.push(errorMessage)
  }
  
  return result
}

/**
 * Load and validate import file
 */
export async function loadImportFile(file: File): Promise<{
  data: ExportData | null
  validationErrors: ValidationError[]
  parseError: string | null
}> {
  try {
    const text = await readImportFile(file)
    const { data, error } = parseImportFile(text)
    
    if (error || !data) {
      return {
        data: null,
        validationErrors: [],
        parseError: error || "Failed to parse file",
      }
    }
    
    const { valid, errors } = validateExportData(data)
    
    return {
      data: valid ? data : null,
      validationErrors: errors,
      parseError: null,
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error"
    return {
      data: null,
      validationErrors: [],
      parseError: errorMessage,
    }
  }
}

/**
 * Get import preview summary
 */
export function getImportPreview(data: ExportData): {
  totalHighlights: number
  totalNotes: number
  booksCount: number
  hasSettings: boolean
  hasProgress: boolean
  exportedAt: string
  version: string
} {
  const books = new Set(data.data.readingStates.map((s) => s.bookId))
  
  return {
    totalHighlights: data.metadata.totalHighlights,
    totalNotes: data.metadata.totalNotes,
    booksCount: books.size,
    hasSettings: !!data.data.readerSettings,
    hasProgress: !!data.data.messageProgress && Object.keys(data.data.messageProgress).length > 0,
    exportedAt: data.exportedAt,
    version: data.version,
  }
}