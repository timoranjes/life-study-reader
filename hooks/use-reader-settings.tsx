"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { FontFamily } from "@/lib/reading-data"

export type ReaderTheme = "light" | "sepia" | "dark"

interface ReaderSettingsContextValue {
  theme: ReaderTheme
  fontFamily: FontFamily
  setTheme: (theme: ReaderTheme) => void
  setFontFamily: (family: FontFamily) => void
}

const ReaderSettingsContext = createContext<ReaderSettingsContextValue | null>(null)

const STORAGE_KEY = "life-study:reader-settings"

export function ReaderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ReaderTheme>("light")
  const [fontFamily, setFontFamily] = useState<FontFamily>("serif")

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<{ theme: ReaderTheme; fontFamily: FontFamily }>
      if (parsed.theme === "light" || parsed.theme === "sepia" || parsed.theme === "dark") {
        setTheme(parsed.theme)
      }
      if (parsed.fontFamily === "serif" || parsed.fontFamily === "sans" || parsed.fontFamily === "kai") {
        setFontFamily(parsed.fontFamily)
      }
    } catch {
    }
  }, [])

  useEffect(() => {
    try {
      const payload = { theme, fontFamily }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
    }
  }, [theme, fontFamily])

  useEffect(() => {
    if (typeof document === "undefined") return
    const html = document.documentElement
    const body = document.body

    // Manage .dark and .sepia classes on <html> for Tailwind variants
    html.classList.remove("dark", "sepia")
    if (theme === "dark") {
      html.classList.add("dark")
    } else if (theme === "sepia") {
      html.classList.add("sepia")
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

    let fontFamilyValue =
      'ui-serif, Georgia, "Times New Roman", serif'
    if (fontFamily === "sans") {
      fontFamilyValue = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    } else if (fontFamily === "kai") {
      fontFamilyValue = '"KaiTi", "STKaiti", ui-serif, Georgia, "Times New Roman", serif'
    }

    body.style.backgroundColor = backgroundColor
    body.style.color = color
    body.style.fontFamily = fontFamilyValue
    body.dataset.readerTheme = theme
    body.dataset.readerFont = fontFamily
  }, [theme, fontFamily])

  const value = useMemo(
    () => ({
      theme,
      fontFamily,
      setTheme,
      setFontFamily,
    }),
    [theme, fontFamily],
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

