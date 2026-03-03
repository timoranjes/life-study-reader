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
import { TTSSettingsPanel } from "@/components/reader/tts-settings-panel"
import type { FontFamily, Highlight, HighlightColor, Language, Note } from "@/lib/reading-data"
import type { TTSSpeechPosition, TTSStatus, TTSSettings as TTSSettingsType, TTSVoice } from "@/lib/tts-types"
import { getBookName } from "@/lib/book-names"
import { useLanguage } from "@/hooks/use-language"
import { formatEnglishTitle } from "@/lib/title-case"
import { useReaderSettings } from "@/hooks/use-reader-settings"
import { isTTSSupported, loadTTSSettings, saveTTSSettings, selectBestVoice, mapVoiceToTTSVoice, getVoicesForLanguage } from "@/lib/tts-storage"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

interface StoredReadingState {
  highlights: Highlight[]
  notes: Note[]
  scrollProgress: number
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
  
  const [tocOpen, setTocOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)
  const [notebookOpen, setNotebookOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [ttsSettingsOpen, setTTSSettingsOpen] = useState(false)

  // TTS state
  const [ttsStatus, setTTSStatus] = useState<TTSStatus>('idle')
  const [ttsPosition, setTTSPosition] = useState<TTSSpeechPosition | null>(null)
  const [ttsSettings, setTTSSettingsState] = useState<TTSSettingsType>(() => loadTTSSettings())
  const [ttsVoices, setTTSVoices] = useState<TTSVoice[]>([])
  const ttsSupported = isTTSSupported()
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSpeakingRef = useRef(false)
  const currentParagraphRef = useRef(0)
  const paragraphsRef = useRef<string[]>([])

  // Initialize with 0 to avoid hydration mismatch, then sync with URL/localStorage on client
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isHydrated, setIsHydrated] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

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

  // Settings state
  const [fontSize, setFontSize] = useState(18)
  const { fontFamily, setFontFamily } = useReaderSettings()
  const { language, setLanguage, toSimplified } = useLanguage()

  // Highlights & Notes state
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

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
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    if (docHeight > 0) {
      setScrollProgress(Math.min(Math.round((scrollTop / docHeight) * 100), 100))
    }
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

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

    const raw = window.localStorage.getItem(storageKey)

    if (!raw) {
      setHighlights([])
      setNotes([])
      setScrollProgress(0)
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

      setHighlights(nextHighlights)
      setNotes(nextNotes)
      setScrollProgress(nextProgress)

      // Always scroll to top first when switching messages
      window.scrollTo({ top: 0, behavior: "instant" })
    } catch {
      setHighlights([])
      setNotes([])
      setScrollProgress(0)
      window.scrollTo({ top: 0, behavior: "instant" })
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === "undefined") return

