"use client"

import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Empty } from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import type { Bookmark, BookmarkColor, Language } from "@/types/bookmark"
import type { Book } from "@/lib/reading-data"
import { bookmarkLabels } from "@/hooks/use-bookmarks"
import { getBookmarkColorClasses } from "@/lib/bookmarks"
import { Bookmark, ExternalLink, Trash2, Edit2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BookmarkListProps {
  bookmarks: Bookmark[]
  books: Book[]
  language: Language
  onJumpToBookmark: (bookId: string, messageIndex: number, paragraphIndex?: number) => void
  onEditBookmark?: (bookmark: Bookmark) => void
  onDeleteBookmark?: (id: string) => void
  className?: string
}

const colorOptions: BookmarkColor[] = ['default', 'red', 'orange', 'green', 'blue', 'purple']

export function BookmarkList({
  bookmarks,
  books,
  language,
  onJumpToBookmark,
  onEditBookmark,
  onDeleteBookmark,
  className,
}: BookmarkListProps) {
  const l = bookmarkLabels[language]
  
  // Group bookmarks by book
  const bookmarksByBook = useMemo(() => {
    const grouped: Record<string, Bookmark[]> = {}
    bookmarks.forEach((b) => {
      if (!grouped[b.bookId]) {
        grouped[b.bookId] = []
      }
      grouped[b.bookId].push(b)
    })
    return grouped
  }, [bookmarks])
  
  // Get book name
  const getBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId)
    return book?.name || bookId
  }
  
  // Get message title
  const getMessageTitle = (bookId: string, messageIndex: number): string => {
    const book = books.find((b) => b.id === bookId)
    return book?.messages[messageIndex]?.shortTitle || `Message ${messageIndex + 1}`
  }
  
  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString(
        language === "english" ? "en-US" : "zh-CN",
        { year: "numeric", month: "short", day: "numeric" }
      )
    } catch {
      return dateString
    }
  }
  
  if (bookmarks.length === 0) {
    return (
      <div className={className}>
        <Empty
          icon={<Bookmark className="h-12 w-12 text-muted-foreground" />}
          title={l.noBookmarks}
          description={
            language === "english"
              ? "Save locations for quick access"
              : "保存位置以便快速访问"
          }
        />
      </div>
    )
  }
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">
          {l.bookmarks} ({bookmarks.length})
        </h3>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-3 pr-4">
          {Object.entries(bookmarksByBook).map(([bookId, bookBookmarks]) => (
            <div key={bookId} className="space-y-2">
              {/* Book header */}
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {getBookName(bookId)} ({bookBookmarks.length})
              </div>
              
              {/* Bookmarks in this book */}
              {bookBookmarks.map((bookmark) => {
                const colorClasses = getBookmarkColorClasses(bookmark.color)
                
                return (
                  <div
                    key={bookmark.id}
                    className={cn(
                      "rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm",
                      colorClasses.bg
                    )}
                    onClick={() => onJumpToBookmark(bookmark.bookId, bookmark.messageIndex, bookmark.paragraphIndex)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Color dot */}
                      <div className={cn("w-3 h-3 rounded-full mt-1 shrink-0", colorClasses.dot)} />
                      
                      <div className="flex-1 min-w-0">
                        {/* Label */}
                        <p className={cn("font-medium truncate", colorClasses.text)}>
                          {bookmark.label}
                        </p>
                        
                        {/* Location */}
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {getMessageTitle(bookmark.bookId, bookmark.messageIndex)}
                          {bookmark.paragraphIndex !== undefined && (
                            <span className="ml-1">
                              {language === "english" ? `¶${bookmark.paragraphIndex + 1}` : `段${bookmark.paragraphIndex + 1}`}
                            </span>
                          )}
                        </p>
                        
                        {/* Note preview */}
                        {bookmark.note && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {bookmark.note}
                          </p>
                        )}
                        
                        {/* Date */}
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDate(bookmark.createdAt)}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        {onEditBookmark && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditBookmark(bookmark)
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onDeleteBookmark && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteBookmark(bookmark.id)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}