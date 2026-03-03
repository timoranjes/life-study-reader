"use client"

import { Check, MessageSquarePlus, Pencil, StickyNote, Trash2 } from "lucide-react"
import type { HighlightColor } from "@/lib/reading-data"
import { cn } from "@/lib/utils"

interface ContextMenuBarProps {
  position: { top: number; left: number }
  // Existing selection mode
  onHighlight: (color: HighlightColor) => void
  onRemoveHighlight: () => void
  onAddNote: () => void
  language: "simplified" | "traditional" | "english"
  // NEW: Edit mode for existing highlights
  editMode?: boolean
  currentHighlight?: {
    id: string
    color: HighlightColor
    hasNote: boolean
  }
  onChangeColor?: (highlightId: string, newColor: HighlightColor) => void
  onEditNote?: (highlightId: string) => void
  onDeleteHighlight?: (highlightId: string) => void
}

const colorSwatches: { color: HighlightColor; bg: string }[] = [
  { color: "yellow", bg: "bg-yellow-300 dark:bg-yellow-500/60" },
  { color: "green", bg: "bg-emerald-300 dark:bg-emerald-500/60" },
  { color: "blue", bg: "bg-sky-300 dark:bg-sky-500/60" },
  { color: "pink", bg: "bg-pink-300 dark:bg-pink-500/60" },
  { color: "purple", bg: "bg-purple-300 dark:bg-purple-500/60" },
  { color: "red", bg: "bg-rose-300 dark:bg-rose-500/60" },
]

export function ContextMenuBar({ 
  position, 
  onHighlight, 
  onRemoveHighlight, 
  onAddNote, 
  language,
  editMode = false,
  currentHighlight,
  onChangeColor,
  onEditNote,
  onDeleteHighlight,
}: ContextMenuBarProps) {
  const noteLabel = language === "english" ? "Note" : "笔记"
  const removeLabel = language === "english" ? "Clear" : "清除"
  const editNoteLabel = language === "english" ? "Edit Note" : "编辑笔记"
  const addNoteLabel = language === "english" ? "Add Note" : "添加笔记"
  const deleteLabel = language === "english" ? "Delete" : "删除"

  // Edit mode: show color picker with current color checked, and edit note/delete options
  if (editMode && currentHighlight) {
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
            onClick={() => onChangeColor?.(currentHighlight.id, swatch.color)}
            className={cn(
              "size-6 rounded-full transition-transform hover:scale-110 active:scale-95 relative",
              swatch.bg
            )}
            aria-label={`Change to ${swatch.color}`}
          >
            {currentHighlight.color === swatch.color && (
              <Check className="size-3 absolute inset-0 m-auto text-white drop-shadow-sm" />
            )}
          </button>
        ))}

        <div className="w-px h-4 bg-border mx-0.5" />

        <button
          onClick={() => onEditNote?.(currentHighlight.id)}
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-full text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label={currentHighlight.hasNote ? editNoteLabel : addNoteLabel}
        >
          {currentHighlight.hasNote ? (
            <>
              <Pencil className="size-3" />
              <span>{editNoteLabel}</span>
            </>
          ) : (
            <>
              <StickyNote className="size-3" />
              <span>{addNoteLabel}</span>
            </>
          )}
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <button
          onClick={() => onDeleteHighlight?.(currentHighlight.id)}
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-full text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label={deleteLabel}
        >
          <Trash2 className="size-3" />
          <span>{deleteLabel}</span>
        </button>
      </div>
    )
  }

  // Default mode: create new highlight
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
          onClick={() => onHighlight(swatch.color)}
          className={cn(
            "size-6 rounded-full transition-transform hover:scale-110 active:scale-95",
            swatch.bg
          )}
          aria-label={`Highlight ${swatch.color}`}
        />
      ))}

      <div className="w-px h-4 bg-border mx-0.5" />

      <button
        onClick={onRemoveHighlight}
        className="flex items-center gap-0.5 px-1.5 py-1 rounded-full text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label={removeLabel}
      >
        <Trash2 className="size-3" />
        <span>{removeLabel}</span>
      </button>

      <div className="w-px h-4 bg-border mx-0.5" />

      <button
        onClick={onAddNote}
        className="flex items-center gap-0.5 px-1.5 py-1 rounded-full text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label={noteLabel}
      >
        <MessageSquarePlus className="size-3" />
        <span>{noteLabel}</span>
      </button>
    </div>
  )
}
