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
import { AlertCircle, Globe } from "lucide-react"
import type { TTSVoice, TTSSettings, TTSEngine } from "@/lib/tts-types"
import type { Language } from "@/lib/reading-data"
import { RATE_PRESETS } from "@/lib/tts-types"
import { cn } from "@/lib/utils"
import { isServerSideVoice, MAX_RATE_FOR_SERVER_VOICES } from "@/lib/tts-storage"
import { 
  EDGE_TTS_VOICES, 
  getVoicesForLanguage, 
  getDefaultVoiceForLanguage,
  getVoicesByRegion,
  getRegionsForLanguage,
  getVoiceById,
  REGION_LABELS
} from "@/lib/edge-tts-voices"
import { useState, useEffect } from "react"

interface TTSSettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: TTSSettings
  availableVoices: TTSVoice[]
  currentLanguage: Language
  onVoiceChange: (voiceId: string) => void
  onRateChange: (rate: number) => void
  onAutoContinueChange: (enabled: boolean) => void
  // Naturalness settings callbacks
  onNaturalPausesChange?: (enabled: boolean) => void
  onPauseMultiplierChange?: (multiplier: number) => void
  onEmphasizeCapitalizedChange?: (enabled: boolean) => void
  onPreferNeuralVoicesChange?: (enabled: boolean) => void
  // Edge TTS callbacks
  onEngineChange?: (engine: TTSEngine) => void
  onEdgeVoiceGenderChange?: (gender: 'female' | 'male') => void
  onEdgeVoiceChange?: (voiceId: string) => void
}

