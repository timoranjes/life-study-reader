"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ReaderHeader } from "@/components/reader/reader-header"
import { ReaderContent } from "@/components/reader/reader-content"
import { ReaderFooter } from "@/components/reader/reader-footer"
import { TableOfContents } from "@/components/reader/table-of-contents"
import { SettingsPanel } from "@/components/reader/settings-panel"
import { NoteDrawer } from "@/components/reader/note-drawer"
import { StudyNotebook } from "@/components/reader/study-notebook"
import { TTSControls } from "@/components/reader/tts-controls"
import { SignInPrompt } from "@/components/reader/sign-in-prompt"
import { useSync } from "@/hooks/use-sync"
import { TTSSettingsPanel } from "@/components/reader/tts-settings-panel"
import { BookmarkDialog } from "@/components/reader/bookmark-dialog"
import type { FontFamily, Highlight, HighlightColor, Language, Note } from "@/lib/reading-data"
import type { Bookmark } from "@/types/bookmark"
import { useBookmarks, bookmarkLabels } from "@/hooks/use-bookmarks"
import type { TTSSpeechPosition, TTSStatus, TTSSettings as TTSSettingsType, TTSVoice } from "@/lib/tts-types"
import { getBookName } from "@/lib/book-names"
import { useLanguage } from "@/hooks/use-language"
import { formatEnglishTitle } from "@/lib/title-case"
import { useReaderSettings } from "@/hooks/use-reader-settings"
import { isTTSSupported, loadTTSSettings, saveTTSSettings, selectBestVoice, mapVoiceToTTSVoice, getVoicesForLanguage, isServerSideVoice, getVoiceIdKeyForLanguage, getSavedVoiceIdForLanguage } from "@/lib/tts-storage"
import { getDefaultVoiceForLanguage, getVoiceById } from "@/lib/edge-tts-voices"
import { generateCacheKey, getCachedTTSByParams, setCachedTTS, base64ToBlob } from "@/lib/tts-cache"
import { isMessageDone, toggleMessageDone } from "@/lib/reading-tracker"
import { useReadingTimer } from "@/hooks/use-reading-tracker"
import { syncService } from "@/lib/sync-service"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

interface StoredReadingState {
  highlights: Highlight[]
  notes: Note[]
  scrollProgress: number
  scrollY: number // Store absolute scroll position for precise restoration
  lastReadAt: string // Track when the user last read this book
}

interface SearchResultItem {
  type: "content" | "note"
  id: string
  paragraphIndex: number
  snippet: string
}

interface ReaderProps {
  bookData: {
    bookId: string
    bookName: string
    messages: { id: string; title: string; content: { type: string; text: string }[] }[]
  }
  englishData?: {
    bookId: string
    bookName: string
    messages: { id: string; title: string; content: { type: string; text: string }[] }[]
  } | null
}

