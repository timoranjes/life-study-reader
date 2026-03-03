"use client"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { toSimplified, toTraditional } from "@/lib/converter"

export type Language = "traditional" | "simplified" | "english"

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toSimplified: (text: string) => string
  toTraditional: (text: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = "life-study:language"

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("traditional")

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === "traditional" || saved === "simplified" || saved === "english") {
        setLanguage(saved)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language)
    } catch {}
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toSimplified,
      toTraditional,
    }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return ctx
}
