"use client"

import { BookOpen } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/hooks/use-language"
import { getBookName } from "@/lib/book-names"
import { formatEnglishTitle } from "@/lib/title-case"

interface TocMessage {
  id: string
  title: string
}

interface TableOfContentsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookId: string
  bookName: string
  messages: TocMessage[]
  englishMessages?: TocMessage[]
  currentMessageIndex: number
  onSelectMessage: (index: number) => void
}

export function TableOfContents({
  open,
  onOpenChange,
  bookId,
  bookName,
  messages,
  englishMessages,
  currentMessageIndex,
  onSelectMessage,
}: TableOfContentsProps) {
  const { language, toSimplified } = useLanguage()
  
  // Use English data if available and in English mode
  const activeMessages = language === "english" && englishMessages ? englishMessages : messages
  const displayBookName = getBookName(bookId, language, bookName)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 bg-background" aria-describedby={undefined}>
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border bg-background">
          <div className="flex items-center gap-2.5">
            <BookOpen className="size-5 text-primary" />
            <SheetTitle className="text-base font-bold text-foreground">
              {displayBookName}
            </SheetTitle>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)] bg-background">
          <nav className="py-3" aria-label="Table of contents">
            <ul>
              {activeMessages.map((msg, index) => {
                const displayTitle = language === "english"
                  ? formatEnglishTitle(msg.title)
                  : language === "simplified"
                    ? toSimplified(msg.title)
                    : msg.title
                return (
                  <li key={msg.id}>
                    <button
                      onClick={() => onSelectMessage(index)}
                      className={cn(
                        "w-full text-left px-5 py-2.5 text-sm transition-colors",
                        "text-foreground",
                        index === currentMessageIndex
                          ? "text-primary bg-secondary/80 font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      )}
                    >
                      <span className="mr-2 text-xs text-muted-foreground">{index + 1}.</span>
                      {displayTitle}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
