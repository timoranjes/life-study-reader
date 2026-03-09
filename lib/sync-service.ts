/**
 * Unified Data Sync Service
 * 
 * This service provides comprehensive sync functionality for all user data:
 * - Saves all user data to localStorage when not logged in
 * - Syncs all user data to Supabase cloud when logged in
 * - Automatically syncs on data changes
 * - Handles conflict resolution using timestamps
 */

import type { Database } from '@/types/database'
import type { Bookmark, BookmarkColor } from '@/types/bookmark'
import type { Highlight, Note, Language, HighlightColor } from '@/lib/reading-data'
import type { TTSSettings, TTSSpeechPosition } from '@/lib/tts-types'
import type { ReadingStats, ReadingGoal, DailyStats, MessageReadRecord } from '@/lib/reading-tracker'

// ============================================================================
// Type Definitions
// ============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSyncAt: string | null
  error: string | null
  pendingChanges: number
}

export interface ReaderSettings {
  theme: 'light' | 'sepia' | 'dark'
  chineseFontFamily: 'serif' | 'sans' | 'kai'
  englishFontFamily: 'serif' | 'sans' | 'mono'
}

export interface LanguageSettings {
  language: Language
}

// Local storage data structure for highlights/notes
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

// Cloud-compatible highlight structure
export interface CloudHighlight {
  id: string
  book_id: string
  chapter: number
  section: number
  start_offset: number
  end_offset: number
  text: string
  color: string
  note: string | null
  created_at: string
  updated_at: string
}

// Cloud-compatible bookmark structure
export interface CloudBookmark {
  id: string
  book_id: string
  chapter: number
  section: number
  title: string | null
  note: string | null
  color?: string // Extended field for local use
  created_at: string
  updated_at: string
}

// Cloud-compatible reading position
export interface CloudReadingPosition {
  id: string
  book_id: string
  chapter: number
  section: number
  scroll_position: number
  last_read_at: string
  created_at: string
  updated_at: string
}

// Cloud-compatible reading stats
export interface CloudReadingStats {
  id: string
  date: string
  books_read: number
  chapters_read: number
  reading_time_minutes: number
  created_at: string
  updated_at: string
}

// Cloud-compatible reading goal
export interface CloudReadingGoal {
  id: string
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  target: number
  unit: 'chapters' | 'minutes' | 'books'
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Event types for sync events
export type SyncEventType = 
  | 'sync:start'
  | 'sync:complete'
  | 'sync:error'
  | 'sync:conflict'
  | 'data:changed'
  | 'auth:changed'

export interface SyncEvent {
  type: SyncEventType
  data?: unknown
  timestamp: string
}

export type SyncEventListener = (event: SyncEvent) => void

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  // Reading data
  READING_STATE: (bookId: string, messageIndex: number, language: Language) =>
    `life-study-reader:${bookId}:${messageIndex}:${language}`,
  MESSAGE_INDEX: (bookId: string) =>
    `life-study-reader:${bookId}:messageIndex`,
  BOOK_LAST_READ: (bookId: string) =>
    `life-study-reader:${bookId}:lastReadAt`,
  
  // Bookmarks
  BOOKMARKS: 'life-study:bookmarks',
  
  // Settings
  READER_SETTINGS: 'life-study:reader-settings',
  TTS_SETTINGS: 'life-study:tts-settings',
  TTS_POSITION: 'life-study:tts-position',
  LANGUAGE: 'life-study:language',
  
  // Reading stats & goals
  READING_STATS: 'reading-stats-v2',
  DAILY_STATS: 'daily-reading-stats',
  READING_GOALS: 'reading-goals-v2',
  MESSAGE_RECORDS: 'message-read-records',
  DONE_MESSAGES: 'done-messages-v1',
  
  // Sync metadata
  SYNC_STATE: 'life-study:sync-state',
  SYNC_QUEUE: 'life-study:sync-queue',
}

// ============================================================================
// Sync Service Class
// ============================================================================

class SyncService {
  private listeners: Map<SyncEventType, Set<SyncEventListener>> = new Map()
  private syncTimeout: NodeJS.Timeout | null = null
  private debounceMs = 2000 // Debounce sync by 2 seconds
  private isInitialized = false
  
  // ============================================================================
  // Initialization
  // ============================================================================
  