export function Reader({ bookData, englishData = null }: ReaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Authentication state
  const { isAuthenticated } = useSync()
  
  const [tocOpen, setTocOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)
  const [notebookOpen, setNotebookOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [ttsSettingsOpen, setTTSSettingsOpen] = useState(false)
  const [showMarkAsReadDialog, setShowMarkAsReadDialog] = useState(false)

  // TTS state
  const [ttsStatus, setTTSStatus] = useState<TTSStatus>('idle')
  const [ttsPosition, setTTSPosition] = useState<TTSSpeechPosition | null>(null)
  const [ttsSettings, setTTSSettingsState] = useState<TTSSettingsType>(() => loadTTSSettings())
  const [ttsVoices, setTTSVoices] = useState<TTSVoice[]>([])
  // Use state to avoid hydration mismatch - starts false on both server and client
  const [ttsSupported, setTTSSupported] = useState(false)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSpeakingRef = useRef(false)
  // Edge TTS audio element ref
  const edgeAudioRef = useRef<HTMLAudioElement | null>(null)
  const edgeAudioAbortControllerRef = useRef<AbortController | null>(null)
  // Flag to track intentional stops (so onerror doesn't trigger fallback)
  const edgeTTSIntentionalStopRef = useRef(false)
  const currentParagraphRef = useRef(0)
  const paragraphsRef = useRef<string[]>([])
  // Track live position to avoid stale closure issues
  const liveTTSPositionRef = useRef<TTSSpeechPosition | null>(null)
  // Track paused position for resume
  const pausedTTSPositionRef = useRef<TTSSpeechPosition | null>(null)
  // Track current voice for onended handler to avoid stale closure
  const currentEdgeVoiceRef = useRef<string | null>(null)
  // Track current rate for onended handler to avoid stale closure
  const currentEdgeRateRef = useRef<number>(1)

  // Initialize with 0 to avoid hydration mismatch, then sync with URL/localStorage on client
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isHydrated, setIsHydrated] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [scrollY, setScrollY] = useState(0) // Absolute scroll position for precise restoration
  
  // Ref to track if we should restore scroll position after content renders
  const shouldRestoreScrollRef = useRef(false)
  const scrollYToRestoreRef = useRef(0)
  
  // Bookmarks hook
  const {
    bookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    isLocationBookmarked,
  } = useBookmarks()
  
  // Current bookmark for this message
  const currentBookmark = useMemo(() => {
    return isLocationBookmarked(bookData.bookId, currentMessageIndex)
  }, [bookData.bookId, currentMessageIndex, isLocationBookmarked])

  // State to trigger restoration effect when needed
  const [needsScrollRestore, setNeedsScrollRestore] = useState(false)
  // Ref to prevent scroll jumps during DOM updates (like note additions)
  const isUpdatingNotesRef = useRef(false)
  const preservedScrollYRef = useRef(0)

  // After hydration, sync with URL/localStorage
  useEffect(() => {
    const msgParam = searchParams.get('msg')
    if (msgParam) {
      const idx = parseInt(msgParam, 10) - 1 // URL uses 1-based index
      if (!isNaN(idx) && idx >= 0 && idx < (bookData.messages?.length || 0)) {
        setCurrentMessageIndex(idx)
        setIsHydrated(true)
        return
      }
    }
    
    // Check localStorage
    const stored = localStorage.getItem(`life-study-reader:${bookData.bookId}:messageIndex`)
    if (stored) {
      const idx = parseInt(stored, 10)
      if (!isNaN(idx) && idx >= 0 && idx < (bookData.messages?.length || 0)) {
        setCurrentMessageIndex(idx)
      }
    }
    setIsHydrated(true)
  }, [searchParams, bookData.bookId, bookData.messages?.length])

  // Check TTS support after hydration to avoid SSR mismatch
  useEffect(() => {
    setTTSSupported(isTTSSupported())
  }, [])

  // Settings state
  const [fontSize, setFontSize] = useState(18)
  const { getFontFamily } = useReaderSettings()
  const { language, setLanguage, toSimplified } = useLanguage()
  
  // Track reading time while reader is active
  useReadingTimer(bookData.bookId, true)
  
  // Save book last read timestamp when opening a book
  useEffect(() => {
    if (typeof window === 'undefined') return
    syncService.saveBookLastRead(bookData.bookId)
  }, [bookData.bookId])
  
  // Track if current message is marked as done
  const [isCurrentMessageDone, setIsCurrentMessageDone] = useState(false)
  
  // Check if current message is done when message index changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const messageId = String(currentMessageIndex)
    setIsCurrentMessageDone(isMessageDone(bookData.bookId, messageId))
  }, [bookData.bookId, currentMessageIndex])
  
  // Handler to toggle done status
  const handleMarkAsDone = useCallback(() => {
    const messageId = String(currentMessageIndex)
    const isNowDone = toggleMessageDone(bookData.bookId, messageId)
    setIsCurrentMessageDone(isNowDone)
    
    // Show toast notification
    if (isNowDone) {
      toast.success(
        language === "english" ? "Marked as done" :
        language === "simplified" ? "已标记为完成" : "已標記為完成"
      )
    } else {
      toast.info(
        language === "english" ? "Marked as not done" :
        language === "simplified" ? "已取消完成标记" : "已取消完成標記"
      )
    }
  }, [bookData.bookId, currentMessageIndex, language])
  
  // Get the current font based on language
  const fontFamily = getFontFamily(language === "english")

  // Highlights & Notes state
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  // Track whether data has been loaded for the current storageKey
  // This prevents the save effect from overwriting data with empty state on mount
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  const sourceData = language === "english" && englishData ? englishData : bookData
  const totalMessages = sourceData.messages?.length ?? 0
  const safeIndex = currentMessageIndex >= 0 && currentMessageIndex < totalMessages ? currentMessageIndex : 0
  const currentMessage = sourceData.messages?.[safeIndex] ?? null

  const displayTitle =
    language === "english"
      ? formatEnglishTitle(currentMessage?.title || "")
      : language === "simplified"
        ? toSimplified(currentMessage?.title || "")
        : currentMessage?.title || ""
  const displayBookName =
    language === "simplified"
      ? toSimplified(sourceData.bookName || "")
      : sourceData.bookName || ""
  const currentParagraphs: string[] =
    (currentMessage?.content?.map((c: any) =>
      language === "simplified" ? toSimplified(c.text) : c.text,
    ) as string[]) ?? []

  const storageKey = useMemo(
    () => `life-study-reader:${sourceData.bookId}:${safeIndex}:${language}`,
    [sourceData.bookId, safeIndex, language],
  )

  const handleScroll = useCallback(() => {
    // Don't record scroll position while updating notes
    if (isUpdatingNotesRef.current) return
    
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    if (docHeight > 0) {
      setScrollProgress(Math.min(Math.round((scrollTop / docHeight) * 100), 100))
    }
    setScrollY(scrollTop)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])
  
  // Disable browser's native scroll restoration on mount
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])
  
  // Restore scroll position after content renders
  useEffect(() => {
    if (shouldRestoreScrollRef.current && isDataLoaded && needsScrollRestore) {
      // Use multiple requestAnimationFrame to ensure DOM is fully painted
      const restoreScroll = () => {
        const docHeight = document.documentElement.scrollHeight
        const viewportHeight = window.innerHeight
        const maxScroll = docHeight - viewportHeight
        const targetScroll = Math.min(scrollYToRestoreRef.current, maxScroll)
        
        window.scrollTo({ top: targetScroll, behavior: "instant" })
        shouldRestoreScrollRef.current = false
        setNeedsScrollRestore(false)
      }
      
      // Try multiple times to ensure content is loaded
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          restoreScroll()
        })
      })
    }
  }, [isDataLoaded, needsScrollRestore])

  // Migration function for old data format
  const migrateHighlight = (h: any): Highlight => ({
    id: h.id || `hl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    paragraphIndex: h.paragraphIndex,
    startOffset: h.startOffset,
    endOffset: h.endOffset,
    color: h.color || "yellow",
    noteId: h.noteId,
    createdAt: h.createdAt || new Date().toISOString(),
  })

  const migrateNote = (n: any, highlights: Highlight[]): Note => {
    // Try to find the associated highlight
    const highlight = highlights.find(
      (h) => h.paragraphIndex === n.highlightParagraphIndex && h.noteId === n.id
    )
    return {
      id: n.id,
      highlightId: highlight?.id || "",
      highlightParagraphIndex: n.highlightParagraphIndex,
      quotedText: n.quotedText,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    // Mark data as not loaded when storageKey changes
    setIsDataLoaded(false)

    const raw = window.localStorage.getItem(storageKey)

    if (!raw) {
      setHighlights([])
      setNotes([])
      setScrollProgress(0)
      setScrollY(0)
      setIsDataLoaded(true)
      window.scrollTo({ top: 0, behavior: "instant" })
      return
    }

    try {
      const parsed = JSON.parse(raw) as Partial<StoredReadingState>
      const rawHighlights = Array.isArray(parsed.highlights) ? parsed.highlights : []
      const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : []

      // Migrate highlights to new format
      const nextHighlights = rawHighlights.map(migrateHighlight)
      // Migrate notes with reference to migrated highlights
      const nextNotes = rawNotes.map((n: any) => migrateNote(n, nextHighlights))

      const nextProgress =
        typeof parsed.scrollProgress === "number" && parsed.scrollProgress >= 0 && parsed.scrollProgress <= 100
          ? parsed.scrollProgress
          : 0
      
      const nextScrollY =
        typeof parsed.scrollY === "number" && parsed.scrollY >= 0
          ? parsed.scrollY
          : 0

      setHighlights(nextHighlights)
      setNotes(nextNotes)
      setScrollProgress(nextProgress)
      setScrollY(nextScrollY)
      setIsDataLoaded(true)

      // Restore scroll position after content renders
      if (nextScrollY > 0) {
        shouldRestoreScrollRef.current = true
        scrollYToRestoreRef.current = nextScrollY
        setNeedsScrollRestore(true)
      } else {
        window.scrollTo({ top: 0, behavior: "instant" })
      }
    } catch {
      setHighlights([])
      setNotes([])
      setScrollProgress(0)
      setScrollY(0)
      setIsDataLoaded(true)
      window.scrollTo({ top: 0, behavior: "instant" })
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    // Don't save until data has been loaded to prevent overwriting with empty state
    if (!isDataLoaded) return

    const payload: StoredReadingState = {
      highlights,
      notes,
      scrollProgress,
      scrollY,
      lastReadAt: new Date().toISOString(),
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [storageKey, highlights, notes, scrollProgress, scrollY, isDataLoaded])

  const scrollToParagraph = useCallback((paragraphIndex: number) => {
    if (typeof window === "undefined") return
    const el = document.querySelector<HTMLElement>(`[data-paragraph-index="${paragraphIndex}"]`)
    if (!el) return

    el.scrollIntoView({ behavior: "smooth", block: "center" })
    el.classList.add("paragraph-flash")
    window.setTimeout(() => {
      el.classList.remove("paragraph-flash")
    }, 1200)
  }, [])

  // Title shown in header, language-aware
  const headerTitle = displayTitle || displayBookName || ""

  // Persist message index to URL and localStorage
  const persistMessageIndex = useCallback((index: number) => {
    // Update URL with 1-based message number
    const url = new URL(window.location.href)
    url.searchParams.set('msg', String(index + 1))
    router.replace(url.pathname + url.search, { scroll: false })
    
    // Update localStorage
    localStorage.setItem(`life-study-reader:${bookData.bookId}:messageIndex`, String(index))
  }, [router, bookData.bookId])

  const handlePrev = () => {
    if (safeIndex <= 0) return
    const newIndex = Math.max(0, safeIndex - 1)
    setCurrentMessageIndex(newIndex)
    persistMessageIndex(newIndex)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleNext = () => {
    if (safeIndex >= totalMessages - 1) return
    
    // Check if current message is already marked as done
    const messageId = String(currentMessageIndex)
    const isDone = isMessageDone(bookData.bookId, messageId)
    
    if (!isDone) {
      // Show confirmation dialog instead of navigating immediately
      setShowMarkAsReadDialog(true)
    } else {
      // Already marked as done, proceed with navigation
      const newIndex = Math.min(totalMessages - 1, safeIndex + 1)
      setCurrentMessageIndex(newIndex)
      persistMessageIndex(newIndex)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const confirmMarkAsReadAndNext = () => {
    // Mark the current message as done
    const messageId = String(currentMessageIndex)
    const isNowDone = toggleMessageDone(bookData.bookId, messageId)
    setIsCurrentMessageDone(isNowDone)
    
    // Show toast notification
    toast.success(
      language === "english" ? "Marked as read" :
      language === "simplified" ? "已标记为已读" : "已標記為已讀"
    )
    
    // Navigate to next message
    const newIndex = Math.min(totalMessages - 1, safeIndex + 1)
    setCurrentMessageIndex(newIndex)
    persistMessageIndex(newIndex)
    window.scrollTo({ top: 0, behavior: "smooth" })
    
    // Close the dialog
    setShowMarkAsReadDialog(false)
  }

  const navigateWithoutMarking = () => {
    // Navigate to next message without marking
    const newIndex = Math.min(totalMessages - 1, safeIndex + 1)
    setCurrentMessageIndex(newIndex)
    persistMessageIndex(newIndex)
    window.scrollTo({ top: 0, behavior: "smooth" })
    
    // Close the dialog
    setShowMarkAsReadDialog(false)
  }

  const handleSelectMessage = (index: number) => {
    setCurrentMessageIndex(index)
    persistMessageIndex(index)
    setTocOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Generate unique ID for highlights
  const generateHighlightId = () => `hl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Highlight handlers
  const handleAddHighlight = (
    paragraphIndex: number,
    startOffset: number,
    endOffset: number,
    color: HighlightColor
  ) => {
    // Preserve scroll position before DOM updates
    const currentScrollY = window.scrollY
    isUpdatingNotesRef.current = true
    preservedScrollYRef.current = currentScrollY
    
    setHighlights((prev) => {
      // Find adjacent or overlapping highlights with the same color in the same paragraph
      // Two highlights are adjacent/overlapping if: h.startOffset <= endOffset && h.endOffset >= startOffset
      const adjacentHighlights = prev.filter(
        (h) =>
          h.paragraphIndex === paragraphIndex &&
          h.color === color &&
          h.startOffset <= endOffset &&
          h.endOffset >= startOffset
      )

      if (adjacentHighlights.length > 0) {
        // Merge: calculate the combined range
        const mergedStart = Math.min(startOffset, ...adjacentHighlights.map((h) => h.startOffset))
        const mergedEnd = Math.max(endOffset, ...adjacentHighlights.map((h) => h.endOffset))

        // Check if any of the merged highlights have a note - preserve it
        const highlightWithNote = adjacentHighlights.find((h) => h.noteId)

        // Get IDs of highlights to remove (all adjacent ones will be replaced by merged one)
        const idsToRemove = new Set(adjacentHighlights.map((h) => h.id))
        const otherHighlights = prev.filter((h) => !idsToRemove.has(h.id))

        // Create merged highlight, preserving note if any
        const primaryHighlight = highlightWithNote || adjacentHighlights[0]
        const mergedHighlight: Highlight = {
          ...primaryHighlight,
          startOffset: mergedStart,
          endOffset: mergedEnd,
        }

        return [...otherHighlights, mergedHighlight]
      }

      // No adjacent highlights - create new
      const newHighlight: Highlight = {
        id: generateHighlightId(),
        paragraphIndex,
        startOffset,
        endOffset,
        color,
        createdAt: new Date().toISOString(),
      }
      return [...prev, newHighlight]
    })
    
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      window.scrollTo({ top: preservedScrollYRef.current, behavior: "instant" })
      isUpdatingNotesRef.current = false
    })
  }

  const handleRemoveHighlight = (
    paragraphIndex: number,
    startOffset: number,
    endOffset: number
  ) => {
    // Preserve scroll position before DOM updates
    const currentScrollY = window.scrollY
    isUpdatingNotesRef.current = true
    preservedScrollYRef.current = currentScrollY
    
    // Remove any highlights that overlap with the selected range in this paragraph
    setHighlights((prev) =>
      prev.filter((h) => {
        if (h.paragraphIndex !== paragraphIndex) return true
        // Check overlap: highlight overlaps selection if h.start < endOffset && h.end > startOffset
        const overlaps = h.startOffset < endOffset && h.endOffset > startOffset
        return !overlaps
      })
    )
    
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      window.scrollTo({ top: preservedScrollYRef.current, behavior: "instant" })
      isUpdatingNotesRef.current = false
    })
  }

  // Change color of an existing highlight
  const handleChangeHighlightColor = (highlightId: string, newColor: HighlightColor) => {
    // Preserve scroll position before DOM updates
    const currentScrollY = window.scrollY
    isUpdatingNotesRef.current = true
    preservedScrollYRef.current = currentScrollY
    
    setHighlights((prev) =>
      prev.map((h) => (h.id === highlightId ? { ...h, color: newColor } : h))
    )
    
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      window.scrollTo({ top: preservedScrollYRef.current, behavior: "instant" })
      isUpdatingNotesRef.current = false
    })
  }

  // Add note to an existing highlight (or open existing note)
  const handleAddNoteToHighlight = (highlightId: string) => {
    const highlight = highlights.find((h) => h.id === highlightId)
    if (!highlight) return

    // If already has a note, open it
    if (highlight.noteId) {
      setActiveNoteId(highlight.noteId)
      setNoteDrawerOpen(true)
      return
    }

    // Preserve scroll position before DOM updates
    const currentScrollY = window.scrollY
    isUpdatingNotesRef.current = true
    preservedScrollYRef.current = currentScrollY

    // Create new note for this highlight
    const noteId = `note-${Date.now()}`
    const paraText = currentParagraphs[highlight.paragraphIndex] || ""
    const baseQuotedText = paraText.slice(highlight.startOffset, highlight.endOffset)
    const quotedText = language === "simplified" ? toSimplified(baseQuotedText) : baseQuotedText

    const newNote: Note = {
      id: noteId,
      highlightId: highlight.id,
      highlightParagraphIndex: highlight.paragraphIndex,
      quotedText,
      content: "",
      createdAt: new Date().toISOString(),
    }

    setNotes((prev) => [...prev, newNote])
    setHighlights((prev) =>
      prev.map((h) => (h.id === highlightId ? { ...h, noteId } : h))
    )
    setActiveNoteId(noteId)
    setNoteDrawerOpen(true)
    
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      window.scrollTo({ top: preservedScrollYRef.current, behavior: "instant" })
      isUpdatingNotesRef.current = false
    })
  }

  const handleAddNote = (paragraphIndex: number, startOffset: number, endOffset: number) => {
    // Preserve scroll position before DOM updates
    const currentScrollY = window.scrollY
    isUpdatingNotesRef.current = true
    preservedScrollYRef.current = currentScrollY
    
    const paraText = currentParagraphs[paragraphIndex] || ""
    const baseQuotedText = paraText.slice(startOffset, endOffset)
    const quotedText = language === "simplified" ? toSimplified(baseQuotedText) : baseQuotedText
    const noteId = `note-${Date.now()}`
    const highlightId = generateHighlightId()

    const newHighlight: Highlight = {
      id: highlightId,
      paragraphIndex,
      startOffset,
      endOffset,
      color: "yellow",
      noteId,
      createdAt: new Date().toISOString(),
    }

    const newNote: Note = {
      id: noteId,
      highlightId,
      highlightParagraphIndex: paragraphIndex,
      quotedText,
      content: "",
      createdAt: new Date().toISOString(),
    }

    setHighlights((prev) => [...prev, newHighlight])
    setNotes((prev) => [...prev, newNote])
    setActiveNoteId(noteId)
    setNoteDrawerOpen(true)
    
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      window.scrollTo({ top: preservedScrollYRef.current, behavior: "instant" })
      isUpdatingNotesRef.current = false
    })
  }

  const handleOpenNote = (noteId: string) => {
    setActiveNoteId(noteId)
    setNoteDrawerOpen(true)
  }

  const handleSaveNote = (noteId: string, noteContent: string) => {
    // Preserve scroll position before DOM updates
    const currentScrollY = window.scrollY
    isUpdatingNotesRef.current = true
    preservedScrollYRef.current = currentScrollY
    
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, content: noteContent, updatedAt: new Date().toISOString() } : n
      )
    )
    
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      window.scrollTo({ top: preservedScrollYRef.current, behavior: "instant" })
      isUpdatingNotesRef.current = false
    })
  }

  const handleDeleteNote = (noteId: string) => {
    // Preserve scroll position before DOM updates
    const currentScrollY = window.scrollY
    isUpdatingNotesRef.current = true
    preservedScrollYRef.current = currentScrollY
    
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    // Remove noteId from associated highlight
    setHighlights((prev) =>
      prev.map((h) => (h.noteId === noteId ? { ...h, noteId: undefined } : h))
    )
    setNoteDrawerOpen(false)
    
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      window.scrollTo({ top: preservedScrollYRef.current, behavior: "instant" })
      isUpdatingNotesRef.current = false
    })
  }

  const activeNote = notes.find((n) => n.id === activeNoteId) || null

  // Update paragraphs ref when they change
  useEffect(() => {
    paragraphsRef.current = currentParagraphs
  }, [currentParagraphs])

  // Load TTS voices on mount
  useEffect(() => {
    if (!ttsSupported) return

    const synth = window.speechSynthesis
    synthRef.current = synth

    const loadVoices = () => {
      const voices = synth.getVoices()
      const mapped = voices.map(mapVoiceToTTSVoice)
      setTTSVoices(mapped)
    }

    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices)
      synth.cancel()
    }
  }, [ttsSupported])

  // Auto-select best voice when language changes (only when not playing)
  // BUT respect saved voice preferences
  useEffect(() => {
    if (ttsVoices.length === 0) return
    // Only auto-switch when TTS is not actively playing
    if (ttsStatus === 'playing') return
    
    // Check if there's a saved voice for this language
    const savedVoiceId = getSavedVoiceIdForLanguage(ttsSettings, language)
    
    if (savedVoiceId) {
      // Check if saved voice is available
      const savedVoice = ttsVoices.find(v => v.id === savedVoiceId)
      if (savedVoice) {
        // Saved voice is available - use it
        if (ttsSettings.voiceId !== savedVoiceId) {
          setTTSSettingsState(prev => {
            const newSettings = { ...prev, voiceId: savedVoiceId }
            saveTTSSettings(newSettings)
            return newSettings
          })
        }
        return // Saved voice is already set or just restored
      }
    }
    
    // No saved voice or saved voice not available - auto-select best
    const bestVoice = selectBestVoice(ttsVoices, language)
    if (bestVoice) {
      setTTSSettingsState(prev => {
        const newSettings = { ...prev, voiceId: bestVoice.id }
        saveTTSSettings(newSettings)
        return newSettings
      })
    }
  }, [language, ttsVoices, ttsStatus])

  // Get current TTS voice
  const currentTTSVoice = useMemo(() => {
    if (!ttsSettings.voiceId || ttsVoices.length === 0) return null
    return ttsVoices.find(v => v.id === ttsSettings.voiceId) || null
  }, [ttsSettings.voiceId, ttsVoices])

  // TTS cancel helper
  const cancelTTS = useCallback(() => {
    // Cancel browser TTS
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    utteranceRef.current = null
    
    // Cancel Edge TTS - just pause, don't clear src (that triggers onerror)
    if (edgeAudioRef.current) {
      edgeAudioRef.current.pause()
      // Don't clear src here - it triggers onerror which causes fallback
    }
    if (edgeAudioAbortControllerRef.current) {
      edgeAudioAbortControllerRef.current.abort()
      edgeAudioAbortControllerRef.current = null
    }
    
    isSpeakingRef.current = false
  }, [])

  // Cleanup TTS on component unmount and page refresh
  useEffect(() => {
    // Handle page refresh/browser close - use beforeunload event
    const handleBeforeUnload = () => {
      // Mark as intentional stop to prevent fallback
      edgeTTSIntentionalStopRef.current = true
      // Cancel browser TTS
      if (synthRef.current) {
        synthRef.current.cancel()
      }
      // Cancel Edge TTS audio - pause and clear
      if (edgeAudioRef.current) {
        edgeAudioRef.current.pause()
        edgeAudioRef.current.src = ''
        edgeAudioRef.current = null
      }
    }
    
    // Handle route change - for Next.js client-side navigation
    // We use both popstate and a MutationObserver to detect route changes
    const handleRouteChange = () => {
      console.log('[TTS] Route change detected, stopping TTS')
      // Mark as intentional stop to prevent fallback
      edgeTTSIntentionalStopRef.current = true
      // Cancel browser TTS
      if (synthRef.current) {
        synthRef.current.cancel()
      }
      // Cancel Edge TTS audio - pause and clear
      if (edgeAudioRef.current) {
        edgeAudioRef.current.pause()
        edgeAudioRef.current.src = ''
        edgeAudioRef.current = null
      }
      // Abort any pending fetch
      if (edgeAudioAbortControllerRef.current) {
        edgeAudioAbortControllerRef.current.abort()
        edgeAudioAbortControllerRef.current = null
      }
      // Reset speaking state
      isSpeakingRef.current = false
      // Reset TTS status
      setTTSStatus('idle')
      setTTSPosition(null)
    }
    
    // Use visibilitychange to detect when page is hidden (navigation away)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleRouteChange()
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handleRouteChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      // Cancel any ongoing speech when component unmounts (route change)
      console.log('[TTS] Component unmounting, cleaning up TTS')
      // Mark as intentional stop to prevent fallback
      edgeTTSIntentionalStopRef.current = true
      // Browser TTS
      if (synthRef.current) {
        synthRef.current.cancel()
      }
      // Edge TTS audio - comprehensive cleanup
      if (edgeAudioRef.current) {
        edgeAudioRef.current.pause()
        edgeAudioRef.current.src = ''
        edgeAudioRef.current = null
      }
      // Abort any pending fetch
      if (edgeAudioAbortControllerRef.current) {
        edgeAudioAbortControllerRef.current.abort()
        edgeAudioAbortControllerRef.current = null
      }
      // Reset speaking state
      isSpeakingRef.current = false
      // Reset TTS status (use direct state update to avoid stale closure)
      setTTSStatus('idle')
      setTTSPosition(null)
      
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handleRouteChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Ref to store the latest speakParagraphInternal to avoid stale closures
  // This ensures that callbacks like onend always use the latest voice/rate settings
  const speakParagraphInternalRef = useRef<((idx: number, char: number, voice?: TTSVoice | null) => void) | null>(null)

  // Helper function to find sentence boundary at or before a character index
  // This ensures we resume from a complete sentence rather than mid-word
  const findSentenceBoundary = useCallback((text: string, charIndex: number): number => {
    if (charIndex <= 0) return 0
    
    // Common sentence ending punctuation (handles both Western and Chinese punctuation)
    const sentenceEnders = ['.', '!', '?', '。', '！', '？', '…', '\n']
    
    // Look backwards from charIndex to find the nearest sentence end
    for (let i = charIndex - 1; i >= 0; i--) {
      if (sentenceEnders.includes(text[i])) {
        // Skip any whitespace after the sentence end
        let nextIdx = i + 1
        while (nextIdx < text.length && /\s/.test(text[nextIdx])) {
          nextIdx++
        }
        // Return the position after the sentence end (start of next sentence)
        return nextIdx > charIndex ? charIndex : nextIdx
      }
    }
    
    // No sentence boundary found, find word boundary instead
    // Look for space or punctuation
    for (let i = charIndex - 1; i >= 0; i--) {
      if (/[\s,;:，；：]/.test(text[i])) {
        return i + 1
      }
    }
    
    // No boundary found, start from beginning
    return 0
  }, [])

  // Helper function to split text into chunks at sentence boundaries
  const splitTextIntoChunks = useCallback((text: string, maxLength: number = 400): string[] => {
    if (text.length <= maxLength) return [text]
    
    const chunks: string[] = []
    let remaining = text
    
    while (remaining.length > maxLength) {
      // Try to find a sentence boundary (., !, ?) within the limit
      const searchEnd = Math.min(maxLength, remaining.length)
      let cutPoint = -1
      
      // Look for sentence endings: . ! ? followed by space or end
      for (let i = searchEnd; i > searchEnd - 100 && i > 0; i--) {
        const char = remaining[i]
        if ((char === '.' || char === '!' || char === '?') &&
            (i === remaining.length - 1 || remaining[i + 1] === ' ')) {
          cutPoint = i + 1
          break
        }
      }
      
      // If no sentence boundary found, look for any space
      if (cutPoint === -1) {
        for (let i = searchEnd; i > searchEnd - 50 && i > 0; i--) {
          if (remaining[i] === ' ') {
            cutPoint = i + 1
            break
          }
        }
      }
      
      // If still no cut point, just cut at maxLength
      if (cutPoint === -1) {
        cutPoint = maxLength
      }
      
      chunks.push(remaining.substring(0, cutPoint).trim())
      remaining = remaining.substring(cutPoint).trim()
    }
    
    if (remaining.length > 0) {
      chunks.push(remaining)
    }
    
    return chunks
  }, [])

  // Helper to calculate character offset for a chunk
  const getChunkCharOffset = useCallback((chunks: string[], chunkIndex: number): number => {
    let offset = 0
    for (let i = 0; i < chunkIndex; i++) {
      offset += chunks[i].length
    }
    return offset
  }, [])

  // Edge TTS speak paragraph function
  // Accepts optional voiceOverride and rateOverride to avoid stale closure issue during voice/rate changes
  const speakParagraphWithEdgeTTS = useCallback(async (paragraphIdx: number, chunkIndex: number = 0, skipTitle: boolean = false, voiceOverride?: string, rateOverride?: number) => {
    console.log('[Edge TTS] speakParagraphWithEdgeTTS called with paragraphIdx:', paragraphIdx, 'chunkIndex:', chunkIndex, 'voiceOverride:', voiceOverride, 'rateOverride:', rateOverride)
    const currentParagraphs = paragraphsRef.current
    
    // Get rate - prioritize rateOverride, then fall back to ttsSettings.rate
    // This is defined early to be available in both title and paragraph sections
    const rateToUse = rateOverride !== undefined ? rateOverride : ttsSettings.rate
    
    // Special case: read message number and title first (paragraphIdx = -1)
    if (paragraphIdx === -1 && !skipTitle) {
      const currentMessage = bookData.messages[safeIndex]
      const englishMessage = englishData?.messages[safeIndex]
      
      if (currentMessage) {
        // Use language-specific title format
        let titleText: string
        if (language === 'english') {
          // English: "Message X: [English Title]" - use English data if available
          const englishTitle = englishMessage?.title || currentMessage.title
          titleText = `Message ${safeIndex + 1}: ${englishTitle}`
        } else {
          // Chinese: Check if title already starts with "第X篇" (Arabic or Chinese numerals)
          const chineseTitle = currentMessage.title
          // Match both Arabic numerals (第1篇) and Chinese numerals (第一篇, 第十二篇, etc.)
          const chineseNumeralPattern = /^第([一二三四五六七八九十百]+|\d+)篇/
          if (chineseNumeralPattern.test(chineseTitle)) {
            // Title already has "第X篇" prefix, just read it as-is
            titleText = chineseTitle
          } else {
            // Add "第X篇：" prefix
            titleText = `第${safeIndex + 1}篇：${chineseTitle}`
          }
        }
        console.log('[Edge TTS] Reading title:', titleText)
        
        // Get voice for title - prioritize voiceOverride, then selected voice ID (if matches language), then gender-based default
        let voice: string
        if (voiceOverride) {
          voice = voiceOverride
        } else if (ttsSettings.edgeVoiceId) {
          // Check if the selected voice matches the current language
          const voiceInfo = getVoiceById(ttsSettings.edgeVoiceId)
          if (voiceInfo && voiceInfo.language === language) {
            voice = ttsSettings.edgeVoiceId
          } else {
            voice = getDefaultVoiceForLanguage(language, ttsSettings.edgeVoiceGender)
          }
        } else {
          voice = getDefaultVoiceForLanguage(language, ttsSettings.edgeVoiceGender)
        }
        
        // Reset intentional stop flag when starting new playback
        edgeTTSIntentionalStopRef.current = false
        
        // Create abort controller
        edgeAudioAbortControllerRef.current = new AbortController()
        const signal = edgeAudioAbortControllerRef.current.signal
        
        setTTSStatus('loading')
        
        try {
          const response = await fetch(
            `/api/tts/?text=${encodeURIComponent(titleText)}&voice=${voice}&rate=${rateToUse}`,
            { signal }
          )
          
          if (response.ok) {
            const data = await response.json()
            const audioBase64 = data.audio
            
            // DEBUG: Validate audio data for title
            console.log('[Edge TTS] Title audio received, length:', audioBase64?.length, 'type:', typeof audioBase64)
            if (!audioBase64 || audioBase64.length === 0) {
              console.error('[Edge TTS] DEBUG: Empty title audio data!', { data })
              // Skip title on error, continue with content
              speakParagraphWithEdgeTTS(0, 0, true)
              return
            }
            
            if (!edgeAudioRef.current) {
              edgeAudioRef.current = new Audio()
            }
            
            const blob = base64ToBlob(audioBase64)
            const audioUrl = URL.createObjectURL(blob)
            edgeAudioRef.current.src = audioUrl
            edgeAudioRef.current.playbackRate = rateToUse
            
            setTTSStatus('playing')
            isSpeakingRef.current = true
            
            edgeAudioRef.current.onended = () => {
              URL.revokeObjectURL(audioUrl)
              if (isSpeakingRef.current) {
                // After title, start reading content from paragraph 0
                speakParagraphWithEdgeTTS(0, 0, true)
              }
            }
            
            edgeAudioRef.current.onerror = () => {
              URL.revokeObjectURL(audioUrl)
              // Skip title on error, continue with content
              speakParagraphWithEdgeTTS(0, 0, true)
            }
            
            await edgeAudioRef.current.play()
            return
          }
        } catch (error) {
          console.error('[Edge TTS] Title error:', error)
          // Skip title on error, continue with content
          speakParagraphWithEdgeTTS(0, 0, true)
          return
        }
      }
    }
    
    if (paragraphIdx < 0 || paragraphIdx >= currentParagraphs.length) {
      console.log('[Edge TTS] End of message, paragraphIdx out of bounds')
      // End of message
      if (ttsSettings.autoContinue && safeIndex < totalMessages - 1) {
        handleNext()
        setTTSPosition({
          messageIndex: safeIndex + 1,
          paragraphIndex: 0,
          charIndex: 0,
          charLength: 0,
        })
      } else {
        setTTSStatus('idle')
        setTTSPosition(null)
      }
      return
    }

    const fullText = currentParagraphs[paragraphIdx]
    console.log('[Edge TTS] Text to speak:', fullText?.substring(0, 50))
    if (!fullText || fullText.trim().length === 0) {
      console.log('[Edge TTS] Empty paragraph, skipping to next')
      // Skip empty paragraphs
      speakParagraphWithEdgeTTS(paragraphIdx + 1, 0, true)
      return
    }

    // Split text into chunks if needed
    const chunks = splitTextIntoChunks(fullText, 400)
    console.log('[Edge TTS] Split into', chunks.length, 'chunks')
    
    // Get the current chunk to speak
    const text = chunks[chunkIndex] || fullText
    
    // Calculate character offset for this chunk (for highlighting)
    const charOffset = getChunkCharOffset(chunks, chunkIndex)
    
    // Get Edge TTS voice - prioritize voiceOverride, then selected voice ID (if matches language), then gender-based default
    let voice: string
    if (voiceOverride) {
      // Use the voice passed directly (for immediate voice changes)
      voice = voiceOverride
    } else if (ttsSettings.edgeVoiceId) {
      // Check if the selected voice matches the current language
      const voiceInfo = getVoiceById(ttsSettings.edgeVoiceId)
      if (voiceInfo && voiceInfo.language === language) {
        // Use the specifically selected voice (matches current language)
        voice = ttsSettings.edgeVoiceId
      } else {
        // Voice doesn't match current language, use default for this language
        voice = getDefaultVoiceForLanguage(language, ttsSettings.edgeVoiceGender)
        console.log('[Edge TTS] Voice', ttsSettings.edgeVoiceId, 'does not match language', language, ', using default:', voice)
      }
    } else {
      // Fall back to gender-based default
      voice = getDefaultVoiceForLanguage(language, ttsSettings.edgeVoiceGender)
    }
    console.log('[Edge TTS] Selected voice:', voice, 'edgeVoiceId:', ttsSettings.edgeVoiceId)
    
    // Update refs for onended handler to avoid stale closure issues
    currentEdgeVoiceRef.current = voice
    currentEdgeRateRef.current = rateToUse
    
    // Only cancel previous TTS when starting a new paragraph (not when continuing chunks)
    if (chunkIndex === 0) {
      cancelTTS()
    }
    
    // Reset intentional stop flag when starting new playback
    // This allows errors during normal playback to trigger fallback
    edgeTTSIntentionalStopRef.current = false
    
    // Create new AbortController for this request
    edgeAudioAbortControllerRef.current = new AbortController()
    const signal = edgeAudioAbortControllerRef.current.signal

    setTTSStatus('loading')
    console.log('[Edge TTS] Status set to loading, fetching audio...')

    try {
      // Check cache first
      let audioBase64: string
      console.log('[Edge TTS] Checking cache for:', { text: text.substring(0, 30), voice, rate: rateToUse })
      let cached = await getCachedTTSByParams(text, voice, rateToUse)
      console.log('[Edge TTS] Cache result:', cached ? 'found' : 'not found')
      
      if (cached) {
        audioBase64 = cached.audioBase64
        console.log('[Edge TTS] Using cached audio')
        // Validate cached data before using
        if (!audioBase64 || audioBase64.length === 0) {
          console.error('[Edge TTS] Cached audio is empty, fetching from API instead')
          cached = null  // Force API fetch
        }
      }
      if (!cached) {
        // Fetch from API
        console.log('[Edge TTS] Fetching from API...')
        console.log('[Edge TTS] Fetch URL:', `/api/tts/?text=${encodeURIComponent(text.substring(0, 30))}...&voice=${voice}&rate=${rateToUse}`)
        const response = await fetch(
          `/api/tts/?text=${encodeURIComponent(text)}&voice=${voice}&rate=${rateToUse}`,
          { signal }
        )
        console.log('[Edge TTS] API response status:', response.status)

        if (!response.ok) {
          const data = await response.json()
          if (data.fallback) {
            // Edge TTS unavailable, fall back to browser TTS
            toast.error('Edge TTS unavailable', {
              description: 'Falling back to system voice',
            })
            // Switch to browser engine and retry
            const newSettings = { ...ttsSettings, engine: 'browser' as const }
            saveTTSSettings(newSettings)
            setTTSSettingsState(newSettings)
            // Use browser TTS for this paragraph
            setTimeout(() => {
              if (speakParagraphInternalRef.current) {
                speakParagraphInternalRef.current(paragraphIdx, 0, null)
              }
            }, 100)
            return
          }
          throw new Error(data.error || 'TTS API error')
        }

        const data = await response.json()
        audioBase64 = data.audio
        console.log('[Edge TTS] Received audio, length:', audioBase64?.length, 'type:', typeof audioBase64, 'isTruthy:', !!audioBase64)
        
        // DEBUG: Validate audio data before proceeding
        if (!audioBase64 || audioBase64.length === 0) {
          console.error('[Edge TTS] DEBUG: Empty or missing audio data!', {
            audioBase64,
            dataType: typeof data.audio,
            dataKeys: Object.keys(data),
            fullResponse: data
          })
          throw new Error('Received empty audio data from TTS API')
        }

        // Cache the result
        await setCachedTTS(
          await generateCacheKey(text, voice, rateToUse),
          audioBase64,
          data.timing || [],
          data.duration || 0,
          text,
          voice,
          rateToUse
        )
      }

      // Create audio element and play
      if (!edgeAudioRef.current) {
        edgeAudioRef.current = new Audio()
      }

      const blob = base64ToBlob(audioBase64)
      const audioUrl = URL.createObjectURL(blob)
      
      edgeAudioRef.current.src = audioUrl
      edgeAudioRef.current.playbackRate = rateToUse

      // Set up position tracking with char offset for highlighting across chunks
      const initialPosition = {
        messageIndex: safeIndex,
        paragraphIndex: paragraphIdx,
        charIndex: charOffset, // Use offset for correct highlighting position
        charLength: fullText.length, // Use full text length, not chunk length
      }
      liveTTSPositionRef.current = initialPosition
      setTTSPosition(initialPosition)
      setTTSStatus('playing')
      isSpeakingRef.current = true
      currentParagraphRef.current = paragraphIdx

      // Handle audio end - play next chunk or move to next paragraph
      edgeAudioRef.current.onended = () => {
        console.log('[Edge TTS] Audio ended, isSpeaking:', isSpeakingRef.current, 'chunkIndex:', chunkIndex, 'totalChunks:', chunks.length)
        URL.revokeObjectURL(audioUrl)
        if (isSpeakingRef.current) {
          // Use refs to get the latest voice and rate (avoids stale closure issues)
          const currentVoice = currentEdgeVoiceRef.current
          const currentRate = currentEdgeRateRef.current
          // Check if there are more chunks to play
          if (chunkIndex < chunks.length - 1) {
            // Play next chunk immediately (no delay to reduce pause)
            console.log('[Edge TTS] Playing next chunk:', chunkIndex + 1, 'of', chunks.length)
            speakParagraphWithEdgeTTS(paragraphIdx, chunkIndex + 1, true, currentVoice ?? undefined, currentRate)
          } else {
            // Move to next paragraph
            console.log('[Edge TTS] All chunks done, moving to next paragraph')
            speakParagraphWithEdgeTTS(paragraphIdx + 1, 0, true, currentVoice ?? undefined, currentRate)
          }
        }
      }

      // Handle errors
      edgeAudioRef.current.onerror = () => {
        // DEBUG: Extract MediaError details from the audio element
        // Note: MediaError may not be immediately available when onerror fires
        const audio = edgeAudioRef.current
        const mediaError = audio?.error
        console.error('[Edge TTS] Audio error:', {
          code: mediaError?.code,
          message: mediaError?.message,
          audioSrc: audio?.src?.substring(0, 100),
          networkState: audio?.networkState,
          readyState: audio?.readyState,
          audioBase64Length: audioBase64?.length,
          // Add delay check for MediaError availability
          mediaErrorAvailable: !!mediaError,
        })
        URL.revokeObjectURL(audioUrl)
        
        // Check if this was an intentional stop (navigation, engine switch, etc.)
        if (edgeTTSIntentionalStopRef.current) {
          console.log('[Edge TTS] Intentional stop, skipping fallback')
          edgeTTSIntentionalStopRef.current = false
          return
        }
        
        toast.error('Audio playback error', {
          description: 'Falling back to system voice',
        })
        // Fall back to browser TTS
        const newSettings = { ...ttsSettings, engine: 'browser' as const }
        saveTTSSettings(newSettings)
        setTTSSettingsState(newSettings)
        if (speakParagraphInternalRef.current) {
          speakParagraphInternalRef.current(paragraphIdx, 0, null)
        }
      }

      await edgeAudioRef.current.play()

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return // Request was cancelled
      }
      console.error('[Edge TTS] Error:', error)
      toast.error('Edge TTS error', {
        description: (error as Error).message,
      })
      setTTSStatus('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsSettings, language, safeIndex, totalMessages, handleNext, cancelTTS])

  // TTS speak paragraph internal
  // Accepts optional voiceOverride to avoid stale closure issue during voice changes
  const speakParagraphInternal = useCallback((paragraphIdx: number, startChar: number = 0, voiceOverride?: TTSVoice | null) => {
    const synth = synthRef.current
    // Use voiceOverride if provided, otherwise fall back to currentTTSVoice from state
    const voiceToUse = voiceOverride || currentTTSVoice
    if (!synth || !voiceToUse?.originalVoice) {
      console.log('[TTS DEBUG] speakParagraphInternal - no voice available', { voiceOverride: voiceToUse?.name, currentTTSVoice: currentTTSVoice?.name })
      return
    }

    const currentParagraphs = paragraphsRef.current
    if (paragraphIdx < 0 || paragraphIdx >= currentParagraphs.length) {
      // End of message
      if (ttsSettings.autoContinue && safeIndex < totalMessages - 1) {
        // Move to next message
        handleNext()
        setTTSPosition({
          messageIndex: safeIndex + 1,
          paragraphIndex: 0,
          charIndex: 0,
          charLength: 0,
        })
      } else {
        setTTSStatus('idle')
        setTTSPosition(null)
      }
      return
    }

    const originalText = currentParagraphs[paragraphIdx]
    if (!originalText || originalText.trim().length === 0) {
      // Use ref to avoid stale closure
      if (speakParagraphInternalRef.current) {
        speakParagraphInternalRef.current(paragraphIdx + 1, 0, voiceOverride)
      }
      return
    }

    cancelTTS()

    // Find sentence boundary for smooth continuation
    const actualStartChar = startChar > 0 ? findSentenceBoundary(originalText, startChar) : 0
    const text = actualStartChar > 0 ? originalText.substring(actualStartChar) : originalText
    const adjustedCharIndex = actualStartChar // The offset in the original text

    console.log('[TTS DEBUG] speakParagraphInternal - creating utterance for paragraph:', paragraphIdx, 'startChar:', startChar, 'sentenceBoundary:', actualStartChar, 'text length:', text.length)
    console.log('[TTS DEBUG] speakParagraphInternal - voice:', voiceToUse?.name, 'rate:', ttsSettings.rate, 'isOverride:', !!voiceOverride)
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voiceToUse.originalVoice
    utterance.rate = ttsSettings.rate
    utterance.pitch = ttsSettings.pitch
    utterance.volume = ttsSettings.volume
    utterance.lang = voiceToUse.lang

    currentParagraphRef.current = paragraphIdx
    isSpeakingRef.current = true

    const initialPosition = {
      messageIndex: safeIndex,
      paragraphIndex: paragraphIdx,
      charIndex: adjustedCharIndex, // Use the actual start position in original text
      charLength: text.length,
    }
    // Set both state and live ref for accurate position tracking
    liveTTSPositionRef.current = initialPosition
    setTTSPosition(initialPosition)
    setTTSStatus('playing')

    utterance.onboundary = (event) => {
      console.log('[TTS DEBUG] onboundary event:', event.name, 'charIndex:', event.charIndex, 'charLength:', event.charLength)
      if (event.name === 'word' && isSpeakingRef.current) {
        // Adjust charIndex to account for the substring offset
        const actualCharIndex = adjustedCharIndex + event.charIndex
        const newPosition = {
          messageIndex: safeIndex,
          paragraphIndex: paragraphIdx,
          charIndex: actualCharIndex,
          charLength: event.charLength || 1,
        }
        console.log('[TTS DEBUG] onboundary - updating position:', newPosition)
        // Update both state and live ref for accurate position tracking
        liveTTSPositionRef.current = newPosition
        setTTSPosition(newPosition)
      }
    }

    utterance.onend = () => {
      if (!isSpeakingRef.current) return
      // Use ref to get the latest function with current voice/rate settings
      // This avoids stale closure issues when voice/rate changes during playback
      if (speakParagraphInternalRef.current) {
        speakParagraphInternalRef.current(paragraphIdx + 1, 0)
      }
    }

    utterance.onerror = (event) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        setTTSStatus('idle')
        setTTSPosition(null)
      }
    }

    utteranceRef.current = utterance
    synth.speak(utterance)
  }, [currentTTSVoice, ttsSettings, safeIndex, totalMessages, cancelTTS, handleNext, findSentenceBoundary])

  // Keep the ref updated with the latest speakParagraphInternal
  useEffect(() => {
    speakParagraphInternalRef.current = speakParagraphInternal
  }, [speakParagraphInternal])

  // Speak title with browser TTS before content
  const speakTitleWithBrowserTTS = useCallback(() => {
    const synth = synthRef.current
    const voiceToUse = currentTTSVoice
    if (!synth || !voiceToUse?.originalVoice) {
      console.log('[TTS DEBUG] speakTitleWithBrowserTTS - no voice available')
      // Skip title, start content
      speakParagraphInternal(0, 0)
      return
    }

    const currentMessage = bookData.messages[safeIndex]
    const englishMessage = englishData?.messages[safeIndex]
    
    if (!currentMessage) {
      speakParagraphInternal(0, 0)
      return
    }

    // Build title text with same logic as Edge TTS
    let titleText: string
    if (language === 'english') {
      const englishTitle = englishMessage?.title || currentMessage.title
      titleText = `Message ${safeIndex + 1}: ${englishTitle}`
    } else {
      const chineseTitle = currentMessage.title
      // Match both Arabic numerals (第1篇) and Chinese numerals (第一篇, 第十二篇, etc.)
      const chineseNumeralPattern = /^第([一二三四五六七八九十百]+|\d+)篇/
      if (chineseNumeralPattern.test(chineseTitle)) {
        titleText = chineseTitle
      } else {
        titleText = `第${safeIndex + 1}篇：${chineseTitle}`
      }
    }

    console.log('[TTS DEBUG] speakTitleWithBrowserTTS - reading title:', titleText)

    const utterance = new SpeechSynthesisUtterance(titleText)
    utterance.voice = voiceToUse.originalVoice
    utterance.rate = ttsSettings.rate
    utterance.pitch = ttsSettings.pitch
    utterance.volume = ttsSettings.volume
    utterance.lang = voiceToUse.lang

    setTTSStatus('playing')
    isSpeakingRef.current = true

    utterance.onend = () => {
      console.log('[TTS DEBUG] speakTitleWithBrowserTTS - title finished, starting content')
      // After title, start reading content from paragraph 0
      if (speakParagraphInternalRef.current) {
        speakParagraphInternalRef.current(0, 0)
      }
    }

    utterance.onerror = (event) => {
      // "interrupted" is expected when TTS is cancelled (e.g., switching engines)
      if (event.error === 'interrupted') {
        console.log('[TTS DEBUG] speakTitleWithBrowserTTS - interrupted (expected)')
      } else {
        console.log('[TTS DEBUG] speakTitleWithBrowserTTS - error:', event.error)
      }
      // Skip title on error, continue with content
      if (speakParagraphInternalRef.current) {
        speakParagraphInternalRef.current(0, 0)
      }
    }

    synth.speak(utterance)
  }, [currentTTSVoice, ttsSettings, safeIndex, bookData, englishData, language, speakParagraphInternal])

  // TTS handlers
  const handleTTSPlay = useCallback(() => {
    console.log('[TTS DEBUG] handleTTSPlay called', {
      ttsStatus,
      ttsPosition,
      engine: ttsSettings.engine,
      pausedTTSPositionRef: pausedTTSPositionRef.current,
      liveTTSPositionRef: liveTTSPositionRef.current,
    })
    
    // Guard: Don't start new speech if already loading
    if (ttsStatus === 'loading') {
      console.log('[TTS DEBUG] handleTTSPlay - already loading, ignoring')
      return
    }
    
    // Check which engine to use
    if (ttsSettings.engine === 'edge') {
      // Edge TTS
      if (ttsStatus === 'paused' && edgeAudioRef.current) {
        // Resume Edge TTS audio
        edgeAudioRef.current.play()
        setTTSStatus('playing')
        console.log('[TTS DEBUG] handleTTSPlay - resumed Edge TTS audio')
      } else if (ttsPosition) {
        // Resume from saved position (skip title)
        speakParagraphWithEdgeTTS(ttsPosition.paragraphIndex, 0, true)
      } else {
        // Start fresh - read title first (paragraphIdx = -1 triggers title reading)
        speakParagraphWithEdgeTTS(-1, 0, false)
      }
    } else {
      // Browser TTS
      if (ttsStatus === 'paused' && synthRef.current) {
        // Use browser's native resume which preserves position internally
        synthRef.current.resume()
        setTTSStatus('playing')
        console.log('[TTS DEBUG] handleTTSPlay - used synth.resume()')
      } else if (ttsPosition) {
        speakParagraphInternal(ttsPosition.paragraphIndex, ttsPosition.charIndex)
      } else {
        // Start fresh - read title first, then content
        speakTitleWithBrowserTTS()
      }
    }
  }, [ttsStatus, ttsPosition, ttsSettings.engine, speakParagraphInternal, speakParagraphWithEdgeTTS])

  const handleTTSPause = useCallback(() => {
    console.log('[TTS DEBUG] handleTTSPause called', {
      ttsStatus,
      engine: ttsSettings.engine,
      ttsPosition,
      liveTTSPositionRef: liveTTSPositionRef.current,
    })
    
    if (ttsStatus !== 'playing') return
    
    if (ttsSettings.engine === 'edge' && edgeAudioRef.current) {
      // Pause Edge TTS audio
      edgeAudioRef.current.pause()
      setTTSStatus('paused')
      console.log('[TTS DEBUG] handleTTSPause - paused Edge TTS audio')
    } else if (synthRef.current) {
      // Use browser's native pause which preserves position internally
      synthRef.current.pause()
      setTTSStatus('paused')
      console.log('[TTS DEBUG] handleTTSPause - used synth.pause()')
    }
  }, [ttsStatus, ttsSettings.engine])

  const handleTTSStop = useCallback(() => {
    // Mark as intentional stop to prevent fallback
    edgeTTSIntentionalStopRef.current = true
    cancelTTS()
    setTTSStatus('idle')
    setTTSPosition(null)
  }, [cancelTTS])

  const handleTTSNext = useCallback(() => {
    const currentIdx = ttsPosition?.paragraphIndex ?? -1
    const nextIdx = currentIdx + 1
    const currentParagraphs = paragraphsRef.current
    
    if (nextIdx < currentParagraphs.length) {
      cancelTTS()
      if (ttsSettings.engine === 'edge') {
        speakParagraphWithEdgeTTS(nextIdx)
      } else {
        speakParagraphInternal(nextIdx, 0)
      }
    } else if (ttsSettings.autoContinue && safeIndex < totalMessages - 1) {
      cancelTTS()
      handleNext()
    }
  }, [ttsPosition, ttsSettings.autoContinue, ttsSettings.engine, safeIndex, totalMessages, cancelTTS, speakParagraphInternal, speakParagraphWithEdgeTTS, handleNext])

  const handleTTSPrev = useCallback(() => {
    const currentIdx = ttsPosition?.paragraphIndex ?? 0
    const prevIdx = Math.max(0, currentIdx - 1)
    cancelTTS()
    if (ttsSettings.engine === 'edge') {
      speakParagraphWithEdgeTTS(prevIdx)
    } else {
      speakParagraphInternal(prevIdx, 0)
    }
  }, [ttsPosition, ttsSettings.engine, cancelTTS, speakParagraphInternal, speakParagraphWithEdgeTTS])

  const handleTTSClick = useCallback(() => {
    if (ttsStatus === 'playing' || ttsStatus === 'paused') {
      handleTTSStop()
    } else {
      handleTTSPlay()
    }
  }, [ttsStatus, handleTTSPlay, handleTTSStop])

  const handleTTSRateChange = useCallback((rate: number) => {
    const isCurrentlyPlaying = ttsStatus === 'playing'
    const isPaused = ttsStatus === 'paused'
    const currentParagraph = currentParagraphRef.current
    const savedPosition = liveTTSPositionRef.current
    
    // Store position before any changes
    const paragraphToResumeFrom = savedPosition?.paragraphIndex ?? (currentParagraph >= 0 ? currentParagraph : (ttsPosition?.paragraphIndex ?? 0))
    const charToResumeFrom = savedPosition?.charIndex ?? 0
    
    // Cancel current speech if playing
    if (isCurrentlyPlaying || isPaused) {
      cancelTTS()
    }
    
    // Update the rate settings
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, rate }
      saveTTSSettings(newSettings)
      return newSettings
    })
    
    // Restart speech with new rate if was playing/paused
    if (isCurrentlyPlaying || isPaused) {
      setTimeout(() => {
        // Check which engine to use for resuming
        const currentEngine = ttsSettings.engine
        if (currentEngine === 'edge') {
          // Pass rate as rateOverride to avoid stale closure issue
          speakParagraphWithEdgeTTS(paragraphToResumeFrom, 0, true, undefined, rate)
        } else if (speakParagraphInternalRef.current) {
          speakParagraphInternalRef.current(paragraphToResumeFrom, charToResumeFrom)
        }
      }, 50)
    }
  }, [ttsStatus, ttsPosition, cancelTTS, ttsSettings.engine, speakParagraphWithEdgeTTS])

  const handleTTSVoiceChange = useCallback((voiceId: string) => {
    const isCurrentlyPlaying = ttsStatus === 'playing'
    const isPaused = ttsStatus === 'paused'
    const currentParagraph = currentParagraphRef.current
    const savedPosition = liveTTSPositionRef.current
    
    console.log('[TTS DEBUG] handleTTSVoiceChange called', {
      voiceId,
      isCurrentlyPlaying,
      isPaused,
      ttsPosition,
      currentParagraphRef: currentParagraph,
      liveTTSPositionRef: savedPosition,
      currentTTSVoice_beforeUpdate: currentTTSVoice?.name,
    })
    
    // Store the position BEFORE any cancellation
    const paragraphToResumeFrom = savedPosition?.paragraphIndex ?? (currentParagraph >= 0 ? currentParagraph : (ttsPosition?.paragraphIndex ?? 0))
    const charToResumeFrom = savedPosition?.charIndex ?? 0
    
    console.log('[TTS DEBUG] handleTTSVoiceChange - captured position to resume:', { paragraphToResumeFrom, charToResumeFrom })
    
    // If playing, use native pause to preserve position
    if (isCurrentlyPlaying && synthRef.current) {
      synthRef.current.pause()
    }
    
    // Cancel current speech
    if (isCurrentlyPlaying || isPaused) {
      cancelTTS()
    }
    
    // Update the voice settings - save to both voiceId and language-specific field
    setTTSSettingsState(prev => {
      const languageKey = getVoiceIdKeyForLanguage(language)
      const newSettings = {
        ...prev,
        voiceId,
        [languageKey]: voiceId  // Save to language-specific field for persistence
      }
      saveTTSSettings(newSettings)
      console.log('[TTS DEBUG] handleTTSVoiceChange - updated settings with voiceId:', voiceId, 'languageKey:', languageKey)
      return newSettings
    })
    
    // If TTS was playing or paused, restart from current paragraph with new voice
    if (isCurrentlyPlaying || isPaused) {
      // Find the voice directly from ttsVoices to pass explicitly to speakParagraphInternal
      // This avoids the stale closure issue where currentTTSVoice hasn't updated yet
      const selectedVoice = ttsVoices.find(v => v.id === voiceId)
      console.log('[TTS DEBUG] handleTTSVoiceChange - restarting at paragraph:', paragraphToResumeFrom, 'char:', charToResumeFrom, 'with voice:', selectedVoice?.name)
      
      // Delay to allow speech cancellation to complete
      // Server-side voices (Google) need more time to initialize
      const isServerVoice = selectedVoice && isServerSideVoice(selectedVoice)
      const delay = isServerVoice ? 150 : 50
      
      setTimeout(() => {
        speakParagraphInternal(paragraphToResumeFrom, charToResumeFrom, selectedVoice || null)
      }, delay)
    }
  }, [ttsStatus, ttsPosition, cancelTTS, speakParagraphInternal, ttsVoices])

  const handleTTSAutoContinueChange = useCallback((enabled: boolean) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, autoContinue: enabled }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  const handleTTSExpandBibleReferencesChange = useCallback((enabled: boolean) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, expandBibleReferences: enabled }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  const handleTTSNormalizePolyphonicCharsChange = useCallback((enabled: boolean) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, normalizePolyphonicChars: enabled }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  const handleTTSRemoveStructuralMarkersChange = useCallback((enabled: boolean) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, removeStructuralMarkers: enabled }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  // Naturalness settings handlers
  const handleTTSNaturalPausesChange = useCallback((enabled: boolean) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, naturalPauses: enabled }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  const handleTTSPauseMultiplierChange = useCallback((multiplier: number) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, pauseMultiplier: multiplier }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  const handleTTSEmphasizeCapitalizedChange = useCallback((enabled: boolean) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, emphasizeCapitalized: enabled }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  const handleTTSPreferNeuralVoicesChange = useCallback((enabled: boolean) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, preferNeuralVoices: enabled }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  // Edge TTS settings handlers
  const handleTTSEngineChange = useCallback((engine: 'edge' | 'browser') => {
    // Capture current playback state before stopping
    const wasPlaying = ttsStatus === 'playing'
    const wasPaused = ttsStatus === 'paused'
    const currentPosition = ttsPosition || liveTTSPositionRef.current
    
    console.log('[TTS DEBUG] handleTTSEngineChange', {
      engine,
      wasPlaying,
      wasPaused,
      currentPosition
    })
    
    // Mark as intentional stop to prevent fallback
    edgeTTSIntentionalStopRef.current = true
    // Stop any current TTS when switching engines
    cancelTTS()
    
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, engine }
      saveTTSSettings(newSettings)
      return newSettings
    })
    
    // If TTS was playing or paused, continue with the new engine from the same position
    if (wasPlaying || wasPaused) {
      if (currentPosition) {
        // Resume from saved position (skip title since we're mid-content)
        setTTSStatus('loading')
        if (engine === 'edge') {
          speakParagraphWithEdgeTTS(currentPosition.paragraphIndex, 0, true)
        } else {
          speakParagraphInternal(currentPosition.paragraphIndex, currentPosition.charIndex)
        }
      } else {
        // No position saved, start fresh
        setTTSStatus('loading')
        if (engine === 'edge') {
          speakParagraphWithEdgeTTS(-1, 0, false)
        } else {
          speakParagraphInternal(0, 0)
        }
      }
    } else {
      // Not playing, just update state
      setTTSStatus('idle')
      setTTSPosition(null)
    }
  }, [cancelTTS, ttsStatus, ttsPosition, speakParagraphInternal, speakParagraphWithEdgeTTS])

  const handleTTSEdgeVoiceGenderChange = useCallback((gender: 'female' | 'male') => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, edgeVoiceGender: gender }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  const handleTTSEdgeVoiceChange = useCallback((voiceId: string) => {
    // Capture current playback state before stopping
    const wasPlaying = ttsStatus === 'playing'
    const wasPaused = ttsStatus === 'paused'
    const isLoading = ttsStatus === 'loading'
    const currentPosition = ttsPosition || liveTTSPositionRef.current
    // Consider TTS active if playing, paused, loading, or has a position
    const isTTSActive = wasPlaying || wasPaused || isLoading || currentPosition
    
    console.log('[TTS DEBUG] handleTTSEdgeVoiceChange', {
      voiceId,
      wasPlaying,
      wasPaused,
      isLoading,
      currentPosition,
      isTTSActive
    })
    
    // Mark as intentional stop to prevent fallback
    edgeTTSIntentionalStopRef.current = true
    // Stop current TTS
    cancelTTS()
    
    // Update settings with the new voice ID
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, edgeVoiceId: voiceId }
      saveTTSSettings(newSettings)
      return newSettings
    })
    
    // If TTS was active, restart with the new voice from the same position
    // Pass the new voice ID and current rate directly to avoid stale state issue
    const currentRate = ttsSettings.rate
    if (isTTSActive) {
      if (currentPosition) {
        // Resume from saved position (skip title since we're mid-content)
        setTTSStatus('loading')
        speakParagraphWithEdgeTTS(currentPosition.paragraphIndex, 0, true, voiceId, currentRate)
      } else {
        // No position saved, start fresh
        setTTSStatus('loading')
        speakParagraphWithEdgeTTS(-1, 0, false, voiceId, currentRate)
      }
    } else {
      // Not playing, just update state
      setTTSStatus('idle')
      setTTSPosition(null)
    }
  }, [cancelTTS, ttsStatus, ttsPosition, speakParagraphWithEdgeTTS])

  // Stop TTS when message changes
  useEffect(() => {
    handleTTSStop()
  }, [safeIndex])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ReaderHeader
        title={headerTitle}
        onMenuClick={() => setTocOpen(true)}
        onFontClick={() => setSettingsOpen(true)}
        onNotebookClick={() => setNotebookOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
        onTTSClick={handleTTSClick}
        onBookmarkClick={() => {
          setEditingBookmark(currentBookmark || null)
          setBookmarkDialogOpen(true)
        }}
        language={language}
        ttsStatus={ttsStatus}
        isTTSSupported={ttsSupported}
        currentBookmark={currentBookmark}
        onMarkAsDone={handleMarkAsDone}
        isMessageDone={isCurrentMessageDone}
      />

      {/* Sign-In Prompt - only show when not authenticated */}
      {!isAuthenticated && (
        <div className="mt-14 mx-auto max-w-2xl px-6">
          <SignInPrompt language={language} />
        </div>
      )}

      {language === "english" && !englishData && (
        <div className="mt-14 mx-auto max-w-2xl px-6">
          <div className="rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
            English version of this book has not been downloaded yet.
            <button
              onClick={() => setLanguage("traditional")}
              className="ml-2 inline-flex items-center px-2 py-1 rounded bg-primary text-primary-foreground text-xs"
            >
              繁
            </button>
          </div>
        </div>
      )}

      <main className={cn("flex-1 pt-[4.5rem] md:pt-14 bg-background", ttsStatus !== 'idle' ? "pb-24" : "pb-16")}>
        <ReaderContent
          title={displayTitle}
          subtitle={displayBookName}
          paragraphs={currentParagraphs}
          contentItems={currentMessage?.content ?? []}
          fontSize={fontSize}
          fontFamily={fontFamily}
          language={language}
          bookName={getBookName(bookData.bookId, language, bookData.bookName || "")}
          messageId={currentMessage?.id || ""}
          highlights={highlights}
          notes={notes}
          onAddHighlight={handleAddHighlight}
          onRemoveHighlight={handleRemoveHighlight}
          onAddNote={handleAddNote}
          onOpenNote={handleOpenNote}
          onChangeHighlightColor={handleChangeHighlightColor}
          onAddNoteToHighlight={handleAddNoteToHighlight}
          ttsStatus={ttsStatus}
          ttsPosition={ttsPosition}
        />
      </main>

      <ReaderFooter
        progress={scrollProgress}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={safeIndex > 0}
        hasNext={safeIndex < totalMessages - 1}
        language={language}
      />

      <TableOfContents
        open={tocOpen}
        onOpenChange={setTocOpen}
        bookId={bookData.bookId || ""}
        bookName={bookData.bookName || ""}
        messages={bookData.messages || []}
        englishMessages={englishData?.messages || undefined}
        currentMessageIndex={safeIndex}
        onSelectMessage={handleSelectMessage}
        fontFamily={fontFamily}
      />

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        language={language}
        onLanguageChange={setLanguage}
      />

      <NoteDrawer
        open={noteDrawerOpen}
        onOpenChange={setNoteDrawerOpen}
        note={activeNote}
        highlight={activeNote ? highlights.find((h) => h.id === activeNote.highlightId) : null}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        onChangeColor={handleChangeHighlightColor}
        language={language}
      />

      <StudyNotebook
        open={notebookOpen}
        onOpenChange={setNotebookOpen}
        highlights={highlights}
        notes={notes}
        paragraphs={currentParagraphs}
        language={language}
        onOpenNote={(noteId) => {
          setNotebookOpen(false)
          handleOpenNote(noteId)
        }}
        onJumpToHighlight={(paragraphIndex) => {
          setNotebookOpen(false)
          scrollToParagraph(paragraphIndex)
        }}
        onSpeakParagraph={(paragraphIndex) => {
          setNotebookOpen(false)
          if (ttsSettings.engine === 'edge') {
            speakParagraphWithEdgeTTS(paragraphIndex)
          } else {
            speakParagraphInternal(paragraphIndex, 0)
          }
        }}
      />

      <SearchPanel
        open={searchOpen}
        onOpenChange={setSearchOpen}
        paragraphs={currentParagraphs}
        notes={notes}
        language={language}
        onJumpToParagraph={(paragraphIndex) => {
          setSearchOpen(false)
          scrollToParagraph(paragraphIndex)
        }}
        onOpenNote={(noteId, paragraphIndex) => {
          setSearchOpen(false)
          scrollToParagraph(paragraphIndex)
          handleOpenNote(noteId)
        }}
      />

      {/* TTS Controls - shown when TTS is active */}
      {ttsStatus !== 'idle' && (
        <TTSControls
          status={ttsStatus}
          position={ttsPosition}
          settings={ttsSettings}
          totalParagraphs={currentParagraphs.length}
          onPlay={handleTTSPlay}
          onPause={handleTTSPause}
          onStop={handleTTSStop}
          onNext={handleTTSNext}
          onPrev={handleTTSPrev}
          onRateChange={handleTTSRateChange}
          onSettingsClick={() => setTTSSettingsOpen(true)}
          language={language}
        />
      )}

      {/* TTS Settings Panel */}
      <TTSSettingsPanel
        open={ttsSettingsOpen}
        onOpenChange={setTTSSettingsOpen}
        settings={ttsSettings}
        availableVoices={ttsVoices}
        currentLanguage={language}
        onVoiceChange={handleTTSVoiceChange}
        onRateChange={handleTTSRateChange}
        onAutoContinueChange={handleTTSAutoContinueChange}
        onNaturalPausesChange={handleTTSNaturalPausesChange}
        onPauseMultiplierChange={handleTTSPauseMultiplierChange}
        onEmphasizeCapitalizedChange={handleTTSEmphasizeCapitalizedChange}
        onPreferNeuralVoicesChange={handleTTSPreferNeuralVoicesChange}
        onEngineChange={handleTTSEngineChange}
        onEdgeVoiceGenderChange={handleTTSEdgeVoiceGenderChange}
        onEdgeVoiceChange={handleTTSEdgeVoiceChange}
      />
      
      {/* Bookmark Dialog */}
      <BookmarkDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        language={language}
        bookmark={editingBookmark}
        onSave={(data) => {
          if (editingBookmark) {
            // Update existing bookmark
            updateBookmark(editingBookmark.id, {
              label: data.label,
              color: data.color,
              note: data.note,
            })
            toast.success(bookmarkLabels[language].bookmarkUpdated)
          } else {
            // Add new bookmark
            addBookmark({
              bookId: bookData.bookId,
              messageIndex: currentMessageIndex,
              label: data.label,
              color: data.color,
              note: data.note,
            })
            toast.success(bookmarkLabels[language].bookmarkAdded)
          }
          setEditingBookmark(null)
        }}
        onDelete={editingBookmark ? () => {
          deleteBookmark(editingBookmark.id)
          toast.success(bookmarkLabels[language].bookmarkDeleted)
          setEditingBookmark(null)
        } : undefined}
        defaultLabel={currentMessage?.title || ""}
      />

      {/* Mark as Read Confirmation Dialog */}
      <AlertDialog open={showMarkAsReadDialog} onOpenChange={setShowMarkAsReadDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "english" ? "Mark as Read?" :
               language === "simplified" ? "标记为已读？" : "標記為已讀？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "english" ? "Would you like to mark this message as read before proceeding to the next one?" :
               language === "simplified" ? "是否在进入下一篇信息前将当前信息标记为已读？" : "是否在進入下一篇信息前將當前信息標記為已讀？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={navigateWithoutMarking}>
              {language === "english" ? "Skip" :
               language === "simplified" ? "跳过" : "跳過"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkAsReadAndNext}>
              {language === "english" ? "Mark as Read" :
               language === "simplified" ? "标记已读" : "標記已讀"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface SearchPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paragraphs: string[]
  notes: Note[]
  language: Language
  onJumpToParagraph: (paragraphIndex: number) => void
  onOpenNote: (noteId: string, paragraphIndex: number) => void
}

function SearchPanel({
  open,
  onOpenChange,
  paragraphs,
  notes,
  language,
  onJumpToParagraph,
  onOpenNote,
}: SearchPanelProps) {
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"content" | "notes">("content")

  const trimmedQuery = query.trim()

  const results = useMemo<SearchResultItem[]>(() => {
    if (!trimmedQuery) return []
    const q = trimmedQuery.toLowerCase()
    const items: SearchResultItem[] = []

    if (activeTab === "content") {
      paragraphs.forEach((text, index) => {
        const lower = text.toLowerCase()
        const idx = lower.indexOf(q)
        if (idx !== -1) {
          const start = Math.max(idx - 30, 0)
          const end = Math.min(idx + trimmedQuery.length + 30, text.length)
          const snippet = text.slice(start, end)
          items.push({
            type: "content",
            id: `p-${index}`,
            paragraphIndex: index,
            snippet,
          })
        }
      })
    } else {
      notes.forEach((note) => {
        const source = `${note.quotedText} ${note.content}`
        const lower = source.toLowerCase()
        const idx = lower.indexOf(q)
        if (idx !== -1) {
          const start = Math.max(idx - 40, 0)
          const end = Math.min(idx + trimmedQuery.length + 40, source.length)
          const snippet = source.slice(start, end)
          items.push({
            type: "note",
            id: note.id,
            paragraphIndex: note.highlightParagraphIndex,
            snippet,
          })
        }
      })
    }

    return items
  }, [activeTab, paragraphs, notes, trimmedQuery])

  const renderHighlighted = (text: string) => {
    if (!trimmedQuery) return text
    const lower = text.toLowerCase()
    const q = trimmedQuery.toLowerCase()
    const parts: ReactNode[] = []
    let cursor = 0

    for (;;) {
      const idx = lower.indexOf(q, cursor)
      if (idx === -1) {
        if (cursor < text.length) {
          parts.push(text.slice(cursor))
        }
        break
      }
      if (idx > cursor) {
        parts.push(text.slice(cursor, idx))
      }
      parts.push(
        <mark key={idx} className="search-highlight">
          {text.slice(idx, idx + q.length)}
        </mark>,
      )
      cursor = idx + q.length
    }

    return <>{parts}</>
  }

  const labels = {
    simplified: {
      title: "搜索",
      content: "搜内文",
      notes: "搜笔记",
      placeholder: "输入要搜索的关键词…",
      noResults: "没有找到匹配结果",
    },
    traditional: {
      title: "搜尋",
      content: "搜內文",
      notes: "搜筆記",
      placeholder: "輸入要搜尋的關鍵詞…",
      noResults: "沒有找到匹配結果",
    },
    english: {
      title: "Search",
      content: "Content",
      notes: "Notes",
      placeholder: "Type to search…",
      noResults: "No results found",
    },
  }[language]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogTitle className="text-sm font-semibold">{labels.title}</DialogTitle>
        <div className="mt-3 space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.placeholder}
          />

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "content" | "notes")}
            className="flex flex-col"
          >
            <TabsList className="w-full">
              <TabsTrigger value="content" className="flex-1 text-xs">
                {labels.content}
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 text-xs">
                {labels.notes}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-3">
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {results.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{labels.noResults}</p>
                  ) : (
                    results.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.type === "content") {
                            onJumpToParagraph(item.paragraphIndex)
                          } else {
                            onOpenNote(item.id, item.paragraphIndex)
                          }
                        }}
                        className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-secondary transition-colors"
                      >
                        <p className="text-xs text-muted-foreground mb-0.5">
                          {`P${item.paragraphIndex + 1}`}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed break-words">
                          {renderHighlighted(item.snippet)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="notes" className="mt-3">
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {results.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{labels.noResults}</p>
                  ) : (
                    results.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onOpenNote(item.id, item.paragraphIndex)
                        }}
                        className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-secondary transition-colors"
                      >
                        <p className="text-xs text-muted-foreground mb-0.5">
                          {`P${item.paragraphIndex + 1}`}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed break-words">
                          {renderHighlighted(item.snippet)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
