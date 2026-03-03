"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import type { Highlight, HighlightColor, Language, Note } from "@/lib/reading-data"
import { cn } from "@/lib/utils"

interface NoteDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: Note | null
  highlight?: Highlight | null
  onSave: (noteId: string, content: string) => void
  onDelete: (noteId: string) => void
  onChangeColor?: (highlightId: string, newColor: HighlightColor) => void
  language: Language
}

const noteLabels = {
  simplified: {
    title: "笔记",
    placeholder: "写下你的笔记...",
    save: "保存笔记",
    delete: "删除笔记",
    highlightColor: "高亮颜色",
    colorNames: {
      yellow: "黄色",
      green: "绿色",
      blue: "蓝色",
      pink: "粉色",
      purple: "紫色",
      red: "红色",
    },
  },
  traditional: {
    title: "筆記",
    placeholder: "寫下你的筆記...",
    save: "保存筆記",
    delete: "刪除筆記",
    highlightColor: "螢光筆顏色",
    colorNames: {
      yellow: "黃色",
      green: "綠色",
      blue: "藍色",
      pink: "粉色",
      purple: "紫色",
      red: "紅色",
    },
  },
  english: {
    title: "Note",
    placeholder: "Write your note...",
    save: "Save Note",
    delete: "Delete Note",
    highlightColor: "Highlight Color",
    colorNames: {
      yellow: "Yellow",
      green: "Green",
      blue: "Blue",
      pink: "Pink",
      purple: "Purple",
      red: "Red",
    },
  },
}

const colorSwatches: { color: HighlightColor; bg: string; border: string }[] = [
  { color: "yellow", bg: "bg-yellow-300 dark:bg-yellow-500/60", border: "ring-yellow-400" },
  { color: "green", bg: "bg-emerald-300 dark:bg-emerald-500/60", border: "ring-emerald-400" },
  { color: "blue", bg: "bg-sky-300 dark:bg-sky-500/60", border: "ring-sky-400" },
  { color: "pink", bg: "bg-pink-300 dark:bg-pink-500/60", border: "ring-pink-400" },
  { color: "purple", bg: "bg-purple-300 dark:bg-purple-500/60", border: "ring-purple-400" },
  { color: "red", bg: "bg-rose-300 dark:bg-rose-500/60", border: "ring-rose-400" },
]

export function NoteDrawer({ 
  open, 
  onOpenChange, 
  note, 
  highlight,
  onSave, 
  onDelete,
  onChangeColor,
  language 
}: NoteDrawerProps) {
  const [editContent, setEditContent] = useState("")
  const l = noteLabels[language]

  useEffect(() => {
    if (note) {
      setEditContent(note.content)
    }
  }, [note])

  if (!note) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-6 pt-3 max-h-[70vh] overflow-y-auto" aria-describedby={undefined}>
        <SheetHeader className="pb-3">
          <SheetTitle className="text-sm font-semibold text-foreground">
            {l.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 max-w-sm mx-auto">
          {/* Highlight color indicator and picker */}
          {highlight && (
            <div className="flex items-center gap-2 pb-2">
              <span className="text-xs text-muted-foreground">{l.highlightColor}:</span>
              <div className="flex items-center gap-1">
                {colorSwatches.map((swatch) => (
                  <button
                    key={swatch.color}
                    onClick={() => onChangeColor?.(highlight.id, swatch.color)}
                    className={cn(
                      "size-5 rounded-full transition-transform hover:scale-110 active:scale-95",
                      swatch.bg,
                      highlight.color === swatch.color && `ring-2 ring-offset-1 ${swatch.border}`
                    )}
                    aria-label={l.colorNames[swatch.color]}
                    title={l.colorNames[swatch.color]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quoted text */}
          <div className="border-l-2 border-primary/40 pl-3 py-1">
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              {note.quotedText}
            </p>
          </div>

          {/* Note editor */}
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder={l.placeholder}
            className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-card text-foreground text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
          />

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={() => {
                onDelete(note.id)
                onOpenChange(false)
              }}
            >
              {l.delete}
            </Button>
            <Button
              onClick={() => {
                onSave(note.id, editContent)
                onOpenChange(false)
              }}
              className="flex-1"
              size="sm"
            >
              {l.save}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