  /**
   * Initialize the sync service
   * Sets up event listeners and triggers initial sync if logged in
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    this.isInitialized = true
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
      
      // Listen for storage changes from other tabs
      window.addEventListener('storage', (e) => this.handleStorageChange(e))
    }
    
    // Emit initial state
    this.emitEvent({
      type: 'sync:complete',
      timestamp: new Date().toISOString(),
    })
  }
  
  // ============================================================================
  // Event System
  // ============================================================================
  
  /**
   * Subscribe to sync events
   */
  subscribe(eventType: SyncEventType, listener: SyncEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener)
    }
  }
  
  /**
   * Emit a sync event to all listeners
   */
  private emitEvent(event: SyncEvent): void {
    const listeners = this.listeners.get(event.type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('Error in sync event listener:', error)
        }
      })
    }
  }
  
  // ============================================================================
  // Local Storage Operations
  // ============================================================================
  
  // --- Highlights & Notes ---
  
  /**
   * Get all reading states (highlights/notes) from localStorage
   */
  getAllReadingStates(): MessageReadingState[] {
    if (typeof window === 'undefined') return []
    
    const states: MessageReadingState[] = []
    const pattern = /^life-study-reader:[^:]+:\d+:(simplified|traditional|english)$/
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && pattern.test(key)) {
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const data = JSON.parse(raw)
            const parsed = this.parseReadingStateKey(key)
            if (parsed) {
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
            }
          }
        } catch (error) {
          console.warn(`Failed to parse reading state for key ${key}:`, error)
        }
      }
    }
    
    return states
  }
  
  /**
   * Get reading state for a specific message
   */
  getReadingState(bookId: string, messageIndex: number, language: Language): MessageReadingState | null {
    if (typeof window === 'undefined') return null
    
    const key = STORAGE_KEYS.READING_STATE(bookId, messageIndex, language)
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
   * Save reading state to localStorage
   */
  saveReadingState(state: MessageReadingState): void {
    if (typeof window === 'undefined') return
    
    const key = STORAGE_KEYS.READING_STATE(state.bookId, state.messageIndex, state.language)
    const data = {
      highlights: state.highlights,
      notes: state.notes,
      scrollProgress: state.scrollProgress,
      scrollY: state.scrollY,
      lastReadAt: state.lastReadAt,
    }
    
    localStorage.setItem(key, JSON.stringify(data))
    this.scheduleSync('highlights')
  }
  
  // --- Bookmarks ---
  
  /**
   * Get all bookmarks from localStorage
   */
  getBookmarks(): Bookmark[] {
    if (typeof window === 'undefined') return []
    
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS)
      if (!raw) return []
      const bookmarks = JSON.parse(raw)
      return Array.isArray(bookmarks) ? bookmarks : []
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
      return []
    }
  }
  
  /**
   * Save bookmarks to localStorage
   */
  saveBookmarks(bookmarks: Bookmark[]): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks))
    this.scheduleSync('bookmarks')
  }
  
  // --- Reader Settings ---
  
  /**
   * Get reader settings from localStorage
   */
  getReaderSettings(): ReaderSettings | null {
    if (typeof window === 'undefined') return null
    
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.READER_SETTINGS)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  
  /**
   * Save reader settings to localStorage
   */
  saveReaderSettings(settings: ReaderSettings): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(settings))
    this.scheduleSync('settings')
  }
  
  // --- TTS Settings ---
  
  /**
   * Get TTS settings from localStorage
   */
  getTTSSettings(): TTSSettings | null {
    if (typeof window === 'undefined') return null
    
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TTS_SETTINGS)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  
  /**
   * Save TTS settings to localStorage
   */
  saveTTSSettings(settings: TTSSettings): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(STORAGE_KEYS.TTS_SETTINGS, JSON.stringify(settings))
    this.scheduleSync('settings')
  }
  
  // --- Language Settings ---
  
  /**
   * Get language preference from localStorage
   */
  getLanguage(): Language | null {
    if (typeof window === 'undefined') return null
    
    const raw = localStorage.getItem(STORAGE_KEYS.LANGUAGE)
    if (raw === 'traditional' || raw === 'simplified' || raw === 'english') {
      return raw
    }
    return null
  }
  
  /**
   * Save language preference to localStorage
   */
  saveLanguage(language: Language): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language)
    this.scheduleSync('settings')
  }
  
  // --- Reading Stats & Goals ---
  
  /**
   * Get reading stats from localStorage
   */
  getReadingStats(): ReadingStats | null {
    if (typeof window === 'undefined') return null
    
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.READING_STATS)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  
  /**
   * Save reading stats to localStorage
   */
  saveReadingStats(stats: ReadingStats): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(STORAGE_KEYS.READING_STATS, JSON.stringify(stats))
    this.scheduleSync('stats')
  }
  
  /**
   * Get reading goals from localStorage
   */
  getReadingGoals(): ReadingGoal[] {
    if (typeof window === 'undefined') return []
    
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.READING_GOALS)
      if (!raw) return []
      const goals = JSON.parse(raw)
      return Array.isArray(goals) ? goals : []
    } catch {
      return []
    }
  }
  
  /**
   * Save reading goals to localStorage
   */
  saveReadingGoals(goals: ReadingGoal[]): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(STORAGE_KEYS.READING_GOALS, JSON.stringify(goals))
    this.scheduleSync('stats')
  }
  
  /**
   * Get daily stats from localStorage
   */
  getDailyStats(): DailyStats[] {
    if (typeof window === 'undefined') return []
    
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DAILY_STATS)
      if (!raw) return []
      const stats = JSON.parse(raw)
      return Array.isArray(stats) ? stats : []
    } catch {
      return []
    }
  }
  
  /**
   * Save daily stats to localStorage
   */
  saveDailyStats(stats: DailyStats[]): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(stats))
    this.scheduleSync('stats')
  }
  
  // --- Message Progress ---
  
  /**
   * Get message progress for all books
   */
  getMessageProgress(): Record<string, number> {
    if (typeof window === 'undefined') return {}
    
    const progress: Record<string, number> = {}
    const pattern = /^life-study-reader:([^:]+):messageIndex$/
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const match = key.match(pattern)
        if (match) {
          const bookId = match[1]
          const value = localStorage.getItem(key)
          if (value !== null) {
            progress[bookId] = parseInt(value, 10)
          }
        }
      }
    }
    
    return progress
  }
  
  /**
   * Save message progress for a book
   */
  saveMessageProgress(bookId: string, messageIndex: number): void {
    if (typeof window === 'undefined') return
    
    const key = STORAGE_KEYS.MESSAGE_INDEX(bookId)
    localStorage.setItem(key, messageIndex.toString())
    this.scheduleSync('progress')
  }
  
  /**
   * Save the last read timestamp for a book
   */
  saveBookLastRead(bookId: string): void {
    if (typeof window === 'undefined') return
    
    const key = STORAGE_KEYS.BOOK_LAST_READ(bookId)
    localStorage.setItem(key, new Date().toISOString())
  }
  
  /**
   * Get the last read timestamp for a specific book
   */
  getBookLastRead(bookId: string): string | null {
    if (typeof window === 'undefined') return null
    
    const key = STORAGE_KEYS.BOOK_LAST_READ(bookId)
    return localStorage.getItem(key)
  }
  
  /**
   * Get the most recently read book information
   * Uses book-level lastReadAt timestamps, falls back to any book with reading progress
   */
  getMostRecentBook(): { bookId: string; messageIndex: number; lastReadAt: string } | null {
    if (typeof window === 'undefined') return null
    
    const messageProgress = this.getMessageProgress()
    const bookIds = Object.keys(messageProgress)
    
    if (bookIds.length === 0) return null
    
    // Find the book with the most recent lastReadAt
    let mostRecent: { bookId: string; messageIndex: number; lastReadAt: string } | null = null
    
    // First pass: look for books with book-level lastReadAt
    for (const bookId of bookIds) {
      const lastReadAt = this.getBookLastRead(bookId)
      if (!lastReadAt) continue
      
      const messageIndex = messageProgress[bookId]
      
      if (!mostRecent || new Date(lastReadAt) > new Date(mostRecent.lastReadAt)) {
        mostRecent = {
          bookId,
          messageIndex,
          lastReadAt,
        }
      }
    }
    
    // If we found a book with book-level lastReadAt, return it
    if (mostRecent) return mostRecent
    
    // Fallback: return the book with the highest message index (most progress)
    // This handles the case where no book has the new storage key yet
    let fallbackBook: { bookId: string; messageIndex: number } | null = null
    
    for (const bookId of bookIds) {
      const messageIndex = messageProgress[bookId]
      if (!fallbackBook || messageIndex > fallbackBook.messageIndex) {
        fallbackBook = { bookId, messageIndex }
      }
    }
    
    if (fallbackBook) {
      return {
        ...fallbackBook,
        lastReadAt: new Date().toISOString(), // Use current time as fallback
      }
    }
    
    return null
  }
  
  // --- Sync State ---
  
  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    if (typeof window === 'undefined') {
      return {
        status: 'idle',
        lastSyncAt: null,
        error: null,
        pendingChanges: 0,
      }
    }
    
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SYNC_STATE)
      if (!raw) {
        return {
          status: 'idle',
          lastSyncAt: null,
          error: null,
          pendingChanges: 0,
        }
      }
      return JSON.parse(raw)
    } catch {
      return {
        status: 'idle',
        lastSyncAt: null,
        error: null,
        pendingChanges: 0,
      }
    }
  }
  
  /**
   * Save sync state
   */
  private saveSyncState(state: SyncState): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.SYNC_STATE, JSON.stringify(state))
  }
  
  // ============================================================================
  // Cloud Sync Operations
  // ============================================================================
  
  /**
   * Sync all local data to cloud
   */
  async syncToCloud(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!navigator.onLine) {
      return { success: false, error: 'Offline - cannot sync' }
    }
    
    this.emitEvent({ type: 'sync:start', timestamp: new Date().toISOString() })
    this.saveSyncState({ ...this.getSyncState(), status: 'syncing' })
    
    try {
      // Prepare data for upload
      const readingStates = this.getAllReadingStates()
      const bookmarks = this.getBookmarks()
      const stats = this.getReadingStats()
      const goals = this.getReadingGoals()
      const dailyStats = this.getDailyStats()
      const messageProgress = this.getMessageProgress()
      
      // Transform local data to cloud format
      const cloudHighlights = this.transformHighlightsToCloud(readingStates)
      const cloudNotes = this.transformNotesToCloud(readingStates)
      const cloudBookmarks = this.transformBookmarksToCloud(bookmarks)
      const cloudPositions = this.transformPositionsToCloud(messageProgress, readingStates)
      const cloudStats = this.transformStatsToCloud(dailyStats)
      const cloudGoals = this.transformGoalsToCloud(goals)
      
      // Get user preferences
      const readerSettings = this.getReaderSettings()
      const ttsSettings = this.getTTSSettings()
      const language = this.getLanguage()
      
      // Transform preferences to cloud format
      const cloudUserSettings = readerSettings ? this.transformReaderSettingsToCloud(readerSettings) : null
      const cloudTTSSettings = ttsSettings ? this.transformTTSSettingsToCloud(ttsSettings) : null
      const cloudLanguage = language ? this.transformLanguageToCloud(language) : null
      
      // Upload to cloud
      const response = await fetch('/api/sync/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          userId,
          data: {
            readingPositions: cloudPositions,
            bookmarks: cloudBookmarks,
            highlights: cloudHighlights,
            notes: cloudNotes,
            readingStats: cloudStats,
            readingGoals: cloudGoals,
            userSettings: cloudUserSettings,
            userTTSSettings: cloudTTSSettings,
            userLanguage: cloudLanguage,
          },
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync to cloud')
      }
      
      const now = new Date().toISOString()
      this.saveSyncState({
        status: 'idle',
        lastSyncAt: now,
        error: null,
        pendingChanges: 0,
      })
      
      this.emitEvent({ type: 'sync:complete', timestamp: now })
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.saveSyncState({
        ...this.getSyncState(),
        status: 'error',
        error: errorMessage,
      })
      
      this.emitEvent({
        type: 'sync:error',
        data: { error: errorMessage },
        timestamp: new Date().toISOString(),
      })
      
      return { success: false, error: errorMessage }
    }
  }
  
  /**
   * Sync all data from cloud to local storage
   */
  async syncFromCloud(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!navigator.onLine) {
      return { success: false, error: 'Offline - cannot sync' }
    }
    
    this.emitEvent({ type: 'sync:start', timestamp: new Date().toISOString() })
    this.saveSyncState({ ...this.getSyncState(), status: 'syncing' })
    
    try {
      const response = await fetch(`/api/sync/full?userId=${encodeURIComponent(userId)}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch from cloud')
      }
      
      const cloudData = await response.json()
      
      // Merge cloud data with local data (conflict resolution)
      await this.mergeCloudData(cloudData)
      
      const now = new Date().toISOString()
      this.saveSyncState({
        status: 'idle',
        lastSyncAt: now,
        error: null,
        pendingChanges: 0,
      })
      
      this.emitEvent({ type: 'sync:complete', timestamp: now })
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.saveSyncState({
        ...this.getSyncState(),
        status: 'error',
        error: errorMessage,
      })
      
      this.emitEvent({
        type: 'sync:error',
        data: { error: errorMessage },
        timestamp: new Date().toISOString(),
      })
      
      return { success: false, error: errorMessage }
    }
  }
  
  /**
   * Perform a full sync (both directions)
   */
  async fullSync(userId: string): Promise<{ success: boolean; error?: string }> {
    // First pull from cloud
    const pullResult = await this.syncFromCloud(userId)
    if (!pullResult.success) {
      return pullResult
    }
    
    // Then push local changes
    return this.syncToCloud(userId)
  }
  
  /**
   * Sync a single item (for automatic sync)
   */
  async syncItem(
    userId: string,
    type: 'highlight' | 'bookmark' | 'position' | 'note' | 'stats',
    data: unknown
  ): Promise<{ success: boolean; error?: string }> {
    if (!navigator.onLine) {
      return { success: false, error: 'Offline - cannot sync' }
    }
    
    try {
      // For single item sync, we use the upsert approach
      let payload: Record<string, unknown[]> = {}
      
      switch (type) {
        case 'highlight':
          payload.highlights = [data as CloudHighlight]
          break
        case 'bookmark':
          payload.bookmarks = [data as CloudBookmark]
          break
        case 'position':
          payload.readingPositions = [data as CloudReadingPosition]
          break
        case 'note':
          payload.notes = [data as Database['public']['Tables']['notes']['Insert']]
          break
        case 'stats':
          payload.readingStats = [data as CloudReadingStats]
          break
      }
      
      const response = await fetch('/api/sync/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          userId,
          data: payload,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync item')
      }
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  }
  
  // ============================================================================
  // Data Transformation
  // ============================================================================
  
  /**
   * Transform local highlights to cloud format
   */
  private transformHighlightsToCloud(states: MessageReadingState[]): CloudHighlight[] {
    const highlights: CloudHighlight[] = []
    const now = new Date().toISOString()
    
    for (const state of states) {
      for (const h of state.highlights) {
        highlights.push({
          id: h.id,
          book_id: state.bookId,
          chapter: state.messageIndex,
          section: h.paragraphIndex,
          start_offset: h.startOffset,
          end_offset: h.endOffset,
          text: '', // Note: we don't store the highlighted text locally, would need to be added
          color: h.color,
          note: null, // Notes are stored separately
          created_at: h.createdAt,
          updated_at: h.createdAt, // Use createdAt as we don't track updates for highlights
        })
      }
    }
    
    return highlights
  }
  
  /**
   * Transform local notes to cloud format
   */
  private transformNotesToCloud(states: MessageReadingState[]): Database['public']['Tables']['notes']['Insert'][] {
    const notes: Database['public']['Tables']['notes']['Insert'][] = []
    
    for (const state of states) {
      for (const n of state.notes) {
        notes.push({
          book_id: state.bookId,
          chapter: state.messageIndex,
          section: n.highlightParagraphIndex,
          title: n.quotedText.substring(0, 100), // Use first 100 chars as title
          content: n.content,
        })
      }
    }
    
    return notes
  }
  
  /**
   * Transform local bookmarks to cloud format
   */
  private transformBookmarksToCloud(bookmarks: Bookmark[]): CloudBookmark[] {
    return bookmarks.map(b => ({
      id: b.id,
      book_id: b.bookId,
      chapter: b.messageIndex,
      section: b.paragraphIndex ?? 0,
      title: b.label,
      note: b.note ?? null,
      color: b.color,
      created_at: b.createdAt,
      updated_at: b.updatedAt ?? b.createdAt,
    }))
  }
  
  /**
   * Transform message progress to cloud reading positions
   */
  private transformPositionsToCloud(
    progress: Record<string, number>,
    states: MessageReadingState[]
  ): CloudReadingPosition[] {
    const positions: CloudReadingPosition[] = []
    const now = new Date().toISOString()
    
    // Create a map of latest states per book
    const latestStates = new Map<string, MessageReadingState>()
    for (const state of states) {
      const key = `${state.bookId}:${state.messageIndex}`
      const existing = latestStates.get(state.bookId)
      if (!existing || state.messageIndex > existing.messageIndex) {
        latestStates.set(state.bookId, state)
      }
    }
    
    // Transform to cloud format
    for (const [bookId, messageIndex] of Object.entries(progress)) {
      const state = latestStates.get(bookId)
      positions.push({
        id: '', // Will be generated by database
        book_id: bookId,
        chapter: messageIndex,
        section: state?.scrollProgress ? Math.floor(state.scrollProgress) : 0,
        scroll_position: state?.scrollY ?? 0,
        last_read_at: state?.lastReadAt ?? now,
        created_at: now,
        updated_at: now,
      })
    }
    
    return positions
  }
  
  /**
   * Transform daily stats to cloud format
   */
  private transformStatsToCloud(stats: DailyStats[]): CloudReadingStats[] {
    return stats.map(s => ({
      id: '', // Will be generated by database
      date: s.date,
      books_read: s.booksRead.length,
      chapters_read: s.messagesRead,
      reading_time_minutes: s.readingTimeMinutes,
      created_at: s.date,
      updated_at: new Date().toISOString(),
    }))
  }
  
  /**
   * Transform local goals to cloud format
   */
  private transformGoalsToCloud(goals: ReadingGoal[]): CloudReadingGoal[] {
    return goals.map(g => ({
      id: g.id,
      type: g.type === 'monthly' ? 'monthly' : g.type,
      target: g.target,
      unit: g.unit === 'messages' ? 'chapters' : g.unit,
      start_date: g.periodStart,
      end_date: null,
      is_active: true,
      created_at: g.createdAt,
      updated_at: g.createdAt,
    }))
  }
  
  /**
   * Transform local reader settings to cloud format
   */
  private transformReaderSettingsToCloud(settings: ReaderSettings): Database['public']['Tables']['user_settings']['Insert'] {
    return {
      theme: settings.theme,
      chinese_font_family: settings.chineseFontFamily,
      english_font_family: settings.englishFontFamily,
    }
  }
  
  /**
   * Transform local TTS settings to cloud format
   */
  private transformTTSSettingsToCloud(settings: TTSSettings): Database['public']['Tables']['user_tts_settings']['Insert'] {
    return {
      voice_id: settings.voiceId,
      voice_id_traditional: settings.voiceIdTraditional,
      voice_id_simplified: settings.voiceIdSimplified,
      voice_id_english: settings.voiceIdEnglish,
      rate: settings.rate,
      pitch: settings.pitch,
      volume: settings.volume,
      auto_continue: settings.autoContinue,
      highlight_enabled: true, // Default value
      expand_bible_references: settings.expandBibleReferences,
      normalize_polyphonic_chars: settings.normalizePolyphonicChars,
      remove_structural_markers: settings.removeStructuralMarkers,
      natural_pauses: settings.naturalPauses,
      pause_multiplier: settings.pauseMultiplier,
      emphasize_capitalized: settings.emphasizeCapitalized,
      prefer_neural_voices: settings.preferNeuralVoices,
      engine: settings.engine,
      edge_voice_gender: settings.edgeVoiceGender,
      edge_voice_id: settings.edgeVoiceId,
    }
  }
  
  /**
   * Transform local language to cloud format
   */
  private transformLanguageToCloud(language: Language): Database['public']['Tables']['user_language']['Insert'] {
    return {
      language: language,
    }
  }
  
  // ============================================================================
  // Conflict Resolution & Merge
  // ============================================================================
  
  /**
   * Merge cloud data with local data using timestamp-based conflict resolution
   */
  private async mergeCloudData(cloudData: {
    readingPositions?: CloudReadingPosition[]
    bookmarks?: CloudBookmark[]
    highlights?: CloudHighlight[]
    notes?: Database['public']['Tables']['notes']['Row'][]
    readingStats?: CloudReadingStats[]
    readingGoals?: CloudReadingGoal[]
    userSettings?: Database['public']['Tables']['user_settings']['Row']
    userTTSSettings?: Database['public']['Tables']['user_tts_settings']['Row']
    userLanguage?: Database['public']['Tables']['user_language']['Row']
  }): Promise<void> {
    // Merge bookmarks
    if (cloudData.bookmarks?.length) {
      const localBookmarks = this.getBookmarks()
      const mergedBookmarks = this.mergeBookmarks(localBookmarks, cloudData.bookmarks)
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(mergedBookmarks))
    }
    
    // Merge highlights and notes (stored in reading states)
    if (cloudData.highlights?.length || cloudData.notes?.length) {
      this.mergeHighlightsAndNotes(
        cloudData.highlights || [],
        cloudData.notes || []
      )
    }
    
    // Merge reading stats
    if (cloudData.readingStats?.length) {
      const localDailyStats = this.getDailyStats()
      const mergedStats = this.mergeDailyStats(localDailyStats, cloudData.readingStats)
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(mergedStats))
    }
    
    // Merge reading goals
    if (cloudData.readingGoals?.length) {
      const localGoals = this.getReadingGoals()
      const mergedGoals = this.mergeGoals(localGoals, cloudData.readingGoals)
      localStorage.setItem(STORAGE_KEYS.READING_GOALS, JSON.stringify(mergedGoals))
    }
    
    // Update reading positions
    if (cloudData.readingPositions?.length) {
      this.mergeReadingPositions(cloudData.readingPositions)
    }
    
    // Merge user settings
    if (cloudData.userSettings) {
      this.mergeUserSettings(cloudData.userSettings)
    }
    
    // Merge TTS settings
    if (cloudData.userTTSSettings) {
      this.mergeTTSSettings(cloudData.userTTSSettings)
    }
    
    // Merge language preference
    if (cloudData.userLanguage) {
      this.mergeLanguage(cloudData.userLanguage)
    }
  }
  
  /**
   * Merge local and cloud bookmarks using timestamp
   */
  private mergeBookmarks(local: Bookmark[], cloud: CloudBookmark[]): Bookmark[] {
    const merged = new Map<string, Bookmark>()
    
    // Add all local bookmarks
    for (const b of local) {
      merged.set(b.id, b)
    }
    
    // Merge cloud bookmarks
    for (const cb of cloud) {
      const existing = merged.get(cb.id)
      
      if (!existing) {
        // New from cloud
        merged.set(cb.id, {
          id: cb.id,
          bookId: cb.book_id,
          messageIndex: cb.chapter,
          paragraphIndex: cb.section,
          label: cb.title ?? '',
          color: (cb.color as BookmarkColor) ?? 'default',
          note: cb.note ?? undefined,
          createdAt: cb.created_at,
          updatedAt: cb.updated_at,
        })
      } else {
        // Conflict resolution: use the one with the newer timestamp
        const localTime = new Date(existing.updatedAt ?? existing.createdAt).getTime()
        const cloudTime = new Date(cb.updated_at).getTime()
        
        if (cloudTime > localTime) {
          // Cloud is newer, update local
          merged.set(cb.id, {
            ...existing,
            messageIndex: cb.chapter,
            paragraphIndex: cb.section,
            label: cb.title ?? existing.label,
            note: cb.note ?? existing.note,
            updatedAt: cb.updated_at,
          })
        }
        // If local is newer, keep it
      }
    }
    
    return Array.from(merged.values())
  }
  
  /**
   * Merge highlights and notes into reading states
   */
  private mergeHighlightsAndNotes(
    cloudHighlights: CloudHighlight[],
    cloudNotes: Database['public']['Tables']['notes']['Row'][]
  ): void {
    // Group by book/chapter
    const highlightGroups = new Map<string, CloudHighlight[]>()
    const noteGroups = new Map<string, Database['public']['Tables']['notes']['Row'][]>()
    
    for (const h of cloudHighlights) {
      const key = `${h.book_id}:${h.chapter}`
      if (!highlightGroups.has(key)) {
        highlightGroups.set(key, [])
      }
      highlightGroups.get(key)!.push(h)
    }
    
    for (const n of cloudNotes) {
      if (n.chapter !== null) {
        const key = `${n.book_id}:${n.chapter}`
        if (!noteGroups.has(key)) {
          noteGroups.set(key, [])
        }
        noteGroups.get(key)!.push(n)
      }
    }
    
    // Merge each group
    const allKeys = new Set([...highlightGroups.keys(), ...noteGroups.keys()])
    
    for (const key of allKeys) {
      const [bookId, chapterStr] = key.split(':')
      const messageIndex = parseInt(chapterStr, 10)
      
      // Get existing state for each language
      for (const language of ['simplified', 'traditional', 'english'] as Language[]) {
        const localState = this.getReadingState(bookId, messageIndex, language)
        const cloudHighlightsForState = highlightGroups.get(key) || []
        const cloudNotesForState = noteGroups.get(key) || []
        
        if (localState || cloudHighlightsForState.length || cloudNotesForState.length) {
          const mergedState = this.mergeReadingState(
            localState,
            cloudHighlightsForState,
            cloudNotesForState,
            bookId,
            messageIndex,
            language
          )
          
          const storageKey = STORAGE_KEYS.READING_STATE(bookId, messageIndex, language)
          localStorage.setItem(storageKey, JSON.stringify({
            highlights: mergedState.highlights,
            notes: mergedState.notes,
            scrollProgress: mergedState.scrollProgress,
            scrollY: mergedState.scrollY,
            lastReadAt: mergedState.lastReadAt,
          }))
        }
      }
    }
  }
  
  /**
   * Merge a single reading state
   */
  private mergeReadingState(
    local: MessageReadingState | null,
    cloudHighlights: CloudHighlight[],
    cloudNotes: Database['public']['Tables']['notes']['Row'][],
    bookId: string,
    messageIndex: number,
    language: Language
  ): MessageReadingState {
    const highlights = local?.highlights ? [...local.highlights] : []
    const notes = local?.notes ? [...local.notes] : []
    
    // Merge highlights
    const highlightMap = new Map<string, Highlight>()
    for (const h of highlights) {
      highlightMap.set(h.id, h)
    }
    
    for (const ch of cloudHighlights) {
      const existing = highlightMap.get(ch.id)
      if (!existing) {
        highlightMap.set(ch.id, {
          id: ch.id,
          paragraphIndex: ch.section,
          startOffset: ch.start_offset,
          endOffset: ch.end_offset,
          color: ch.color as HighlightColor,
          createdAt: ch.created_at,
        })
      }
    }
    
    // Merge notes
    const noteMap = new Map<string, Note>()
    for (const n of notes) {
      noteMap.set(n.id, n)
    }
    
    for (const cn of cloudNotes) {
      if (!noteMap.has(cn.id)) {
        noteMap.set(cn.id, {
          id: cn.id,
          highlightId: '', // We don't have this mapping from cloud
          highlightParagraphIndex: cn.section ?? 0,
          quotedText: cn.title,
          content: cn.content,
          createdAt: cn.created_at,
          updatedAt: cn.updated_at,
        })
      }
    }
    
    return {
      bookId,
      messageIndex,
      language,
      highlights: Array.from(highlightMap.values()),
      notes: Array.from(noteMap.values()),
      scrollProgress: local?.scrollProgress ?? 0,
      scrollY: local?.scrollY ?? 0,
      lastReadAt: local?.lastReadAt ?? new Date().toISOString(),
    }
  }
  
  /**
   * Merge daily stats
   */
  private mergeDailyStats(local: DailyStats[], cloud: CloudReadingStats[]): DailyStats[] {
    const merged = new Map<string, DailyStats>()
    
    // Add all local stats
    for (const s of local) {
      merged.set(s.date, s)
    }
    
    // Merge cloud stats
    for (const cs of cloud) {
      const existing = merged.get(cs.date)
      
      if (!existing) {
        merged.set(cs.date, {
          date: cs.date,
          messagesRead: cs.chapters_read,
          readingTimeMinutes: cs.reading_time_minutes,
          booksRead: [], // We don't have this info from cloud
          messageIds: [], // We don't have this info from cloud
        })
      } else {
        // Take the higher values
        merged.set(cs.date, {
          ...existing,
          messagesRead: Math.max(existing.messagesRead, cs.chapters_read),
          readingTimeMinutes: Math.max(existing.readingTimeMinutes, cs.reading_time_minutes),
        })
      }
    }
    
    return Array.from(merged.values())
  }
  
  /**
   * Merge reading goals
   */
  private mergeGoals(local: ReadingGoal[], cloud: CloudReadingGoal[]): ReadingGoal[] {
    const merged = new Map<string, ReadingGoal>()
    
    // Add all local goals
    for (const g of local) {
      merged.set(g.id, g)
    }
    
    // Merge cloud goals
    for (const cg of cloud) {
      const existing = merged.get(cg.id)
      
      if (!existing) {
        merged.set(cg.id, {
          id: cg.id,
          type: cg.type as 'daily' | 'weekly' | 'monthly',
          target: cg.target,
          unit: cg.unit === 'chapters' ? 'messages' : cg.unit as 'messages' | 'minutes',
          progress: 0,
          createdAt: cg.created_at,
          periodStart: cg.start_date,
        })
      } else {
        // Use the one with the newer timestamp
        const localTime = new Date(existing.createdAt).getTime()
        const cloudTime = new Date(cg.created_at).getTime()
        
        if (cloudTime > localTime) {
          merged.set(cg.id, {
            ...existing,
            target: cg.target,
            type: cg.type as 'daily' | 'weekly' | 'monthly',
          })
        }
      }
    }
    
    return Array.from(merged.values())
  }
  
  /**
   * Merge reading positions into localStorage
   */
  private mergeReadingPositions(positions: CloudReadingPosition[]): void {
    for (const pos of positions) {
      const key = STORAGE_KEYS.MESSAGE_INDEX(pos.book_id)
      const existingStr = localStorage.getItem(key)
      const existing = existingStr ? parseInt(existingStr, 10) : -1
      
      if (pos.chapter > existing) {
        localStorage.setItem(key, pos.chapter.toString())
      }
    }
  }
  
  /**
   * Merge user settings from cloud
   */
  private mergeUserSettings(cloudSettings: Database['public']['Tables']['user_settings']['Row']): void {
    const localSettings = this.getReaderSettings()
    
    // If no local settings, use cloud settings
    if (!localSettings) {
      const settings: ReaderSettings = {
        theme: cloudSettings.theme as 'light' | 'sepia' | 'dark',
        chineseFontFamily: cloudSettings.chinese_font_family as 'serif' | 'sans' | 'kai',
        englishFontFamily: cloudSettings.english_font_family as 'serif' | 'sans' | 'mono',
      }
      localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(settings))
      return
    }
    
    // Use timestamp for conflict resolution
    const localTime = new Date().getTime() // Local settings don't have timestamps, assume they're current
    const cloudTime = new Date(cloudSettings.updated_at).getTime()
    
    if (cloudTime > localTime - 60000) { // Cloud is newer (with 1 min tolerance)
      const merged: ReaderSettings = {
        theme: cloudSettings.theme as 'light' | 'sepia' | 'dark',
        chineseFontFamily: cloudSettings.chinese_font_family as 'serif' | 'sans' | 'kai',
        englishFontFamily: cloudSettings.english_font_family as 'serif' | 'sans' | 'mono',
      }
      localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(merged))
    }
  }
  
  /**
   * Merge TTS settings from cloud
   */
  private mergeTTSSettings(cloudSettings: Database['public']['Tables']['user_tts_settings']['Row']): void {
    const localSettings = this.getTTSSettings()
    
    // If no local settings, use cloud settings
    if (!localSettings) {
      const settings: TTSSettings = {
        voiceId: cloudSettings.voice_id,
        voiceIdTraditional: cloudSettings.voice_id_traditional,
        voiceIdSimplified: cloudSettings.voice_id_simplified,
        voiceIdEnglish: cloudSettings.voice_id_english,
        rate: cloudSettings.rate,
        pitch: cloudSettings.pitch,
        volume: cloudSettings.volume,
        autoContinue: cloudSettings.auto_continue,
        expandBibleReferences: cloudSettings.expand_bible_references,
        normalizePolyphonicChars: cloudSettings.normalize_polyphonic_chars,
        removeStructuralMarkers: cloudSettings.remove_structural_markers,
        naturalPauses: cloudSettings.natural_pauses,
        pauseMultiplier: cloudSettings.pause_multiplier,
        emphasizeCapitalized: cloudSettings.emphasize_capitalized,
        preferNeuralVoices: cloudSettings.prefer_neural_voices,
        engine: cloudSettings.engine as 'edge' | 'browser',
        edgeVoiceGender: cloudSettings.edge_voice_gender as 'female' | 'male',
        edgeVoiceId: cloudSettings.edge_voice_id,
      }
      localStorage.setItem(STORAGE_KEYS.TTS_SETTINGS, JSON.stringify(settings))
      return
    }
    
    // Use timestamp for conflict resolution
    const localTime = new Date().getTime()
    const cloudTime = new Date(cloudSettings.updated_at).getTime()
    
    if (cloudTime > localTime - 60000) { // Cloud is newer (with 1 min tolerance)
      const merged: TTSSettings = {
        ...localSettings,
        voiceId: cloudSettings.voice_id || localSettings.voiceId,
        voiceIdTraditional: cloudSettings.voice_id_traditional || localSettings.voiceIdTraditional,
        voiceIdSimplified: cloudSettings.voice_id_simplified || localSettings.voiceIdSimplified,
        voiceIdEnglish: cloudSettings.voice_id_english || localSettings.voiceIdEnglish,
        rate: cloudSettings.rate,
        pitch: cloudSettings.pitch,
        volume: cloudSettings.volume,
        autoContinue: cloudSettings.auto_continue,
        expandBibleReferences: cloudSettings.expand_bible_references,
        normalizePolyphonicChars: cloudSettings.normalize_polyphonic_chars,
        removeStructuralMarkers: cloudSettings.remove_structural_markers,
        naturalPauses: cloudSettings.natural_pauses,
        pauseMultiplier: cloudSettings.pause_multiplier,
        emphasizeCapitalized: cloudSettings.emphasize_capitalized,
        preferNeuralVoices: cloudSettings.prefer_neural_voices,
        engine: cloudSettings.engine as 'edge' | 'browser',
        edgeVoiceGender: cloudSettings.edge_voice_gender as 'female' | 'male',
        edgeVoiceId: cloudSettings.edge_voice_id,
      }
      localStorage.setItem(STORAGE_KEYS.TTS_SETTINGS, JSON.stringify(merged))
    }
  }
  
  /**
   * Merge language preference from cloud
   */
  private mergeLanguage(cloudLanguage: Database['public']['Tables']['user_language']['Row']): void {
    const localLanguage = this.getLanguage()
    
    // If no local language, use cloud language
    if (!localLanguage) {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, cloudLanguage.language)
      return
    }
    
    // Use timestamp for conflict resolution
    const localTime = new Date().getTime()
    const cloudTime = new Date(cloudLanguage.updated_at).getTime()
    
    if (cloudTime > localTime - 60000) { // Cloud is newer (with 1 min tolerance)
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, cloudLanguage.language)
    }
  }
  
  // ============================================================================
  // Utility Functions
  // ============================================================================
  
  /**
   * Parse a reading state storage key
   */
  private parseReadingStateKey(key: string): { bookId: string; messageIndex: number; language: Language } | null {
    const match = key.match(/^life-study-reader:([^:]+):(\d+):(simplified|traditional|english)$/)
    if (!match) return null
    
    return {
      bookId: match[1],
      messageIndex: parseInt(match[2], 10),
      language: match[3] as Language,
    }
  }
  
  /**
   * Schedule a debounced sync operation
   */
  private scheduleSync(type: string): void {
    // Emit data changed event
    this.emitEvent({
      type: 'data:changed',
      data: { type },
      timestamp: new Date().toISOString(),
    })
    
    // Increment pending changes
    const state = this.getSyncState()
    this.saveSyncState({
      ...state,
      pendingChanges: state.pendingChanges + 1,
    })
    
    // Clear existing timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }
    
    // Schedule new sync (will need to be triggered by component with userId)
    // The actual sync is handled by the component that has access to auth
  }
  
  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.emitEvent({
      type: 'sync:start',
      data: { reason: 'back-online' },
      timestamp: new Date().toISOString(),
    })
  }
  
  /**
   * Handle offline event
   */
  private handleOffline(): void {
    const state = this.getSyncState()
    this.saveSyncState({
      ...state,
      status: 'offline',
    })
    
    this.emitEvent({
      type: 'sync:error',
      data: { error: 'Gone offline' },
      timestamp: new Date().toISOString(),
    })
  }
  
  /**
   * Handle storage changes from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key && event.key.startsWith('life-study-')) {
      this.emitEvent({
        type: 'data:changed',
        data: { key: event.key, source: 'other-tab' },
        timestamp: new Date().toISOString(),
      })
    }
  }
  
  /**
   * Clear all local data
   */
  clearAllData(): void {
    if (typeof window === 'undefined') return
    
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('life-study-reader:') ||
        key.startsWith('life-study:') ||
        key.startsWith('reading-') ||
        key.startsWith('daily-') ||
        key.startsWith('done-') ||
        key.startsWith('message-')
      )) {
        keysToRemove.push(key)
      }
    }
    
    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }
  }
  
  /**
   * Export all data for backup
   */
  exportAllData(): {
    readingStates: MessageReadingState[]
    bookmarks: Bookmark[]
    messageProgress: Record<string, number>
    readerSettings: ReaderSettings | null
    ttsSettings: TTSSettings | null
    language: Language | null
    readingStats: ReadingStats | null
    readingGoals: ReadingGoal[]
    dailyStats: DailyStats[]
  } {
    return {
      readingStates: this.getAllReadingStates(),
      bookmarks: this.getBookmarks(),
      messageProgress: this.getMessageProgress(),
      readerSettings: this.getReaderSettings(),
      ttsSettings: this.getTTSSettings(),
      language: this.getLanguage(),
      readingStats: this.getReadingStats(),
      readingGoals: this.getReadingGoals(),
      dailyStats: this.getDailyStats(),
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const syncService = new SyncService()

// Initialize on module load
if (typeof window !== 'undefined') {
  syncService.initialize()
}

export default syncService