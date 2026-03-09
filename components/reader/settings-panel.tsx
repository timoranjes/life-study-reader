"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { FontFamily, Language } from "@/lib/reading-data"
import { useReaderSettings, getFontFamilyCSS } from "@/hooks/use-reader-settings"
import { isSignInPromptPermanentlyDismissed, setNeverRemindSignIn, clearNeverRemindSignIn } from "@/lib/sign-in-prompt"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  language: Language
  onLanguageChange: (lang: Language) => void
}

const MIN_FONT_SIZE = 14
const MAX_FONT_SIZE = 28

const labels = {
  simplified: {
    title: "阅读设置",
    language: "语言",
    fontSize: "字体大小",
    fontStyle: "字体风格",
    theme: "主题",
    preview: "预览文字",
    light: "浅色",
    dark: "深色",
    sepia: "护眼",
    system: "系统",
    signInReminders: "登录提醒",
    signInRemindersDesc: "显示登录提醒以同步您的数据",
  },
  traditional: {
    title: "閱讀設置",
    language: "語言",
    fontSize: "字體大小",
    fontStyle: "字體風格",
    theme: "主題",
    preview: "預覽文字",
    light: "淺色",
    dark: "深色",
    sepia: "護眼",
    system: "系統",
    signInReminders: "登入提醒",
    signInRemindersDesc: "顯示登入提醒以同步您的數據",
  },
  english: {
    title: "Reading Settings",
    language: "Language",
    fontSize: "Font Size",
    fontStyle: "Font",
    theme: "Theme",
    preview: "Preview Text",
    light: "Light",
    dark: "Dark",
    sepia: "Sepia",
    signInReminders: "Sign-In Reminders",
    signInRemindersDesc: "Show reminders to sign in and sync your data",
  },
}

// Language options
const langOptions: { id: Language; label: string }[] = [
  { id: "traditional", label: "繁" },
  { id: "simplified", label: "简" },
  { id: "english", label: "EN" },
]

// Chinese font options
const fontOptionsCN: { id: FontFamily; label: string; enLabel: string; className: string }[] = [
  { id: "serif", label: "宋", enLabel: "Serif", className: "font-reading-serif" },
  { id: "sans", label: "黑", enLabel: "Sans", className: "font-reading-sans" },
  { id: "kai", label: "楷", enLabel: "Kai", className: "font-reading-kai" },
]

// English font options
const fontOptionsEN: { id: FontFamily; label: string; enLabel: string; className: string }[] = [
  { id: "serif", label: "Serif", enLabel: "Serif", className: "font-reading-serif-en" },
  { id: "sans", label: "Sans", enLabel: "Sans", className: "font-reading-sans-en" },
  { id: "mono", label: "Mono", enLabel: "Mono", className: "font-reading-mono-en" },
]

export function SettingsPanel({
  open,
  onOpenChange,
  fontSize,
  onFontSizeChange,
  language,
  onLanguageChange,
}: SettingsPanelProps) {
  const { theme, setTheme, chineseFontFamily, englishFontFamily, setChineseFontFamily, setEnglishFontFamily } = useReaderSettings()
  const l = labels[language]
  
  // Sign-in reminder toggle state
  const [showSignInReminders, setShowSignInReminders] = useState(true)
  
  // Load sign-in reminder preference on mount
  useEffect(() => {
    const isDismissed = isSignInPromptPermanentlyDismissed()
    setShowSignInReminders(!isDismissed)
  }, [])
  
  // Handle sign-in reminder toggle
  const handleSignInRemindersChange = (checked: boolean) => {
    setShowSignInReminders(checked)
    if (checked) {
      clearNeverRemindSignIn()
    } else {
      setNeverRemindSignIn()
    }
  }

  const isEnglish = language === "english"
  const fontOptions = isEnglish ? fontOptionsEN : fontOptionsCN
  
  // Get the current font based on language
  const currentFont = isEnglish ? englishFontFamily : chineseFontFamily
  
  // Set the appropriate font based on language
  const handleSetFont = (font: "serif" | "sans" | "kai" | "mono") => {
    if (isEnglish) {
      setEnglishFontFamily(font as "serif" | "sans" | "mono")
    } else {
      setChineseFontFamily(font as "serif" | "sans" | "kai")
    }
  }

  const previewText = isEnglish
    ? "Life-Study preview text"
    : language === "traditional"
      ? "生命讀經預覽文字"
      : "生命读经预览文字"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-3" aria-describedby={undefined}>
        <SheetHeader className="pb-3 px-0">
          <SheetTitle className="text-center text-xs font-semibold">
            {l.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 w-full">
          {/* Language Selection - prominently displayed at top */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center bg-secondary rounded-md p-0.5 flex-1">
              {langOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onLanguageChange(opt.id)}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all leading-none",
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
          </div>

          {/* Font Size - single compact row */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-xs text-muted-foreground shrink-0">
              A
            </span>
            <Slider
              value={[fontSize]}
              onValueChange={([v]) => onFontSizeChange(v)}
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              step={1}
              className="flex-1 w-full min-w-0"
            />
            <span className="text-base text-muted-foreground shrink-0 font-semibold">
              A
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-7 text-right">
              {fontSize}
            </span>
          </div>

          {/* Font Family + Theme on same row for compactness */}
          <div className="flex items-start gap-4 w-full">
            {/* Font Family */}
            <div className="flex-1 min-w-0">
              <div className="flex gap-1.5 w-full">
                {fontOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSetFont(option.id)}
                    className={cn(
                      "flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-md border py-1.5 px-1 transition-all text-center",
                      currentFont === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    )}
                  >
                    <span className="text-sm leading-none">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="flex-1 min-w-0">
              <div className="flex gap-1.5 w-full">
                <button
                  aria-label={l.light}
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-md border py-1.5 px-1 transition-all",
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-full border-2 border-slate-400"
                    style={{ backgroundColor: "#ffffff" }}
                  />
                </button>
                <button
                  aria-label={l.sepia ?? "Sepia"}
                  onClick={() => setTheme("sepia")}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-md border py-1.5 px-1 transition-all",
                    theme === "sepia"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-full border-2 border-amber-600"
                    style={{ backgroundColor: "#fdf6e3" }}
                  />
                </button>
                <button
                  aria-label={l.dark}
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-md border py-1.5 px-1 transition-all",
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-full border-2 border-slate-500"
                    style={{ backgroundColor: "#020617" }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Sign-In Reminders Toggle */}
          <div className="flex items-center justify-between w-full py-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-foreground font-medium block">{l.signInReminders}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">{l.signInRemindersDesc}</span>
            </div>
            <Switch
              checked={showSignInReminders}
              onCheckedChange={handleSignInRemindersChange}
              aria-label={l.signInReminders}
            />
          </div>

          {/* Compact preview */}
          <div className="border border-border rounded-md px-3 py-2 bg-card">
            <p
              className="text-center"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.6,
                fontFamily: getFontFamilyCSS(language === "english", currentFont),
              }}
            >
              {previewText}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
