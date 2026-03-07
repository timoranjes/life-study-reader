"use client";
import Link from "next/link"
import { useLanguage } from "@/hooks/use-language"
import { useReaderSettings, getFontFamilyCSS } from "@/hooks/use-reader-settings"
import { getBookShortName } from "@/lib/book-names"
import booksIndex from "../src/data/life-study/index.json"

export default function Page() {
  const { language, setLanguage, toSimplified } = useLanguage()
  const { theme, setTheme, chineseFontFamily, englishFontFamily, setChineseFontFamily, setEnglishFontFamily } = useReaderSettings()

  const isEnglish = language === "english"
  
  // Get current font based on language
  const fontFamily = isEnglish ? englishFontFamily : chineseFontFamily
  
  // Get the font CSS value for the current language
  const contentFontFamily = getFontFamilyCSS(isEnglish, fontFamily)
  
  // Set font based on language
  const handleSetFont = (font: "serif" | "sans" | "kai" | "mono") => {
    if (isEnglish) {
      setEnglishFontFamily(font as "serif" | "sans" | "mono")
    } else {
      setChineseFontFamily(font as "serif" | "sans" | "kai")
    }
  }
  // Title displayed based on selected language
  const titleZh = "生命讀經"
  const titleEn = "Life Study Reader"
  const title = isEnglish
    ? titleEn
    : language === "simplified"
      ? toSimplified(titleZh)
      : titleZh

  const baseSubtitleZh = "請選擇一卷書進入閱讀。"
  const subtitle = isEnglish
    ? "Select a book to start reading."
    : language === "simplified"
      ? toSimplified(baseSubtitleZh)
      : baseSubtitleZh

  const langLabels = ["繁", "简", "EN"]

  const sectionLabels =
    language === "english"
      ? { ot: "Old Testament", nt: "New Testament" }
      : language === "simplified"
        ? { ot: "旧约", nt: "新约" }
        : { ot: "舊約", nt: "新約" }

  const oldTestament = booksIndex.filter((book) => {
    const id = parseInt(String(book.bookId), 10)
    return id >= 1 && id <= 39
  })

  const newTestament = booksIndex.filter((book) => {
    const id = parseInt(String(book.bookId), 10)
    return id >= 40 && id <= 66
  })

  const cardBaseClass =
    "group relative block rounded-lg border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden"

  const cardThemeClass =
    theme === "sepia"
      ? "bg-[#fdf6e3] text-[#1a1208] border-[#d4c4a8]"
      : theme === "dark"
        ? "bg-zinc-900 text-slate-200 border-zinc-800"
        : "bg-white text-slate-800 border-slate-200"

  const fontButtonLabels =
    language === "english"
      ? { serif: "Serif", sans: "Sans", mono: "Mono" }
      : { serif: "宋", sans: "黑", kai: "楷" }

  // Theme-aware text classes
  const textPrimaryClass = theme === "sepia"
    ? "text-stone-900"
    : theme === "dark"
      ? "text-slate-100"
      : "text-slate-900"

  const textSecondaryClass = theme === "sepia"
    ? "text-stone-700"
    : theme === "dark"
      ? "text-slate-300"
      : "text-slate-600"

  const bgSecondaryClass = theme === "sepia"
    ? "bg-[#f5edd8]/80 border-transparent"
    : theme === "dark"
      ? "bg-zinc-900/60 border-zinc-800"
      : "bg-white/70 border-slate-200/60"

  const langButtonActiveClass = theme === "sepia"
    ? "bg-amber-800 text-amber-50"
    : theme === "dark"
      ? "bg-slate-100 text-black"
      : "bg-slate-900 text-white"

  const langButtonInactiveClass = theme === "sepia"
    ? "text-amber-800"
    : theme === "dark"
      ? "text-slate-200"
      : "text-slate-700"

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-auto" style={{ fontFamily: contentFontFamily }}>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${textPrimaryClass}`}>
              {title}
            </h1>
            <p className={`text-xs sm:text-sm ${textSecondaryClass}`}>
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className={`flex items-center gap-1 border rounded-md px-1 py-0.5 ${bgSecondaryClass}`}>
              <button
                onClick={() => setLanguage("traditional")}
                className={`px-2 py-1 text-[12px] rounded ${
                  language === "traditional"
                    ? langButtonActiveClass
                    : langButtonInactiveClass
                }`}
              >
                {langLabels[0]}
              </button>
              <button
                onClick={() => setLanguage("simplified")}
                className={`px-2 py-1 text-[12px] rounded ${
                  language === "simplified"
                    ? langButtonActiveClass
                    : langButtonInactiveClass
                }`}
              >
                {langLabels[1]}
              </button>
              <button
                onClick={() => setLanguage("english")}
                className={`px-2 py-1 text-[12px] rounded ${
                  language === "english"
                    ? langButtonActiveClass
                    : langButtonInactiveClass
                }`}
              >
                {langLabels[2]}
              </button>
            </div>

            <div className="flex items-center gap-2">
               <div className="flex items-center gap-1.5">
                 <button
                   aria-label="Light theme"
                   onClick={() => setTheme("light")}
                   className={`h-5 w-5 rounded-full border-2 ${
                     theme === "light"
                       ? "ring-2 ring-sky-500 ring-offset-1 border-sky-500"
                       : "border-slate-300 hover:border-slate-400"
                   }`}
                   style={{ backgroundColor: "#ffffff" }}
                 />
                 <button
                   aria-label="Sepia theme"
                   onClick={() => setTheme("sepia")}
                   className={`h-5 w-5 rounded-full border-2 ${
                     theme === "sepia"
                       ? "ring-2 ring-amber-700 ring-offset-1 border-amber-700"
                       : "border-amber-300 hover:border-amber-400"
                   }`}
                   style={{ backgroundColor: "#d4a574" }}
                 />
                 <button
                   aria-label="Dark theme"
                   onClick={() => setTheme("dark")}
                   className={`h-5 w-5 rounded-full border-2 ${
                     theme === "dark"
                       ? "ring-2 ring-slate-400 ring-offset-1 border-slate-500"
                       : "border-slate-500 hover:border-slate-600"
                   }`}
                   style={{ backgroundColor: "#020617" }}
                 />
               </div>

              <div className={`flex items-center gap-1 border rounded-md px-1 py-0.5 ${bgSecondaryClass}`}>
                <button
                  onClick={() => handleSetFont("serif")}
                  className={`px-2 py-1 text-[11px] rounded ${
                    fontFamily === "serif"
                      ? langButtonActiveClass
                      : langButtonInactiveClass
                  }`}
                >
                  {fontButtonLabels.serif}
                </button>
                <button
                  onClick={() => handleSetFont("sans")}
                  className={`px-2 py-1 text-[11px] rounded ${
                    fontFamily === "sans"
                      ? langButtonActiveClass
                      : langButtonInactiveClass
                  }`}
                >
                  {fontButtonLabels.sans}
                </button>
                <button
                  onClick={() => handleSetFont(isEnglish ? "mono" : "kai")}
                  className={`px-2 py-1 text-[11px] rounded ${
                    (fontFamily === "mono" || fontFamily === "kai")
                      ? langButtonActiveClass
                      : langButtonInactiveClass
                  }`}
                >
                  {isEnglish ? fontButtonLabels.mono : fontButtonLabels.kai}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6" style={{ fontFamily: contentFontFamily }}>
          <section>
            <h2 className={`mb-3 text-sm font-semibold tracking-wide uppercase ${textSecondaryClass}`}>
              {sectionLabels.ot}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {oldTestament.map((book) => (
                <Link
                  key={book.bookId}
                  href={`/reader/${book.bookId}`}
                  className={`${cardBaseClass} ${cardThemeClass}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex h-16 sm:h-18 items-center justify-center px-2 py-2 text-center">
                    <span className="text-sm font-medium group-hover:scale-[1.02] transform transition-transform duration-300">
                      {getBookShortName(book.bookId, language, language === "simplified" ? toSimplified(book.bookName) : book.bookName)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className={`mb-3 text-sm font-semibold tracking-wide uppercase ${textSecondaryClass}`}>
              {sectionLabels.nt}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {newTestament.map((book) => (
                <Link
                  key={book.bookId}
                  href={`/reader/${book.bookId}`}
                  className={`${cardBaseClass} ${cardThemeClass}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex h-16 sm:h-18 items-center justify-center px-2 py-2 text-center">
                    <span className="text-sm font-medium group-hover:scale-[1.02] transform transition-transform duration-300">
                      {getBookShortName(book.bookId, language, language === "simplified" ? toSimplified(book.bookName) : book.bookName)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
