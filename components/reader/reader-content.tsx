"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { StickyNote, X } from "lucide-react"
import { ContextMenuBar } from "@/components/reader/context-menu-bar"
import type { FontFamily, Highlight, HighlightColor, Language, Note } from "@/lib/reading-data"
import type { TTSSpeechPosition, TTSStatus } from "@/lib/tts-types"
import { cn } from "@/lib/utils"

type ContentItemType = string | "subtitle"

interface ContentItem {
  type: ContentItemType
  text: string
}

interface ReaderContentProps {
  title: string
  subtitle: string
  paragraphs: string[]
  contentItems?: ContentItem[]
  fontSize: number
  fontFamily: FontFamily
  language: Language
  bookName?: string
  messageId?: string
  highlights: Highlight[]
  notes: Note[]
  onAddHighlight: (paragraphIndex: number, startOffset: number, endOffset: number, color: HighlightColor) => void
  onRemoveHighlight: (paragraphIndex: number, startOffset: number, endOffset: number) => void
  onAddNote: (paragraphIndex: number, startOffset: number, endOffset: number) => void
  onOpenNote: (noteId: string) => void
  onChangeHighlightColor: (highlightId: string, newColor: HighlightColor) => void
  onAddNoteToHighlight: (highlightId: string) => void
  // TTS props
  ttsStatus?: TTSStatus
  ttsPosition?: TTSSpeechPosition | null
}

interface HighlightRange {
  id: string
  start: number
  end: number
  color: HighlightColor
  noteId?: string
}

// Color swatches for menus
const colorSwatches: { color: HighlightColor; bg: string }[] = [
  { color: "yellow", bg: "bg-yellow-300 dark:bg-yellow-500/60" },
  { color: "green", bg: "bg-emerald-300 dark:bg-emerald-500/60" },
  { color: "blue", bg: "bg-sky-300 dark:bg-sky-500/60" },
  { color: "pink", bg: "bg-pink-300 dark:bg-pink-500/60" },
  { color: "purple", bg: "bg-purple-300 dark:bg-purple-500/60" },
  { color: "red", bg: "bg-rose-300 dark:bg-rose-500/60" },
]

// Edit Highlight Menu Component
interface EditHighlightMenuProps {
  position: { top: number; left: number }
  currentColor: HighlightColor
  hasNote: boolean
  language: Language
  onChangeColor: (color: HighlightColor) => void
  onEditNote: () => void
  onRemove: () => void
}

function EditHighlightMenu({
  position,
  currentColor,
  hasNote,
  language,
  onChangeColor,
  onEditNote,
  onRemove,
}: EditHighlightMenuProps) {
  const noteLabel = language === "english" ? (hasNote ? "Edit Note" : "Add Note") : hasNote ? "编辑笔记" : "添加笔记"
  const removeLabel = language === "english" ? "Remove" : "删除"

  return (
    <div
      data-context-menu-bar
      className="fixed z-50 pointer-events-auto flex items-center gap-1 rounded-full bg-white dark:bg-zinc-900 border border-border shadow-xl px-2.5 py-1.5 animate-in fade-in-0 zoom-in-95 duration-150 select-none"
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      {colorSwatches.map((swatch) => (
        <button
          key={swatch.color}
          onClick={() => onChangeColor(swatch.color)}
          className={cn(
            "size-6 rounded-full transition-transform hover:scale-110 active:scale-95 relative",
            swatch.bg
          )}
          aria-label={`Change to ${swatch.color}`}
        >
          {swatch.color === currentColor && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="size-2.5 rounded-full bg-white/80 dark:bg-black/60" />
            </span>
          )}
        </button>
      ))}

      <div className="w-px h-4 bg-border mx-0.5" />

      <button
        onClick={onEditNote}
        className="flex items-center gap-0.5 px-1.5 py-1 rounded-full text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label={noteLabel}
      >
        <StickyNote className="size-3" />
        <span className="hidden sm:inline">{noteLabel}</span>
      </button>

      <div className="w-px h-4 bg-border mx-0.5" />

      <button
        onClick={onRemove}
        className="flex items-center gap-0.5 px-1.5 py-1 rounded-full text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
        aria-label={removeLabel}
      >
        <X className="size-3" />
        <span className="hidden sm:inline">{removeLabel}</span>
      </button>
    </div>
  )
}

