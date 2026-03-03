"use client"

import { Menu, ALargeSmall, BookMarked, Search, Home, Volume2, Volume1 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Language } from "@/lib/reading-data"
import type { TTSStatus } from "@/lib/tts-types"
import Link from "next/link"

interface ReaderHeaderProps {
  title: string
  onMenuClick: () => void
  onFontClick: () => void
  onNotebookClick: () => void
  onSearchClick: () => void
  onTTSClick: () => void
  language: Language
  onLanguageChange: (lang: Language) => void
  ttsStatus?: TTSStatus
  isTTSSupported?: boolean
}

const langOptions: { id: Language; label: string }[] = [
  { id: "traditional", label: "繁" },
  { id: "simplified", label: "简" },
  { id: "english", label: "EN" },
]

export function ReaderHeader({
  title,
  onMenuClick,
  onFontClick,
  onNotebookClick,
  onSearchClick,
  onTTSClick,
  language,
  onLanguageChange,
  ttsStatus = 'idle',
  isTTSSupported = true,
}: ReaderHeaderProps) {
  const homeLabel =
    language === "english" ? "Home" : language === "simplified" ? "书架" : "書架"

  const isTTSSpeaking = ttsStatus === 'playing' || ttsStatus === 'paused'

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-full px-3 max-w-2xl mx-auto">
        <div className="flex items-center gap-1 shrink-0">
          <Link href="/" className="flex items-center">
            <Button variant="ghost" className="text-foreground px-2 py-1 h-8">
              <Home className="size-4 mr-1" />
              <span className="text-xs font-medium">{homeLabel}</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-foreground"
            aria-label="Open table of contents"
          >
            <Menu className="size-5" />
          </Button>
        </div>

        <h1 className="text-sm font-semibold text-foreground truncate px-2 text-center flex-1">
          {title}
        </h1>

        <div className="flex items-center gap-0.5 shrink-0">
          <div className="flex items-center bg-secondary rounded-md p-0.5">
            {langOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onLanguageChange(opt.id)}
                className={cn(
                  "px-2 py-1 text-[11px] font-medium rounded transition-all leading-none",
                  language === opt.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={`Switch to ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isTTSSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onTTSClick}
              className={cn(
                isTTSSpeaking ? "text-primary" : "text-foreground"
              )}
              aria-label={isTTSSpeaking ? "Stop reading" : "Read aloud"}
            >
              {isTTSSpeaking ? (
                <Volume2 className="size-5" />
              ) : (
                <Volume1 className="size-5" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            className="text-foreground"
            aria-label="Search"
          >
            <Search className="size-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNotebookClick}
            className="text-foreground"
            aria-label="Study notebook"
          >
            <BookMarked className="size-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onFontClick}
            className="text-foreground"
            aria-label="Reading settings"
          >
            <ALargeSmall className="size-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
