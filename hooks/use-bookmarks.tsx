"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { Bookmark, BookmarkColor } from "@/types/bookmark"
import {
  getBookmarks,
  saveBookmarks,
  addBookmark as addBookmarkToStorage,
  updateBookmark as updateBookmarkInStorage,
  deleteBookmark as deleteBookmarkFromStorage,
  getBookmarksForBook,
  isBookmarked,
} from "@/lib/bookmarks"
import syncService from "@/lib/sync-service"

interface UseBookmarksReturn {
  bookmarks: Bookmark[]
  isLoading: boolean
  addBookmark: (bookmark: Omit<Bookmark, "id" | "createdAt">) => Bookmark
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Bookmark | null
  deleteBookmark: (id: string) => boolean
  getBookmarksForCurrentBook: (bookId: string) => Bookmark[]
  isLocationBookmarked: (bookId: string, messageIndex: number, paragraphIndex?: number) => Bookmark | undefined
  clearAllBookmarks: () => void
  bookmarkCount: number
}

export function useBookmarks(): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Load bookmarks on mount - use syncService which handles localStorage
  useEffect(() => {
    const loaded = syncService.getBookmarks()
    setBookmarks(loaded)
    setIsLoading(false)
  }, [])
  
  // Add a new bookmark
  const addBookmark = useCallback((bookmark: Omit<Bookmark, "id" | "createdAt">): Bookmark => {
    const newBookmark = addBookmarkToStorage(bookmark)
    setBookmarks((prev) => [...prev, newBookmark])
    // Trigger sync - syncService.saveBookmarks will be called by the storage function
    // which handles both localStorage and scheduling cloud sync
    const allBookmarks = syncService.getBookmarks()
    syncService.saveBookmarks([...allBookmarks, newBookmark])
    return newBookmark
  }, [])
  
  // Update an existing bookmark
  const updateBookmark = useCallback((id: string, updates: Partial<Bookmark>): Bookmark | null => {
    const updated = updateBookmarkInStorage(id, updates)
    if (updated) {
      setBookmarks((prev) =>
        prev.map((b) => (b.id === id ? updated : b))
      )
      // Trigger sync with updated bookmarks
      const allBookmarks = syncService.getBookmarks().map((b) =>
        b.id === id ? updated : b
      )
      syncService.saveBookmarks(allBookmarks)
    }
    return updated
  }, [])
  
  // Delete a bookmark
  const deleteBookmark = useCallback((id: string): boolean => {
    const success = deleteBookmarkFromStorage(id)
    if (success) {
      setBookmarks((prev) => prev.filter((b) => b.id !== id))
      // Trigger sync with updated bookmarks
      const allBookmarks = syncService.getBookmarks().filter((b) => b.id !== id)
      syncService.saveBookmarks(allBookmarks)
    }
    return success
  }, [])
  
  // Get bookmarks for current book
  const getBookmarksForCurrentBook = useCallback((bookId: string): Bookmark[] => {
    return bookmarks.filter((b) => b.bookId === bookId)
  }, [bookmarks])
  
  // Check if a location is bookmarked
  const isLocationBookmarked = useCallback((
    bookId: string,
    messageIndex: number,
    paragraphIndex?: number
  ): Bookmark | undefined => {
    return bookmarks.find((b) => {
      if (b.bookId !== bookId || b.messageIndex !== messageIndex) return false
      if (paragraphIndex !== undefined && b.paragraphIndex !== undefined) {
        return b.paragraphIndex === paragraphIndex
      }
      return paragraphIndex === undefined && b.paragraphIndex === undefined
    })
  }, [bookmarks])
  
  // Clear all bookmarks
  const clearAllBookmarks = useCallback(() => {
    syncService.saveBookmarks([])
    setBookmarks([])
  }, [])
  
  // Bookmark count
  const bookmarkCount = useMemo(() => bookmarks.length, [bookmarks])
  
  return {
    bookmarks,
    isLoading,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    getBookmarksForCurrentBook,
    isLocationBookmarked,
    clearAllBookmarks,
    bookmarkCount,
  }
}

// Multilingual labels for bookmark UI
export const bookmarkLabels = {
  simplified: {
    addBookmark: "添加书签",
    editBookmark: "编辑书签",
    deleteBookmark: "删除书签",
    bookmarkLabel: "标签",
    bookmarkNote: "备注",
    bookmarkColor: "颜色",
    save: "保存",
    cancel: "取消",
    delete: "删除",
    noBookmarks: "还没有书签",
    bookmarks: "书签",
    confirmDelete: "确定要删除这个书签吗？",
    bookmarkAdded: "书签已添加",
    bookmarkUpdated: "书签已更新",
    bookmarkDeleted: "书签已删除",
    colorNames: {
      default: "默认",
      red: "红色",
      orange: "橙色",
      green: "绿色",
      blue: "蓝色",
      purple: "紫色",
    } as Record<BookmarkColor, string>,
  },
  traditional: {
    addBookmark: "添加書籤",
    editBookmark: "編輯書籤",
    deleteBookmark: "刪除書籤",
    bookmarkLabel: "標籤",
    bookmarkNote: "備註",
    bookmarkColor: "顏色",
    save: "保存",
    cancel: "取消",
    delete: "刪除",
    noBookmarks: "還沒有書籤",
    bookmarks: "書籤",
    confirmDelete: "確定要刪除這個書籤嗎？",
    bookmarkAdded: "書籤已添加",
    bookmarkUpdated: "書籤已更新",
    bookmarkDeleted: "書籤已刪除",
    colorNames: {
      default: "預設",
      red: "紅色",
      orange: "橙色",
      green: "綠色",
      blue: "藍色",
      purple: "紫色",
    } as Record<BookmarkColor, string>,
  },
  english: {
    addBookmark: "Add Bookmark",
    editBookmark: "Edit Bookmark",
    deleteBookmark: "Delete Bookmark",
    bookmarkLabel: "Label",
    bookmarkNote: "Note",
    bookmarkColor: "Color",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    noBookmarks: "No bookmarks yet",
    bookmarks: "Bookmarks",
    confirmDelete: "Are you sure you want to delete this bookmark?",
    bookmarkAdded: "Bookmark added",
    bookmarkUpdated: "Bookmark updated",
    bookmarkDeleted: "Bookmark deleted",
    colorNames: {
      default: "Default",
      red: "Red",
      orange: "Orange",
      green: "Green",
      blue: "Blue",
      purple: "Purple",
    } as Record<BookmarkColor, string>,
  },
}