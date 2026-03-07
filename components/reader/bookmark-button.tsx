"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Bookmark, BookmarkColor, Language } from "@/types/bookmark"
import type { Book } from "@/lib/reading-data"
import { bookmarkLabels } from "@/hooks/use-bookmarks"
import { Bookmark as BookmarkIcon, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BookmarkButtonProps {
  bookId: string
  messageIndex: number
  paragraphIndex?: number
  language: Language
  existingBookmark?: Bookmark
  onAddBookmark: () => void
  onEditBookmark?: (bookmark: Bookmark) => void
  onRemoveBookmark?: (id: string) => void
  className?: string
  variant?: "icon" | "button"
}

export function BookmarkButton({
  bookId,
  messageIndex,
  paragraphIndex,
  language,
  existingBookmark,
  onAddBookmark,
  onEditBookmark,
  onRemoveBookmark,
  className,
  variant = "icon",
}: BookmarkButtonProps) {
  const l = bookmarkLabels[language]
  const isBookmarked = !!existingBookmark
  
  if (variant === "button") {
    return (
      <Button
        variant={isBookmarked ? "default" : "outline"}
        size="sm"
        onClick={onAddBookmark}
        className={className}
      >
        <BookmarkIcon className={cn("h-4 w-4 mr-1", isBookmarked && "fill-current")} />
        {isBookmarked ? l.editBookmark : l.addBookmark}
      </Button>
    )
  }
  
  // Icon variant with dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            isBookmarked && "text-primary",
            className
          )}
        >
          <BookmarkIcon className={cn("h-4 w-4", isBookmarked && "fill-current")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isBookmarked ? (
          <>
            <DropdownMenuItem onClick={onAddBookmark}>
              <BookmarkIcon className="h-4 w-4 mr-2" />
              {l.editBookmark}
            </DropdownMenuItem>
            {onRemoveBookmark && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onRemoveBookmark(existingBookmark.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Plus className="h-4 w-4 mr-2 rotate-45" />
                  {l.deleteBookmark}
                </DropdownMenuItem>
              </>
            )}
          </>
        ) : (
          <DropdownMenuItem onClick={onAddBookmark}>
            <BookmarkIcon className="h-4 w-4 mr-2" />
            {l.addBookmark}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}