const labels = {
  simplified: {
    title: "朗读设置",
    description: "自定义文本朗读选项",
    voice: "语音",
    speed: "语速",
    autoContinue: "自动续读下一篇",
    autoContinueDesc: "读完当前篇后自动播放下一篇",
    expandBibleReferences: "展开圣经引用",
    expandBibleReferencesDesc: "将「创一26」转换为「创世记一章二十六节」",
    normalizePolyphonicChars: "处理多音字",
    normalizePolyphonicCharsDesc: "根据上下文确定多音字的正确读音",
    removeStructuralMarkers: "移除结构标记",
    removeStructuralMarkersDesc: "移除大纲标记如(一)、(二)等",
    // Naturalness settings
    naturalness: "自然度设置",
    naturalPauses: "自然停顿",
    naturalPausesDesc: "在标点符号处添加自然停顿，使朗读更流畅",
    pauseSpeed: "停顿长度",
    pauseSpeedSlow: "较长",
    pauseSpeedNormal: "正常",
    pauseSpeedFast: "较短",
    emphasizeCapitalized: "强调大写词",
    emphasizeCapitalizedDesc: "为全大写的英文词添加强调效果",
    preferNeuralVoices: "优先使用高级语音",
    preferNeuralVoicesDesc: "自动选择神经网络语音（音质最佳）",
    quality: {
      neural: "高级",
      enhanced: "增强",
      standard: "标准",
    },
    noVoices: "未找到可用语音",
    // Edge TTS settings
    engine: "语音引擎",
    engineDesc: "选择语音合成引擎",
    edgeEngine: "Edge TTS (高质量)",
    browserEngine: "浏览器语音",
    voiceGender: "语音性别",
    femaleVoice: "女声",
    maleVoice: "男声",
    // Regional voice settings
    region: "地区",
    selectRegion: "选择地区",
    selectVoice: "选择语音",
    mainlandChina: "中国大陆",
    taiwan: "台湾",
    hongKong: "香港",
    american: "美式英语",
    british: "英式英语",
    australian: "澳式英语",
    indian: "印度英语",
    canadian: "加拿大英语",
  },
  traditional: {
    title: "朗讀設定",
    description: "自訂文字朗讀選項",
    voice: "語音",
    speed: "語速",
    autoContinue: "自動續讀下一篇",
    autoContinueDesc: "讀完當前篇後自動播放下一篇",
    expandBibleReferences: "展開聖經引用",
    expandBibleReferencesDesc: "將「創一26」轉換為「創世記一章二十六節」",
    normalizePolyphonicChars: "處理多音字",
    normalizePolyphonicCharsDesc: "根據上下文確定多音字的正確讀音",
    removeStructuralMarkers: "移除結構標記",
    removeStructuralMarkersDesc: "移除大綱標記如(一)、(二)等",
    // Naturalness settings
    naturalness: "自然度設定",
    naturalPauses: "自然停頓",
    naturalPausesDesc: "在標點符號處添加自然停頓，使朗讀更流暢",
    pauseSpeed: "停頓長度",
    pauseSpeedSlow: "較長",
    pauseSpeedNormal: "正常",
    pauseSpeedFast: "較短",
    emphasizeCapitalized: "強調大寫詞",
    emphasizeCapitalizedDesc: "為全大寫的英文詞添加強調效果",
    preferNeuralVoices: "優先使用高級語音",
    preferNeuralVoicesDesc: "自動選擇神經網絡語音（音質最佳）",
    quality: {
      neural: "高級",
      enhanced: "增強",
      standard: "標準",
    },
    noVoices: "未找到可用語音",
    // Edge TTS settings
    engine: "語音引擎",
    engineDesc: "選擇語音合成引擎",
    edgeEngine: "Edge TTS (高品質)",
    browserEngine: "瀏覽器語音",
    voiceGender: "語音性別",
    femaleVoice: "女聲",
    maleVoice: "男聲",
    // Regional voice settings
    region: "地區",
    selectRegion: "選擇地區",
    selectVoice: "選擇語音",
    mainlandChina: "中國大陸",
    taiwan: "台灣",
    hongKong: "香港",
    american: "美式英語",
    british: "英式英語",
    australian: "澳式英語",
    indian: "印度英語",
    canadian: "加拿大英語",
  },
  english: {
    title: "Read Aloud Settings",
    description: "Customize text-to-speech options",
    voice: "Voice",
    speed: "Speed",
    autoContinue: "Auto-continue to next message",
    autoContinueDesc: "Automatically play the next message after finishing",
    expandBibleReferences: "Expand Bible references",
    expandBibleReferencesDesc: "Convert book abbreviations to full spoken form",
    normalizePolyphonicChars: "Handle polyphonic characters",
    normalizePolyphonicCharsDesc: "Apply context-aware pronunciation rules for Chinese",
    removeStructuralMarkers: "Remove structural markers",
    removeStructuralMarkersDesc: "Remove outline markers like (一), (二), etc.",
    // Naturalness settings
    naturalness: "Naturalness",
    naturalPauses: "Natural pauses",
    naturalPausesDesc: "Add natural pauses at punctuation for smoother reading",
    pauseSpeed: "Pause length",
    pauseSpeedSlow: "Longer",
    pauseSpeedNormal: "Normal",
    pauseSpeedFast: "Shorter",
    emphasizeCapitalized: "Emphasize CAPS",
    emphasizeCapitalizedDesc: "Add emphasis to words in ALL CAPS",
    preferNeuralVoices: "Prefer neural voices",
    preferNeuralVoicesDesc: "Auto-select neural network voices (best quality)",
    quality: {
      neural: "Neural",
      enhanced: "Enhanced",
      standard: "Standard",
    },
    noVoices: "No voices available",
    // Edge TTS settings
    engine: "Speech Engine",
    engineDesc: "Select the text-to-speech engine",
    edgeEngine: "Edge TTS (High Quality)",
    browserEngine: "Browser Voice",
    voiceGender: "Voice Gender",
    femaleVoice: "Female",
    maleVoice: "Male",
    // Regional voice settings
    region: "Region",
    selectRegion: "Select region",
    selectVoice: "Select voice",
    mainlandChina: "Mainland China",
    taiwan: "Taiwan",
    hongKong: "Hong Kong",
    american: "American English",
    british: "British English",
    australian: "Australian English",
    indian: "Indian English",
    canadian: "Canadian English",
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
  onNaturalPausesChange,
  onPauseMultiplierChange,
  onEmphasizeCapitalizedChange,
  onPreferNeuralVoicesChange,
  onEngineChange,
  onEdgeVoiceGenderChange,
  onEdgeVoiceChange,
}: TTSSettingsPanelProps) {
  const l = labels[currentLanguage]

  // Check if using Edge TTS
  const isEdgeTTS = settings.engine === 'edge'

  // Get Edge TTS voices for current language grouped by region
  const voicesByRegion = getVoicesByRegion(currentLanguage)
  const regions = getRegionsForLanguage(currentLanguage)
  
  // State for selected region
  const [selectedRegion, setSelectedRegion] = useState<string>(() => {
    // Try to get region from current voice
    if (settings.edgeVoiceId) {
      const voice = getVoiceById(settings.edgeVoiceId)
      if (voice) return voice.region
    }
    // Default to first region
    return regions[0] || 'US'
  })

  // Update selected region when language changes
  useEffect(() => {
    if (!regions.includes(selectedRegion)) {
      setSelectedRegion(regions[0] || 'US')
    }
  }, [currentLanguage, regions, selectedRegion])
  
  // Update selected region when voice changes
  useEffect(() => {
    if (settings.edgeVoiceId) {
      const voice = getVoiceById(settings.edgeVoiceId)
      if (voice && voice.language === currentLanguage && voice.region !== selectedRegion) {
        setSelectedRegion(voice.region)
      }
    }
  }, [settings.edgeVoiceId, currentLanguage, selectedRegion])

  // Get voices for selected region
  const regionVoices = voicesByRegion[selectedRegion] || []
  
  // Get current voice ID (from settings or default)
  // Check if the saved voice matches the current language
  let currentVoiceId: string
  if (settings.edgeVoiceId) {
    const voiceInfo = getVoiceById(settings.edgeVoiceId)
    if (voiceInfo && voiceInfo.language === currentLanguage) {
      // Saved voice matches current language
      currentVoiceId = settings.edgeVoiceId
    } else {
      // Saved voice doesn't match current language, use default
      currentVoiceId = getDefaultVoiceForLanguage(currentLanguage, settings.edgeVoiceGender, selectedRegion)
    }
  } else {
    currentVoiceId = getDefaultVoiceForLanguage(currentLanguage, settings.edgeVoiceGender, selectedRegion)
  }
  
  // Get current voice object
  const currentVoice = getVoiceById(currentVoiceId)

  // Filter voices by current language (for browser TTS)
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

  // Check if current voice is a server-side voice (Google) that has rate limitations
  const currentBrowserVoice = availableVoices.find(v => v.id === settings.voiceId)
  const isCurrentVoiceServerSide = isServerSideVoice(currentBrowserVoice ?? null)
  const isRateCapped = isCurrentVoiceServerSide && settings.rate > MAX_RATE_FOR_SERVER_VOICES
  const effectiveRate = isCurrentVoiceServerSide
    ? Math.min(settings.rate, MAX_RATE_FOR_SERVER_VOICES)
    : settings.rate

  // Get region display name
  const getRegionDisplayName = (regionCode: string): string => {
    const regionLabels: Record<string, Record<Language, string>> = {
      'US': { english: l.american, simplified: l.american, traditional: l.american },
      'GB': { english: l.british, simplified: l.british, traditional: l.british },
      'AU': { english: l.australian, simplified: l.australian, traditional: l.australian },
      'IN': { english: l.indian, simplified: l.indian, traditional: l.indian },
      'CA': { english: l.canadian, simplified: l.canadian, traditional: l.canadian },
      'CN': { english: l.mainlandChina, simplified: l.mainlandChina, traditional: l.mainlandChina },
      'TW': { english: l.taiwan, simplified: l.taiwan, traditional: l.taiwan },
      'HK': { english: l.hongKong, simplified: l.hongKong, traditional: l.hongKong },
    }
    return regionLabels[regionCode]?.[currentLanguage] || regionCode
  }

  // Handle region change
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region)
    // Auto-select first voice of preferred gender in new region
    const voices = voicesByRegion[region] || []
    const preferredVoice = voices.find(v => v.gender === settings.edgeVoiceGender) || voices[0]
    if (preferredVoice && onEdgeVoiceChange) {
      onEdgeVoiceChange(preferredVoice.id)
    }
  }

  // Handle voice selection
  const handleVoiceChange = (voiceId: string) => {
    if (onEdgeVoiceChange) {
      onEdgeVoiceChange(voiceId)
    }
    // Update gender based on selected voice
    const voice = getVoiceById(voiceId)
    if (voice && onEdgeVoiceGenderChange && voice.gender !== settings.edgeVoiceGender) {
      onEdgeVoiceGenderChange(voice.gender)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-2 pb-6 pt-3 h-[70vh] flex flex-col overflow-hidden w-full max-w-[100vw] box-border">
        <SheetHeader className="pb-4 shrink-0">
          <SheetTitle className="text-base font-semibold">{l.title}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {l.description}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="tts-settings-scroll flex-1 min-h-0 w-full">
          <div className="space-y-6 w-full">
            {/* Engine Selection */}
            {onEngineChange && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">{l.engine}</Label>
                <RadioGroup
                  value={settings.engine}
                  onValueChange={(value) => onEngineChange(value as 'edge' | 'browser')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="edge" id="engine-edge" />
                    <Label htmlFor="engine-edge" className="text-sm font-normal cursor-pointer">
                      {l.edgeEngine}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="browser" id="engine-browser" />
                    <Label htmlFor="engine-browser" className="text-sm font-normal cursor-pointer">
                      {l.browserEngine}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Edge TTS Voice Selection with Regional Options */}
            {isEdgeTTS && (
              <div className="space-y-4">
                {/* Region Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {l.region}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {regions.map((region) => (
                      <button
                        key={region}
                        onClick={() => handleRegionChange(region)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                          selectedRegion === region
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        )}
                      >
                        {getRegionDisplayName(region)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Selection within Region */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{l.selectVoice}</Label>
                  <RadioGroup
                    value={currentVoiceId}
                    onValueChange={handleVoiceChange}
                    className="space-y-2"
                  >
                    {regionVoices.map((voice) => (
                      <EdgeVoiceOption
                        key={voice.id}
                        voice={voice}
                        isSelected={currentVoiceId === voice.id}
                        language={currentLanguage}
                      />
                    ))}
                  </RadioGroup>
                </div>

                {/* Show current selection summary */}
                {currentVoice && (
                  <p className="text-xs text-muted-foreground">
                    {currentVoice.name} · {getRegionDisplayName(currentVoice.region)} · {currentVoice.gender === 'female' ? l.femaleVoice : l.maleVoice}
                  </p>
                )}
              </div>
            )}

            {/* Browser Voice Selection - only show when browser engine is selected */}
            {!isEdgeTTS && (
              <div className="space-y-3 w-full max-w-full overflow-hidden">
                <Label className="text-sm font-medium">{l.voice}</Label>
                
                {filteredVoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{l.noVoices}</p>
                ) : (
                  <RadioGroup
                    value={settings.voiceId}
                    onValueChange={onVoiceChange}
                    className="space-y-2 w-full"
                  >
                  {/* Neural voices */}
                  {voicesByQuality.neural.length > 0 && (
                    <div className="space-y-2 w-full">
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
                    <div className="space-y-2 w-full">
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
                    <div className="space-y-2 w-full">
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
            )}

            {/* Speed Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{l.speed}</Label>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {isRateCapped ? (
                    <span className="text-amber-500 dark:text-amber-400">
                      {settings.rate}x → {effectiveRate}x
                    </span>
                  ) : (
                    `${settings.rate}x`
                  )}
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
              {/* Rate cap warning for server-side voices */}
              {isRateCapped && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {currentLanguage === 'english'
                      ? `Google voices may produce garbled audio above ${MAX_RATE_FOR_SERVER_VOICES}x. Rate automatically capped.`
                      : currentLanguage === 'traditional'
                      ? `Google 語音超過 ${MAX_RATE_FOR_SERVER_VOICES}x 可能產生雜音，已自動限制速度。`
                      : `Google 语音超过 ${MAX_RATE_FOR_SERVER_VOICES}x 可能产生杂音，已自动限制速度。`
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Auto-continue Toggle */}
            <div className="flex items-start justify-between gap-3 py-2">
              <div className="flex-1 min-w-0 space-y-0.5">
                <Label className="text-sm font-medium">{l.autoContinue}</Label>
                <p className="text-xs text-muted-foreground">
                  {l.autoContinueDesc}
                </p>
              </div>
              <Switch
                checked={settings.autoContinue}
                onCheckedChange={onAutoContinueChange}
                className="shrink-0"
              />
            </div>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// Edge TTS Voice option component
function EdgeVoiceOption({
  voice,
  isSelected,
  language,
}: {
  voice: { id: string; name: string; gender: 'female' | 'male'; description?: string }
  isSelected: boolean
  language: Language
}) {
  const genderLabel = voice.gender === 'female' 
    ? (language === 'english' ? 'Female' : '女声')
    : (language === 'english' ? 'Male' : '男声')

  return (
    <label
      htmlFor={voice.id}
      className={cn(
        "flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer transition-colors w-full box-border",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-secondary/50"
      )}
    >
      <RadioGroupItem value={voice.id} id={voice.id} className="shrink-0" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm font-medium truncate flex-1 min-w-0">{voice.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
            {genderLabel}
          </Badge>
        </div>
        {voice.description && (
          <span className="text-xs text-muted-foreground truncate block">{voice.description}</span>
        )}
      </div>
    </label>
  )
}

// Browser Voice option component
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
        "flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer transition-colors w-full box-border",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-secondary/50"
      )}
    >
      <RadioGroupItem value={voice.id} id={voice.id} className="shrink-0" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm font-medium truncate flex-1 min-w-0">{voice.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
            {qualityLabel}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground truncate block">{voice.lang}</span>
      </div>
    </label>
  )
}