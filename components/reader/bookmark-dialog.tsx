"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Bookmark, BookmarkColor } from "@/types/bookmark"
import type { Language } from "@/lib/reading-data"
import { bookmarkLabels } from "@/hooks/use-bookmarks"
import { Bookmark as BookmarkIcon, Trash2 } from "lucide-react"

interface BookmarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  language: Language
  bookmark?: Bookmark | null          // If provided, edit mode
  onSave: (data: { label: string; color: BookmarkColor; note?: string }) => void
  onDelete?: () => void
  defaultLabel?: string
}

const colorOptions: BookmarkColor[] = ['default', 'red', 'orange', 'green', 'blue', 'purple']

const colorClasses: Record<BookmarkColor, string> = {
  default: "bg-gray-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  green: "bg-green-400",
  blue: "bg-blue-400",
  purple: "bg-purple-400",
}

export function BookmarkDialog({
  open,
  onOpenChange,
  language,
  bookmark,
  onSave,
  onDelete,
  defaultLabel = "",
}: BookmarkDialogProps) {
  const l = bookmarkLabels[language]
  const isEditMode = !!bookmark
  
  const [label, setLabel] = useState(defaultLabel)
  const [note, setNote] = useState("")
  const [color, setColor] = useState<BookmarkColor>("default")
  
  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (bookmark) {
        setLabel(bookmark.label)
        setNote(bookmark.note || "")
        setColor(bookmark.color)
      } else {
        setLabel(defaultLabel)
        setNote("")
        setColor("default")
      }
    }
  }, [open, bookmark, defaultLabel])
  
  const handleSave = () => {
    if (!label.trim()) return
    onSave({
      label: label.trim(),
      color,
      note: note.trim() || undefined,
    })
    onOpenChange(false)
  }
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete()
      onOpenChange(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5" />
            {isEditMode ? l.editBookmark : l.addBookmark}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? language === "english"
                ? "Update your bookmark details"
                : "更新书签详情"
              : language === "english"
                ? "Save this location for quick access later"
                : "保存此位置以便快速访问"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="bookmark-label">{l.bookmarkLabel}</Label>
            <Input
              id="bookmark-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={language === "english" ? "Enter a label..." : "输入标签..."}
              maxLength={100}
            />
          </div>
          
          {/* Color */}
          <div className="space-y-2">
            <Label>{l.bookmarkColor}</Label>
            <div className="flex gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    colorClasses[c],
                    color === c
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "hover:scale-105"
                  )}
                  title={l.colorNames[c]}
                />
              ))}
            </div>
          </div>
          
          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="bookmark-note">{l.bookmarkNote}</Label>
            <Textarea
              id="bookmark-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={language === "english" ? "Add a note (optional)..." : "添加备注（可选）..."}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          {isEditMode && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {l.delete}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {l.cancel}
          </Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            {l.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}