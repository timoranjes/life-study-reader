"use client"

import { Play, Pause, Square, SkipBack, SkipForward, Settings, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TTSStatus, TTSSettings, TTSSpeechPosition } from "@/lib/tts-types"
import type { Language } from "@/lib/reading-data"
import { RATE_PRESETS } from "@/lib/tts-types"
import { cn } from "@/lib/utils"

interface TTSControlsProps {
  status: TTSStatus
  position: TTSSpeechPosition | null
  settings: TTSSettings
  totalParagraphs: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onNext: () => void
  onPrev: () => void
  onRateChange: (rate: number) => void
  onSettingsClick: () => void
  language: Language
}

const labels = {
  simplified: {
    play: "播放",
    pause: "暂停",
    stop: "停止",
    speed: "语速",
    paragraph: "段",
  },
  traditional: {
    play: "播放",
    pause: "暫停",
    stop: "停止",
    speed: "語速",
    paragraph: "段",
  },
  english: {
    play: "Play",
    pause: "Pause",
    stop: "Stop",
    speed: "Speed",
    paragraph: "Para",
  },
}

export function TTSControls({
  status,
  position,
  settings,
  totalParagraphs,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrev,
  onRateChange,
  onSettingsClick,
  language,
}: TTSControlsProps) {
  const l = labels[language]
  const isPlaying = status === 'playing'
  const isPaused = status === 'paused'
  const isActive = status !== 'idle'

  const currentParagraph = position ? position.paragraphIndex + 1 : 0
  const progress = totalParagraphs > 0 ? (currentParagraph / totalParagraphs) * 100 : 0

  return (
    <div className="fixed bottom-12 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border">
      {/* Progress bar */}
      <div className="h-0.5 bg-secondary">
        <div
          className="h-full bg-primary/70 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between h-12 px-2 max-w-2xl mx-auto gap-1">
        {/* Left: Stop + Play/Pause */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onStop}
            className="size-8 text-muted-foreground hover:text-foreground"
            aria-label={l.stop}
          >
            <Square className="size-4" />
          </Button>
          <Button
            variant={isPlaying ? "secondary" : "default"}
            size="icon"
            onClick={isPlaying ? onPause : onPlay}
            className="size-9"
            aria-label={isPlaying ? l.pause : l.play}
          >
            {isPlaying ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5 ml-0.5" />
            )}
          </Button>
        </div>

        {/* Center: Navigation + Position */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            disabled={currentParagraph <= 1 && !isPaused}
            className="size-8 text-muted-foreground hover:text-foreground"
            aria-label="Previous paragraph"
          >
            <SkipBack className="size-4" />
          </Button>

          <div className="flex items-center gap-1 min-w-[60px] justify-center">
            <span className="text-xs font-medium tabular-nums text-foreground">
              {currentParagraph}
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {totalParagraphs}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={currentParagraph >= totalParagraphs}
            className="size-8 text-muted-foreground hover:text-foreground"
            aria-label="Next paragraph"
          >
            <SkipForward className="size-4" />
          </Button>
        </div>

        {/* Right: Speed + Settings */}
        <div className="flex items-center gap-1 shrink-0">
          <Select
            value={String(settings.rate)}
            onValueChange={(value) => onRateChange(parseFloat(value))}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs px-2 border-0 bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {RATE_PRESETS.map((preset) => (
                <SelectItem
                  key={preset.value}
                  value={String(preset.value)}
                  className="text-xs"
                >
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="size-8 text-muted-foreground hover:text-foreground"
            aria-label="TTS Settings"
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}