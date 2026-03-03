"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { FontFamily, Language } from "@/lib/reading-data"
import { useReaderSettings } from "@/hooks/use-reader-settings"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  language: Language
}

const MIN_FONT_SIZE = 14
const MAX_FONT_SIZE = 28

const labels = {
  simplified: {
    title: "阅读设置",
    fontSize: "字体大小",
    fontStyle: "字体风格",
    theme: "主题",
    preview: "预览文字",
    light: "浅色",
    dark: "深色",
    sepia: "护眼",
    system: "系统",
  },
  traditional: {
    title: "閱讀設置",
    fontSize: "字體大小",
    fontStyle: "字體風格",
    theme: "主題",
    preview: "預覽文字",
    light: "淺色",
    dark: "深色",
    sepia: "護眼",
    system: "系統",
  },
  english: {
    title: "Reading Settings",
    fontSize: "Font Size",
    fontStyle: "Font",
    theme: "Theme",
    preview: "Preview Text",
    light: "Light",
    dark: "Dark",
    sepia: "Sepia",
  },
}

const fontOptions: { id: FontFamily; label: string; enLabel: string; className: string }[] = [
  { id: "serif", label: "宋", enLabel: "Serif", className: "font-reading-serif" },
  { id: "sans", label: "黑", enLabel: "Sans", className: "font-reading-sans" },
  { id: "kai", label: "楷", enLabel: "Kai", className: "font-reading-kai" },
]

export function SettingsPanel({
  open,
  onOpenChange,
  fontSize,
  onFontSizeChange,
  language,
}: SettingsPanelProps) {
  const { theme, setTheme, fontFamily, setFontFamily } = useReaderSettings()
  const l = labels[language]

  const fontLabels =
    language === "english"
      ? { serif: "Serif", sans: "Sans", kai: "Kai" }
      : { serif: "宋", sans: "黑", kai: "楷" }

  const previewText = language === "english"
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
          {/* Font Size - single compact row */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] text-muted-foreground shrink-0 w-10">
              {l.fontSize}
            </span>
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
              <span className="text-[11px] text-muted-foreground mb-1.5 block">{l.fontStyle}</span>
              <div className="flex gap-1.5 w-full">
                <button
                  onClick={() => setFontFamily("serif")}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-md border py-1.5 px-1 transition-all text-center",
                    fontFamily === "serif"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span className="text-sm leading-none">
                    {fontLabels.serif}
                  </span>
                </button>
                <button
                  onClick={() => setFontFamily("sans")}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-md border py-1.5 px-1 transition-all text-center",
                    fontFamily === "sans"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span className="text-sm leading-none">
                    {fontLabels.sans}
                  </span>
                </button>
                <button
                  onClick={() => setFontFamily("kai")}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-md border py-1.5 px-1 transition-all text-center",
                    fontFamily === "kai"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span className="text-sm leading-none">
                    {fontLabels.kai}
                  </span>
                </button>
              </div>
            </div>

            {/* Theme */}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-muted-foreground mb-1.5 block">{l.theme}</span>
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
                    className="h-4 w-4 rounded-full border border-slate-300"
                    style={{ backgroundColor: "#ffffff" }}
                  />
                  <span className="text-[9px] leading-none">{l.light}</span>
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
                    className="h-4 w-4 rounded-full border border-amber-300"
                    style={{ backgroundColor: "#fdf6e3" }}
                  />
                  <span className="text-[9px] leading-none">
                    {l.sepia ?? "Sepia"}
                  </span>
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
                    className="h-4 w-4 rounded-full border border-slate-700"
                    style={{ backgroundColor: "#020617" }}
                  />
                  <span className="text-[9px] leading-none">{l.dark}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Compact preview */}
          <div className="border border-border rounded-md px-3 py-2 bg-card">
            <p
              className={cn(
                "text-center",
                fontFamily === "serif" && "font-reading-serif",
                fontFamily === "sans" && "font-reading-sans",
                fontFamily === "kai" && "font-reading-kai",
              )}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
            >
              {previewText}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
