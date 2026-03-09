"use client"

import { useMemo, useState } from "react"
import { X, BookMarked, MessageSquareText, Volume2, Settings2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Highlight, HighlightColor, Language, Note } from "@/lib/reading-data"
import { DataManager } from "./data-manager"

interface StudyNotebookProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  highlights: Highlight[]
  notes: Note[]
  paragraphs: string[]
  language: Language
  onOpenNote: (noteId: string) => void
  onJumpToHighlight: (paragraphIndex: number) => void
  onSpeakParagraph?: (paragraphIndex: number) => void
}

const labels = {
  simplified: {
    title: "学习笔记",
    all: "全部",
    byColor: "按颜色",
    notesOnly: "仅笔记",
    close: "关闭",
    empty: "还没有任何批注",
    emptyNotes: "还没有任何笔记",
    highlights: "条标注",
    noteCount: "条笔记",
    colorNames: { yellow: "黄色", green: "绿色", blue: "蓝色", pink: "粉色", purple: "紫色", red: "红色" } as Record<HighlightColor, string>,
  },
  traditional: {
    title: "學習筆記",
    all: "全部",
    byColor: "按顏色",
    notesOnly: "僅筆記",
    close: "關閉",
    empty: "還沒有任何批註",
    emptyNotes: "還沒有任何筆記",
    highlights: "條標註",
    noteCount: "條筆記",
    colorNames: { yellow: "黃色", green: "綠色", blue: "藍色", pink: "粉色", purple: "紫色", red: "紅色" } as Record<HighlightColor, string>,
  },
  english: {
    title: "Study Notebook",
    all: "All",
    byColor: "By Color",
    notesOnly: "Notes",
    close: "Close",
    empty: "No annotations yet",
    emptyNotes: "No notes yet",
    highlights: "highlights",
    noteCount: "notes",
    colorNames: { yellow: "Yellow", green: "Green", blue: "Blue", pink: "Pink", purple: "Purple", red: "Red" } as Record<HighlightColor, string>,
  },
}

const colorDots: Record<HighlightColor, string> = {
  yellow: "bg-yellow-400",
  green: "bg-emerald-400",
  blue: "bg-sky-400",
  pink: "bg-pink-400",
  purple: "bg-purple-400",
  red: "bg-rose-400",
}

function getSnippet(text: string, start: number, end: number, maxLen = 80) {
  const raw = text.slice(start, end)
  return raw.length > maxLen ? raw.slice(0, maxLen) + "..." : raw
}