function renderParagraphWithHighlights(
  text: string,
  paragraphIndex: number,
  highlights: Highlight[],
  onOpenNote: (noteId: string) => void,
  onHighlightClick: (highlightId: string, e: React.MouseEvent) => void,
  ttsStatus?: TTSStatus,
  ttsPosition?: TTSSpeechPosition | null
) {
  // Check if TTS is active on this paragraph
  const isTTSHighlighted = ttsStatus !== 'idle' &&
    ttsPosition?.paragraphIndex === paragraphIndex

  // If TTS is highlighting this paragraph with character position
  if (isTTSHighlighted && ttsPosition && ttsPosition.charLength > 0) {
    const { charIndex, charLength } = ttsPosition
    const before = text.slice(0, charIndex)
    const highlighted = text.slice(charIndex, charIndex + charLength)
    const after = text.slice(charIndex + charLength)

    return (
      <>
        {before}
        <span className="tts-highlight tts-highlight-current">
          {highlighted}
        </span>
        {after}
      </>
    )
  }

  const paraHighlights = highlights.filter((h) => h.paragraphIndex === paragraphIndex)
  if (paraHighlights.length === 0) return text

  const ranges: HighlightRange[] = []
  for (const h of paraHighlights) {
    const safeEnd = Math.min(h.endOffset, text.length)
    const safeStart = Math.max(0, Math.min(h.startOffset, safeEnd))
    if (safeEnd > safeStart) {
      ranges.push({ id: h.id, start: safeStart, end: safeEnd, color: h.color, noteId: h.noteId })
    }
  }
  if (ranges.length === 0) return text

  const boundariesSet = new Set<number>()
  boundariesSet.add(0)
  boundariesSet.add(text.length)
  for (const r of ranges) {
    boundariesSet.add(r.start)
    boundariesSet.add(r.end)
  }
  const boundaries = Array.from(boundariesSet).sort((a, b) => a - b)
  if (boundaries.length <= 1) return text

  const parts: ReactNode[] = []

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i]
    const end = boundaries[i + 1]
    if (end <= start) continue

    let active: HighlightRange | undefined
    for (let j = 0; j < ranges.length; j++) {
      const r = ranges[j]
      if (r.start <= start && r.end >= end) {
        active = r
      }
    }

    const sliceText = text.slice(start, end)
    if (!sliceText) continue

    if (!active) {
      parts.push(sliceText)
    } else {
      parts.push(
        <mark
          key={`hl-${active.id}-${start}-${end}`}
          className={`highlight-${active.color} cursor-pointer`}
          data-highlight-id={active.id}
          onClick={(e) => onHighlightClick(active!.id, e)}
        >
          {sliceText}
          {active.noteId && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenNote(active!.noteId!)
              }}
              className="inline-flex items-center ml-0.5 text-primary/50 hover:text-primary transition-colors"
              aria-label="View note"
            >
              <StickyNote className="size-3" />
            </button>
          )}
        </mark>,
      )
    }
  }

  return <>{parts}</>
}

