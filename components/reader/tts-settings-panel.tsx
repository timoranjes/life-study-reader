"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { TTSVoice, TTSSettings, Language } from "@/lib/tts-types"
import { RATE_PRESETS } from "@/lib/tts-types"
import { cn } from "@/lib/utils"

interface TTSSettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: TTSSettings
  availableVoices: TTSVoice[]
  currentLanguage: Language
  onVoiceChange: (voiceId: string) => void
  onRateChange: (rate: number) => void
  onAutoContinueChange: (enabled: boolean) => void
}

const labels = {
  simplified: {
    title: "朗读设置",
    description: "自定义文本朗读选项",
    voice: "语音",
    speed: "语速",
    autoContinue: "自动续读下一篇",
    autoContinueDesc: "读完当前篇后自动播放下一篇",
    quality: {
      neural: "高级",
      enhanced: "增强",
      standard: "标准",
    },
    noVoices: "未找到可用语音",
  },
  traditional: {
    title: "朗讀設定",
    description: "自訂文字朗讀選項",
    voice: "語音",
    speed: "語速",
    autoContinue: "自動續讀下一篇",
    autoContinueDesc: "讀完當前篇後自動播放下一篇",
    quality: {
      neural: "高級",
      enhanced: "增強",
      standard: "標準",
    },
    noVoices: "未找到可用語音",
  },
  english: {
    title: "Read Aloud Settings",
    description: "Customize text-to-speech options",
    voice: "Voice",
    speed: "Speed",
    autoContinue: "Auto-continue to next message",
    autoContinueDesc: "Automatically play the next message after finishing",
    quality: {
      neural: "Neural",
      enhanced: "Enhanced",
      standard: "Standard",
    },
    noVoices: "No voices available",
  },
}

export function TTSSettingsPanel({
  open,
  onOpenChange,
  settings,
  availableVoices,
  currentLanguage,
  onVoiceChange,
  onRateChange,
  onAutoContinueChange,
}: TTSSettingsPanelProps) {
  const l = labels[currentLanguage]

  // Filter voices by current language
  const filteredVoices = availableVoices.filter(voice => {
    if (currentLanguage === 'english') {
      return voice.nativeLang === 'en'
    }
    return voice.nativeLang === 'zh'
  })

  // Group voices by quality
  const voicesByQuality = {
    neural: filteredVoices.filter(v => v.quality === 'neural'),
    enhanced: filteredVoices.filter(v => v.quality === 'enhanced'),
    standard: filteredVoices.filter(v => v.quality === 'standard'),
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-3 max-h-[70vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base font-semibold">{l.title}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {l.description}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-6">
            {/* Voice Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{l.voice}</Label>
              
              {filteredVoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{l.noVoices}</p>
              ) : (
                <RadioGroup
                  value={settings.voiceId}
                  onValueChange={onVoiceChange}
                  className="space-y-2"
                >
                  {/* Neural voices */}
                  {voicesByQuality.neural.length > 0 && (
                    <div className="space-y-2">
                      {voicesByQuality.neural.map((voice) => (
                        <VoiceOption
                          key={voice.id}
                          voice={voice}
                          isSelected={settings.voiceId === voice.id}
                          qualityLabel={l.quality.neural}
                        />
                      ))}
                    </div>
                  )}

                  {/* Enhanced voices */}
                  {voicesByQuality.enhanced.length > 0 && (
                    <div className="space-y-2">
                      {voicesByQuality.enhanced.map((voice) => (
                        <VoiceOption
                          key={voice.id}
                          voice={voice}
                          isSelected={settings.voiceId === voice.id}
                          qualityLabel={l.quality.enhanced}
                        />
                      ))}
                    </div>
                  )}

                  {/* Standard voices */}
                  {voicesByQuality.standard.length > 0 && (
                    <div className="space-y-2">
                      {voicesByQuality.standard.map((voice) => (
                        <VoiceOption
                          key={voice.id}
                          voice={voice}
                          isSelected={settings.voiceId === voice.id}
                          qualityLabel={l.quality.standard}
                        />
                      ))}
                    </div>
                  )}
                </RadioGroup>
              )}
            </div>

            {/* Speed Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{l.speed}</Label>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {settings.rate}x
                </span>
              </div>
              <Slider
                value={[settings.rate]}
                min={0.5}
                max={2.0}
                step={0.1}
                onValueChange={([rate]) => onRateChange(rate)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>1.5x</span>
                <span>2.0x</span>
              </div>
            </div>

            {/* Auto-continue Toggle */}
            <div className="flex items-start justify-between gap-4 py-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{l.autoContinue}</Label>
                <p className="text-xs text-muted-foreground">
                  {l.autoContinueDesc}
                </p>
              </div>
              <Switch
                checked={settings.autoContinue}
                onCheckedChange={onAutoContinueChange}
              />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// Voice option component
function VoiceOption({
  voice,
  isSelected,
  qualityLabel,
}: {
  voice: TTSVoice
  isSelected: boolean
  qualityLabel: string
}) {
  return (
    <label
      htmlFor={voice.id}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-secondary/50"
      )}
    >
      <RadioGroupItem value={voice.id} id={voice.id} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{voice.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
            {qualityLabel}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{voice.lang}</span>
      </div>
    </label>
  )
}