function HighlightCard({
  highlight,
  paragraphs,
  note,
  onOpenNote,
  onJumpToHighlight,
  onSpeakParagraph,
}: {
  highlight: Highlight
  paragraphs: string[]
  note?: Note
  onOpenNote?: (id: string) => void
  onJumpToHighlight?: (paragraphIndex: number) => void
  onSpeakParagraph?: (paragraphIndex: number) => void
}) {
  const text = paragraphs[highlight.paragraphIndex] || ""
  const snippet = getSnippet(text, highlight.startOffset, highlight.endOffset)

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 cursor-pointer"
      onClick={() => onJumpToHighlight?.(highlight.paragraphIndex)}
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-1.5 size-2 rounded-full shrink-0", colorDots[highlight.color])} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm text-foreground leading-relaxed", `highlight-${highlight.color} inline`)}>
            {snippet}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {`P${highlight.paragraphIndex + 1}`}
          </p>
        </div>
        {onSpeakParagraph && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSpeakParagraph(highlight.paragraphIndex)
            }}
            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Read aloud"
          >
            <Volume2 className="size-4" />
          </button>
        )}
      </div>
      {note && note.content && (
        <button
          onClick={() => onOpenNote?.(note.id)}
          className="mt-2 ml-4 flex items-start gap-1.5 rounded-md bg-secondary/60 p-2 w-[calc(100%-16px)] text-left transition-colors hover:bg-secondary"
        >
          <MessageSquareText className="size-3 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{note.content}</p>
        </button>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <BookMarked className="size-8 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function StudyNotebook({
  open,
  onOpenChange,
  highlights,
  notes,
  paragraphs,
  language,
  onOpenNote,
  onJumpToHighlight,
  onSpeakParagraph,
}: StudyNotebookProps) {
  const l = labels[language]
  
  // State for data manager dialog
  const [dataManagerOpen, setDataManagerOpen] = useState(false)

  const notesMap = useMemo(() => {
    const map = new Map<string, Note>()
    notes.forEach((n) => map.set(n.id, n))
    return map
  }, [notes])

  const highlightsByColor = useMemo(() => {
    const groups: Record<HighlightColor, Highlight[]> = {
      yellow: [],
      green: [],
      blue: [],
      pink: [],
      purple: [],
      red: [],
    }
    highlights.forEach((h) => {
      if (groups[h.color]) {
        groups[h.color].push(h)
      }
    })
    return groups
  }, [highlights])

  const highlightsWithNotes = useMemo(
    () => highlights.filter((h) => h.noteId && notesMap.has(h.noteId)),
    [highlights, notesMap]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 max-w-none w-full h-full rounded-none border-0 p-0 flex flex-col data-[state=open]:slide-in-from-bottom-2 data-[state=open]:duration-300"
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground -ml-2"
          >
            <X className="size-4 mr-1" />
            {l.close}
          </Button>
          <DialogTitle className="text-sm font-semibold text-foreground">{l.title}</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDataManagerOpen(true)}
            className="text-muted-foreground hover:text-foreground -mr-2"
          >
            <Settings2 className="size-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-2 pb-0 shrink-0">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1 text-xs">
                {l.all}
              </TabsTrigger>
              <TabsTrigger value="byColor" className="flex-1 text-xs">
                {l.byColor}
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 text-xs">
                {l.notesOnly}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab: All */}
          <TabsContent value="all" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {highlights.length === 0 ? (
                  <EmptyState message={l.empty} />
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {highlights.length} {l.highlights}
                    </p>
                    {highlights.map((h, i) => (
                      <HighlightCard
                        key={i}
                        highlight={h}
                        paragraphs={paragraphs}
                        note={h.noteId ? notesMap.get(h.noteId) : undefined}
                        onOpenNote={onOpenNote}
                        onJumpToHighlight={onJumpToHighlight}
                        onSpeakParagraph={onSpeakParagraph}
                      />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: By Color */}
          <TabsContent value="byColor" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {highlights.length === 0 ? (
                  <EmptyState message={l.empty} />
                ) : (
                  (["yellow", "green", "blue", "pink", "purple", "red"] as HighlightColor[]).map((color) => {
                    const items = highlightsByColor[color]
                    if (items.length === 0) return null
                    return (
                      <div key={color}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn("size-3 rounded-full", colorDots[color])} />
                          <span className="text-xs font-medium text-foreground">
                            {l.colorNames[color]}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({items.length})
                          </span>
                        </div>
                        <div className="space-y-2 ml-5">
                          {items.map((h, i) => (
                            <HighlightCard
                              key={i}
                              highlight={h}
                              paragraphs={paragraphs}
                              note={h.noteId ? notesMap.get(h.noteId) : undefined}
                              onOpenNote={onOpenNote}
                              onJumpToHighlight={onJumpToHighlight}
                              onSpeakParagraph={onSpeakParagraph}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Notes Only */}
          <TabsContent value="notes" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {highlightsWithNotes.length === 0 ? (
                  <EmptyState message={l.emptyNotes} />
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {highlightsWithNotes.length} {l.noteCount}
                    </p>
                    {highlightsWithNotes.map((h, i) => {
                      const note = h.noteId ? notesMap.get(h.noteId) : undefined
                      return (
                        <HighlightCard
                          key={i}
                          highlight={h}
                          paragraphs={paragraphs}
                          note={note}
                          onOpenNote={onOpenNote}
                          onJumpToHighlight={onJumpToHighlight}
                          onSpeakParagraph={onSpeakParagraph}
                        />
                      )
                    })}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      {/* Data Manager Dialog */}
      <DataManager
        open={dataManagerOpen}
        onOpenChange={setDataManagerOpen}
        language={language}
        onImportComplete={() => {
          // Refresh the page to reload data after import
          window.location.reload()
        }}
      />
    </Dialog>
  )
}
