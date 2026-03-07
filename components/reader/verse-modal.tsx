"use client"

import { useState, useEffect } from "react"
import { Book, Loader2 } from "lucide-react"
import type { BibleReference } from "@/lib/bible-reference-parser"
import { getVersesFromReference, type VerseData } from "@/lib/bible-data"
import { formatBibleReference } from "@/lib/bible-reference-parser"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// ============================================
// Types
// ============================================

interface VerseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reference: BibleReference | null
  language: 'english' | 'chinese' | 'simplified'
}

// ============================================
// Component
// ============================================

export function VerseModal({
  open,
  onOpenChange,
  reference,
  language
}: VerseModalProps) {
  const [verses, setVerses] = useState<VerseData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setVerses([])
      setError(null)
    }
  }, [open])

  // Fetch verses when reference changes
  useEffect(() => {
    if (!open || !reference) return

    const fetchVerses = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Determine which language to fetch
        const fetchLang = language === 'english' ? 'english' : 'chinese'
        const data = await getVersesFromReference(reference, fetchLang)

        if (data.length === 0) {
          setError(language === 'english' 
            ? "Verse not found. The Bible data may not be available yet."
            : "找不到經文。聖經資料可能尚未載入。")
        } else {
          setVerses(data)
        }
      } catch (err) {
        console.error("Error fetching verses:", err)
        setError(language === 'english'
          ? "Failed to load verse. Please try again."
          : "載入經文失敗。請重試。")
      } finally {
        setIsLoading(false)
      }
    }

    fetchVerses()
  }, [open, reference, language])

  // Get formatted reference for display
  const displayRef = reference
    ? formatBibleReference(reference, language)
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-medium">
            <Book className="size-5 text-primary" />
            <span>{displayRef}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">{error}</p>
            </div>
          ) : verses.length > 0 ? (
            <ScrollArea className="h-[calc(85vh-120px)]">
              <div className="p-6">
                <p className={cn(
                  "text-base leading-relaxed",
                  language === 'english'
                    ? "font-serif"
                    : "font-sans"
                )}>
                  {verses.map((verse) => verse.text).join(' ')}
                </p>
              </div>
            </ScrollArea>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {language === 'english'
              ? "Holy Bible Recovery Version © Living Stream Ministry"
              : language === 'chinese'
                ? "聖經恢復本 © 台灣福音書房"
                : "圣经恢复本 © 台湾福音书房"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Alternative: Inline Verse Display
// ============================================

interface InlineVerseProps {
  reference: BibleReference
  language: 'english' | 'chinese' | 'simplified'
  className?: string
}

/**
 * Inline verse display component for embedding in text
 */
export function InlineVerse({ reference, language, className }: InlineVerseProps) {
  const [verses, setVerses] = useState<VerseData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchVerses = async () => {
      setIsLoading(true)
      try {
        const fetchLang = language === 'english' ? 'english' : 'chinese'
        const data = await getVersesFromReference(reference, fetchLang)
        setVerses(data)
      } catch (err) {
        console.error("Error fetching verses:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVerses()
  }, [reference, language])

  if (isLoading) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {language === 'english' ? "Loading..." : "載入中..."}
      </span>
    )
  }

  if (verses.length === 0) {
    return null
  }

  // Format verses inline
  const text = verses.map(v => `${v.verse} ${v.text}`).join(' ')

  return (
    <span className={className}>
      {text}
    </span>
  )
}