export function ReaderContent({
  title,
  subtitle,
  paragraphs,
  contentItems,
  fontSize,
  fontFamily,
  language,
  bookName,
  messageId,
  highlights,
  notes,
  onAddHighlight,
  onRemoveHighlight,
  onAddNote,
  onOpenNote,
  onChangeHighlightColor,
  onAddNoteToHighlight,
  ttsStatus,
  ttsPosition,
}: ReaderContentProps) {
  const articleRef = useRef<HTMLElement>(null)
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    top: number
    left: number
    paragraphIndex: number
    startOffset: number
    endOffset: number
  } | null>(null)
  const [editMenu, setEditMenu] = useState<{
    visible: boolean
    top: number
    left: number
    highlightId: string
    currentColor: HighlightColor
    hasNote: boolean
  } | null>(null)

  // Handle click on existing highlight to show edit menu
  const handleHighlightClick = useCallback((highlightId: string, e: React.MouseEvent) => {
    const highlight = highlights.find((h) => h.id === highlightId)
    if (!highlight) return

    // Get click position for menu
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const menuTop = rect.bottom + 8
    const menuLeft = rect.left + rect.width / 2

    setEditMenu({
      visible: true,
      top: menuTop,
      left: menuLeft,
      highlightId: highlight.id,
      currentColor: highlight.color,
      hasNote: !!highlight.noteId,
    })

    // Clear any text selection
    window.getSelection()?.removeAllRanges()
  }, [highlights])

  const handleTextSelect = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setContextMenu(null)
      return
    }

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    // Only check if there's actual text content (allow leading/trailing spaces)
    if (!selectedText || selectedText.length === 0) {
      setContextMenu(null)
      return
    }

    const container = range.commonAncestorContainer
    const readerContent = articleRef.current
    if (!readerContent || !readerContent.contains(container)) {
      setContextMenu(null)
      return
    }

    // Find the paragraph element - handle both direct text nodes and element nodes
    let paraEl: HTMLElement | null = null
    
    // Helper function to find paragraph element from a node
    const findParagraphElement = (startNode: Node): HTMLElement | null => {
      let node: Node | null = startNode
      // If the node is a text node, start from its parent
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode
      }
      while (node && node !== readerContent) {
        if (node instanceof HTMLElement && node.dataset.paragraphIndex !== undefined) {
          return node
        }
        node = node.parentNode
      }
      return null
    }

    paraEl = findParagraphElement(container)

    // For cross-paragraph selections, try to find paragraph from start container
    if (!paraEl && range.startContainer) {
      paraEl = findParagraphElement(range.startContainer)
    }

    if (!paraEl) {
      setContextMenu(null)
      return
    }

    const paragraphIndex = parseInt(paraEl.dataset.paragraphIndex!, 10)
    const fullText = paraEl.textContent || ""

    // Calculate offsets within the paragraph text
    try {
      const preRange = document.createRange()
      preRange.selectNodeContents(paraEl)
      preRange.setEnd(range.startContainer, range.startOffset)
      const startOffset = preRange.toString().length
      const endOffset = startOffset + selectedText.length

      // Validate offsets - allow selection within the paragraph bounds
      if (startOffset < 0 || endOffset <= startOffset) {
        setContextMenu(null)
        return
      }

      // Get selection rectangle with fallback handling
      let rect = range.getBoundingClientRect()
      
      // If rect has no width/height (can happen with some cross-node selections),
      // try to get rects from the range and use the first one
      if (rect.width === 0 || rect.height === 0) {
        const rects = range.getClientRects()
        if (rects.length > 0) {
          // Use the first rect for positioning
          rect = rects[0]
        } else {
          // Fallback: use the paragraph element's rect
          rect = paraEl.getBoundingClientRect()
        }
      }

      // Calculate menu position - ensure valid numbers
      // Note: ContextMenuBar uses position:fixed, so coordinates are viewport-relative (no scrollY needed)
      const menuTop = Math.max(0, rect.bottom + 8)
      const menuLeft = Math.max(0, rect.left + rect.width / 2)

      // Validate that we have reasonable coordinates
      if (!isFinite(menuTop) || !isFinite(menuLeft)) {
        setContextMenu(null)
        return
      }

      setContextMenu({
        visible: true,
        top: menuTop,
        left: menuLeft,
        paragraphIndex,
        startOffset,
        endOffset,
      })
    } catch (error) {
      // If any error occurs during offset calculation, clear the menu
      console.warn("Text selection error:", error)
      setContextMenu(null)
    }
  }, [])

  const clearContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const DEBOUNCE_MS = 50 // Reduced from 200ms for faster response

    const runSelectionCheck = () => {
      if (timeoutId !== null) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        timeoutId = null
        handleTextSelect()
      }, DEBOUNCE_MS)
    }

    // Use selectionchange for real-time selection updates
    const onSelectionChange = () => runSelectionCheck()
    document.addEventListener("selectionchange", onSelectionChange)

    // Add mouseup listener for desktop - this is more reliable for mouse selections
    const onMouseUp = (e: MouseEvent) => {
      // Small delay to ensure selection is complete
      if (timeoutId !== null) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        timeoutId = null
        handleTextSelect()
      }, 10)
    }
    document.addEventListener("mouseup", onMouseUp)

    const onTouchEnd = () => {
      if (timeoutId !== null) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        timeoutId = null
        handleTextSelect()
      }, 100) // Reduced from 220ms
    }
    document.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId)
      document.removeEventListener("selectionchange", onSelectionChange)
      document.removeEventListener("mouseup", onMouseUp)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [handleTextSelect])

  // Dismiss on click/tap outside (overlay is pointer-events-none, so only menu bar receives clicks)
  useEffect(() => {
    if (!contextMenu) return
    const dismiss = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement) ?? null
      if (target?.closest?.("[data-context-menu-bar]")) return
      setTimeout(clearContextMenu, 100)
    }
    document.addEventListener("mousedown", dismiss)
    document.addEventListener("touchstart", dismiss, { passive: true })
    return () => {
      document.removeEventListener("mousedown", dismiss)
      document.removeEventListener("touchstart", dismiss)
    }
  }, [contextMenu, clearContextMenu])

  useEffect(() => {
    if (!contextMenu) return
    const hideOnScroll = () => {
      clearContextMenu()
    }
    window.addEventListener("scroll", hideOnScroll, { passive: true })
    window.addEventListener("touchmove", hideOnScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", hideOnScroll)
      window.removeEventListener("touchmove", hideOnScroll)
    }
  }, [contextMenu, clearContextMenu])

  // Dismiss edit menu on outside click
  const clearEditMenu = useCallback(() => {
    setEditMenu(null)
  }, [])

  useEffect(() => {
    if (!editMenu) return
    const dismiss = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement) ?? null
      if (target?.closest?.("[data-edit-menu]")) return
      setTimeout(clearEditMenu, 100)
    }
    document.addEventListener("mousedown", dismiss)
    document.addEventListener("touchstart", dismiss, { passive: true })
    return () => {
      document.removeEventListener("mousedown", dismiss)
      document.removeEventListener("touchstart", dismiss)
    }
  }, [editMenu, clearEditMenu])

  useEffect(() => {
    if (!editMenu) return
    const hideOnScroll = () => {
      clearEditMenu()
    }
    window.addEventListener("scroll", hideOnScroll, { passive: true })
    window.addEventListener("touchmove", hideOnScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", hideOnScroll)
      window.removeEventListener("touchmove", hideOnScroll)
    }
  }, [editMenu, clearEditMenu])

  const endText = language === "english" ? "- End -" : "- 本篇完 -"

  return (
    <>
      <article
        ref={articleRef}
        className="max-w-2xl mx-auto px-6 py-8 md:px-8 bg-background min-h-screen"
      >
        {/* Unified Title Block */}
        <div className="mb-16 mt-8 flex flex-col items-center justify-center text-center">
          {/* Book Name */}
          <div className="text-sm md:text-base font-medium tracking-[0.2em] text-muted-foreground uppercase mb-4">
            {bookName || ""}
          </div>
          
          {/* Message Number - Only show for English, Chinese titles already contain "第X篇" */}
          {language === "english" && (
            <div className="text-lg md:text-xl font-semibold tracking-widest text-muted-foreground uppercase mb-4">
              MESSAGE {messageId || ""}
            </div>
          )}
          
          {/* Message Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">
            {title}
          </h1>
        </div>

        <div className="space-y-6">
          {paragraphs.map((paragraph, index) => {
            const itemType: ContentItemType = contentItems?.[index]?.type ?? "p"

            const commonProps = {
              "data-paragraph-index": index,
              style: {
                fontSize: `${fontSize}px`,
                lineHeight: 1.8,
                textIndent: language === "english" ? undefined : `${fontSize * 2}px`,
              } as React.CSSProperties,
              children: renderParagraphWithHighlights(paragraph, index, highlights, onOpenNote, handleHighlightClick, ttsStatus, ttsPosition),
            }

            const renderBlock = () => {
              const typeStr = String(itemType)
              // h4 - Subtitle styling (since main title is in the unified header)
              if (typeStr === "h4") {
                return (
                  <h4
                    {...commonProps}
                    className="text-2xl md:text-3xl font-bold mt-12 mb-6 text-foreground tracking-tight"
                  />
                )
              }
              // h5 - Subtopic styling
              if (typeStr === "h5") {
                return (
                  <h5
                    {...commonProps}
                    className="text-xl md:text-2xl font-semibold mt-10 mb-5 text-foreground"
                  />
                )
              }
              // 3. Part Number (Mapped from (1)) - Kept tight under the main topic
              if (typeStr === "subtitle") {
                return (
                  <div
                    {...commonProps}
                    className="text-center text-xl font-medium text-muted-foreground mt-2 mb-12 tracking-widest"
                  />
                )
              }
              if (typeStr === "h6") {
                return (
                  <h6
                    {...commonProps}
                    className="text-lg font-semibold mt-8 mb-4 text-foreground"
                  />
                )
              }
              if (typeStr.startsWith("O")) {
                const level = parseInt(typeStr.substring(1), 10)
                const indentRem = (level - 2) * 1.5
                const dynamicStyle = { ...commonProps.style, marginLeft: `${indentRem}rem` }
                return (
                  <div
                    {...commonProps}
                    style={dynamicStyle}
                    className="text-base font-medium mt-3 mb-2 text-foreground/90"
                  />
                )
              }
              return (
                <p
                  {...commonProps}
                  className="mb-4 text-base leading-8 text-foreground text-justify"
                />
              )
            }

            return (
              <div key={index} className="relative group">
                {renderBlock()}
              </div>
            )
          })}
        </div>

        <footer className="mt-16 text-center">
          <div className="mx-auto w-12 h-px bg-border dark:bg-gray-700" />
          <p className="mt-6 text-sm text-muted-foreground dark:text-gray-400">{endText}</p>
        </footer>
      </article>

      {contextMenu?.visible && (
        <div
          data-context-menu
          className="select-none fixed inset-0 z-[100] pointer-events-none"
          aria-hidden
        >
          <ContextMenuBar
            position={{ top: contextMenu.top, left: contextMenu.left }}
            language={language}
            onHighlight={(color) => {
              onAddHighlight(contextMenu.paragraphIndex, contextMenu.startOffset, contextMenu.endOffset, color)
              window.getSelection()?.removeAllRanges()
              clearContextMenu()
            }}
            onRemoveHighlight={() => {
              onRemoveHighlight(contextMenu.paragraphIndex, contextMenu.startOffset, contextMenu.endOffset)
              window.getSelection()?.removeAllRanges()
              clearContextMenu()
            }}
            onAddNote={() => {
              onAddNote(contextMenu.paragraphIndex, contextMenu.startOffset, contextMenu.endOffset)
              window.getSelection()?.removeAllRanges()
              clearContextMenu()
            }}
          />
        </div>
      )}

      {/* Edit Menu for existing highlights */}
      {editMenu?.visible && (
        <div
          data-edit-menu
          className="select-none fixed inset-0 z-[100] pointer-events-none"
          aria-hidden
        >
          <EditHighlightMenu
            position={{ top: editMenu.top, left: editMenu.left }}
            currentColor={editMenu.currentColor}
            hasNote={editMenu.hasNote}
            language={language}
            onChangeColor={(color) => {
              onChangeHighlightColor(editMenu.highlightId, color)
              clearEditMenu()
            }}
            onEditNote={() => {
              onAddNoteToHighlight(editMenu.highlightId)
              clearEditMenu()
            }}
            onRemove={() => {
              // Find the highlight to get its position info
              const highlight = highlights.find((h) => h.id === editMenu.highlightId)
              if (highlight) {
                // Remove the highlight and its associated note
                onRemoveHighlight(highlight.paragraphIndex, highlight.startOffset, highlight.endOffset)
              }
              clearEditMenu()
            }}
          />
        </div>
      )}
    </>
  )
}
