"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Language } from "@/lib/reading-data"

interface ReaderFooterProps {
  progress: number
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  language: Language
}

const footerLabels = {
  simplified: { prev: "上一篇", next: "下一篇", read: "已读" },
  traditional: { prev: "上一篇", next: "下一篇", read: "已讀" },
  english: { prev: "Prev", next: "Next", read: "Read" },
}

export function ReaderFooter({
  progress,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  language,
}: ReaderFooterProps) {
  const l = footerLabels[language]

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border">
      {/* Progress bar */}
      <div className="h-0.5 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between h-14 px-2 sm:px-4 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={!hasPrev}
          className="text-muted-foreground gap-1 text-xs sm:text-sm"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{l.prev}</span>
        </Button>

        {/* Center section: Progress percentage */}
        <span className="text-xs text-muted-foreground tabular-nums">
          {l.read}{" "}{progress}%
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!hasNext}
          className="text-muted-foreground gap-1 text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">{l.next}</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </footer>
  )
}