    const payload: StoredReadingState = {
      highlights,
      notes,
      scrollProgress,
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {
    }
  }, [storageKey, highlights, notes, scrollProgress])

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
    const newIndex = Math.min(totalMessages - 1, safeIndex + 1)
    setCurrentMessageIndex(newIndex)
    persistMessageIndex(newIndex)
    window.scrollTo({ top: 0, behavior: "smooth" })
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
    const newHighlight: Highlight = {
      id: generateHighlightId(),
      paragraphIndex,
      startOffset,
      endOffset,
      color,
      createdAt: new Date().toISOString(),
    }
    setHighlights((prev) => [...prev, newHighlight])
  }

  const handleRemoveHighlight = (
    paragraphIndex: number,
    startOffset: number,
    endOffset: number
  ) => {
    // Remove any highlights that overlap with the selected range in this paragraph
    setHighlights((prev) =>
      prev.filter((h) => {
        if (h.paragraphIndex !== paragraphIndex) return true
        // Check overlap: highlight overlaps selection if h.start < endOffset && h.end > startOffset
        const overlaps = h.startOffset < endOffset && h.endOffset > startOffset
        return !overlaps
      })
    )
  }

  // Change color of an existing highlight
  const handleChangeHighlightColor = (highlightId: string, newColor: HighlightColor) => {
    setHighlights((prev) =>
      prev.map((h) => (h.id === highlightId ? { ...h, color: newColor } : h))
    )
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
  }

  const handleAddNote = (paragraphIndex: number, startOffset: number, endOffset: number) => {
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
  }

  const handleOpenNote = (noteId: string) => {
    setActiveNoteId(noteId)
    setNoteDrawerOpen(true)
  }

  const handleSaveNote = (noteId: string, noteContent: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, content: noteContent, updatedAt: new Date().toISOString() } : n
      )
    )
  }

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    // Remove noteId from associated highlight
    setHighlights((prev) =>
      prev.map((h) => (h.noteId === noteId ? { ...h, noteId: undefined } : h))
    )
    setNoteDrawerOpen(false)
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

  // Auto-select best voice when language changes
  useEffect(() => {
    if (ttsVoices.length === 0) return
    const bestVoice = selectBestVoice(ttsVoices, language)
    if (bestVoice && !ttsSettings.voiceId) {
      setTTSSettingsState(prev => ({ ...prev, voiceId: bestVoice.id }))
    }
  }, [language, ttsVoices, ttsSettings.voiceId])

  // Get current TTS voice
  const currentTTSVoice = useMemo(() => {
    if (!ttsSettings.voiceId || ttsVoices.length === 0) return null
    return ttsVoices.find(v => v.id === ttsSettings.voiceId) || null
  }, [ttsSettings.voiceId, ttsVoices])

  // TTS cancel helper
  const cancelTTS = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    utteranceRef.current = null
    isSpeakingRef.current = false
  }, [])

  // TTS speak paragraph internal
  const speakParagraphInternal = useCallback((paragraphIdx: number, startChar: number = 0) => {
    const synth = synthRef.current
    if (!synth || !currentTTSVoice?.originalVoice) return

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

    const text = currentParagraphs[paragraphIdx]
    if (!text || text.trim().length === 0) {
      speakParagraphInternal(paragraphIdx + 1, 0)
      return
    }

    cancelTTS()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = currentTTSVoice.originalVoice
    utterance.rate = ttsSettings.rate
    utterance.pitch = ttsSettings.pitch
    utterance.volume = ttsSettings.volume
    utterance.lang = currentTTSVoice.lang

    currentParagraphRef.current = paragraphIdx
    isSpeakingRef.current = true

    setTTSPosition({
      messageIndex: safeIndex,
      paragraphIndex: paragraphIdx,
      charIndex: startChar,
      charLength: text.length - startChar,
    })
    setTTSStatus('playing')

    utterance.onboundary = (event) => {
      if (event.name === 'word' && isSpeakingRef.current) {
        setTTSPosition(prev => {
          if (!prev || prev.paragraphIndex !== paragraphIdx) return prev
          return {
            ...prev,
            charIndex: event.charIndex,
            charLength: event.charLength || 1,
          }
        })
      }
    }

    utterance.onend = () => {
      if (!isSpeakingRef.current) return
      speakParagraphInternal(paragraphIdx + 1, 0)
    }

    utterance.onerror = (event) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        setTTSStatus('idle')
        setTTSPosition(null)
      }
    }

    utteranceRef.current = utterance
    synth.speak(utterance)
  }, [currentTTSVoice, ttsSettings, safeIndex, totalMessages, cancelTTS, handleNext])

  // TTS handlers
  const handleTTSPlay = useCallback(() => {
    if (ttsStatus === 'paused' && ttsPosition) {
      speakParagraphInternal(ttsPosition.paragraphIndex, ttsPosition.charIndex)
    } else if (ttsPosition) {
      speakParagraphInternal(ttsPosition.paragraphIndex, ttsPosition.charIndex)
    } else {
      speakParagraphInternal(0, 0)
    }
  }, [ttsStatus, ttsPosition, speakParagraphInternal])

  const handleTTSPause = useCallback(() => {
    if (synthRef.current && ttsStatus === 'playing') {
      synthRef.current.pause()
      setTTSStatus('paused')
    }
  }, [ttsStatus])

  const handleTTSStop = useCallback(() => {
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
      speakParagraphInternal(nextIdx, 0)
    } else if (ttsSettings.autoContinue && safeIndex < totalMessages - 1) {
      cancelTTS()
      handleNext()
    }
  }, [ttsPosition, ttsSettings.autoContinue, safeIndex, totalMessages, cancelTTS, speakParagraphInternal, handleNext])

  const handleTTSPrev = useCallback(() => {
    const currentIdx = ttsPosition?.paragraphIndex ?? 0
    const prevIdx = Math.max(0, currentIdx - 1)
    cancelTTS()
    speakParagraphInternal(prevIdx, 0)
  }, [ttsPosition, cancelTTS, speakParagraphInternal])

  const handleTTSClick = useCallback(() => {
    if (ttsStatus === 'playing' || ttsStatus === 'paused') {
      handleTTSStop()
    } else {
      handleTTSPlay()
    }
  }, [ttsStatus, handleTTSPlay, handleTTSStop])

  const handleTTSRateChange = useCallback((rate: number) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, rate }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  const handleTTSVoiceChange = useCallback((voiceId: string) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, voiceId }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

  const handleTTSAutoContinueChange = useCallback((enabled: boolean) => {
    setTTSSettingsState(prev => {
      const newSettings = { ...prev, autoContinue: enabled }
      saveTTSSettings(newSettings)
      return newSettings
    })
  }, [])

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
        language={language}
        onLanguageChange={setLanguage}
        ttsStatus={ttsStatus}
        isTTSSupported={ttsSupported}
      />

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

      <main className={cn("flex-1 pt-14 bg-background", ttsStatus !== 'idle' ? "pb-24" : "pb-16")}>
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
      />

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        language={language}
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
          speakParagraphInternal(paragraphIndex, 0)
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
      />
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
