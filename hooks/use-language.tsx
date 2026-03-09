"use client"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { toSimplified, toTraditional } from "@/lib/converter"
import syncService from "@/lib/sync-service"

export type Language = "traditional" | "simplified" | "english"

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toSimplified: (text: string) => string
  toTraditional: (text: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("traditional")

  // Load language from sync service (which handles localStorage)
  useEffect(() => {
    const saved = syncService.getLanguage()
    if (saved === "traditional" || saved === "simplified" || saved === "english") {
      setLanguage(saved)
    }
  }, [])

  // Save language via sync service (which handles localStorage and cloud sync)
  useEffect(() => {
    syncService.saveLanguage(language)
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
