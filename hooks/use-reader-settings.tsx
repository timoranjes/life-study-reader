"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import syncService from "@/lib/sync-service"

export type ReaderTheme = "light" | "sepia" | "dark"

// Separate font types for Chinese and English
export type ChineseFontFamily = "serif" | "sans" | "kai"
export type EnglishFontFamily = "serif" | "sans" | "mono"
export type FontFamily = ChineseFontFamily | EnglishFontFamily

interface ReaderSettingsContextValue {
  theme: ReaderTheme
  // Separate font settings for each language
  chineseFontFamily: ChineseFontFamily
  englishFontFamily: EnglishFontFamily
  // Convenience getter for current font based on language
  getFontFamily: (isEnglish: boolean) => FontFamily
  setTheme: (theme: ReaderTheme) => void
  setChineseFontFamily: (family: ChineseFontFamily) => void
  setEnglishFontFamily: (family: EnglishFontFamily) => void
}

const ReaderSettingsContext = createContext<ReaderSettingsContextValue | null>(null)

interface StoredSettings {
  theme?: ReaderTheme
  chineseFontFamily?: ChineseFontFamily
  englishFontFamily?: EnglishFontFamily
}

// Font family values for Chinese - use direct font names for Windows compatibility
// CSS variables don't resolve correctly in inline styles on Windows browsers
const CHINESE_FONT_VALUES: Record<ChineseFontFamily, string> = {
  serif: '"Noto Serif SC", "Songti SC", "PingFang SC", "STSong", "SimSun", Georgia, serif',
  sans: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  kai: '"Kaiti SC", "Kaiti", "STKaiti", "PingFang SC", "Noto Serif SC", Georgia, serif',
}

// Font family values for English - use direct font names for Windows compatibility
const ENGLISH_FONT_VALUES: Record<EnglishFontFamily, string> = {
  serif: '"Merriweather", Georgia, "Times New Roman", serif',
  sans: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", Consolas, "Courier New", monospace',
}

export function ReaderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ReaderTheme>("light")
  const [chineseFontFamily, setChineseFontFamily] = useState<ChineseFontFamily>("serif")
  const [englishFontFamily, setEnglishFontFamily] = useState<EnglishFontFamily>("serif")

  // Load settings from sync service (which handles localStorage)
  useEffect(() => {
    const settings = syncService.getReaderSettings()
    if (settings) {
      if (settings.theme === "light" || settings.theme === "sepia" || settings.theme === "dark") {
        setTheme(settings.theme)
      }
      if (settings.chineseFontFamily && ["serif", "sans", "kai"].includes(settings.chineseFontFamily)) {
        setChineseFontFamily(settings.chineseFontFamily)
      }
      if (settings.englishFontFamily && ["serif", "sans", "mono"].includes(settings.englishFontFamily)) {
        setEnglishFontFamily(settings.englishFontFamily)
      }
    }
  }, [])

  // Save settings via sync service (which handles localStorage and cloud sync)
  useEffect(() => {
    syncService.saveReaderSettings({
      theme,
      chineseFontFamily,
      englishFontFamily,
    })
  }, [theme, chineseFontFamily, englishFontFamily])

  // Apply theme to document
  useEffect(() => {
    if (typeof document === "undefined") return
    const html = document.documentElement
    const body = document.body

    // Manage .dark and .theme-sepia classes on <html> for Tailwind variants
    html.classList.remove("dark", "theme-sepia")
    if (theme === "dark") {
      html.classList.add("dark")
    } else if (theme === "sepia") {
      html.classList.add("theme-sepia")
    }

    let backgroundColor = "#ffffff"
    let color = "#0f172a"
    if (theme === "sepia") {
      backgroundColor = "#fdf6e3"
      color = "#433422"
    } else if (theme === "dark") {
      backgroundColor = "#020617"
      color = "#e5e7eb"
    }

    body.style.backgroundColor = backgroundColor
    body.style.color = color
    body.dataset.readerTheme = theme
    // Store both font settings as data attributes
    body.dataset.readerChineseFont = chineseFontFamily
    body.dataset.readerEnglishFont = englishFontFamily
  }, [theme, chineseFontFamily, englishFontFamily])

  // Get font family based on language
  const getFontFamily = (isEnglish: boolean): FontFamily => {
    return isEnglish ? englishFontFamily : chineseFontFamily
  }

  // Get CSS font-family value based on language and font setting
  const getFontFamilyValue = (isEnglish: boolean): string => {
    if (isEnglish) {
      return ENGLISH_FONT_VALUES[englishFontFamily]
    }
    return CHINESE_FONT_VALUES[chineseFontFamily]
  }

  const value = useMemo(
    () => ({
      theme,
      chineseFontFamily,
      englishFontFamily,
      getFontFamily,
      setTheme,
      setChineseFontFamily,
      setEnglishFontFamily,
    }),
    [theme, chineseFontFamily, englishFontFamily],
  )

  return <ReaderSettingsContext.Provider value={value}>{children}</ReaderSettingsContext.Provider>
}

export function useReaderSettings() {
  const ctx = useContext(ReaderSettingsContext)
  if (!ctx) {
    throw new Error("useReaderSettings must be used within ReaderSettingsProvider")
  }
  return ctx
}

// Export helper function for getting font CSS value
export function getFontFamilyCSS(isEnglish: boolean, fontFamily: FontFamily): string {
  if (isEnglish) {
    return ENGLISH_FONT_VALUES[fontFamily as EnglishFontFamily]
  }
  return CHINESE_FONT_VALUES[fontFamily as ChineseFontFamily]
}
