'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Clock } from 'lucide-react'
import { syncService } from '@/lib/sync-service'
import { getBookName, bookNamesMap } from '@/lib/book-names'

interface ContinueReadingCardProps {
  language: 'traditional' | 'simplified' | 'english'
  toSimplified: (text: string) => string
  theme: 'light' | 'sepia' | 'dark'
}

const labels = {
  traditional: {
    continueReading: '繼續閱讀',
    readAgo: '前閱讀',
    justNow: '剛剛閱讀',
    minutesAgo: '分鐘前閱讀',
    hoursAgo: '小時前閱讀',
    daysAgo: '天前閱讀',
    yesterday: '昨天閱讀',
  },
  simplified: {
    continueReading: '继续阅读',
    readAgo: '前阅读',
    justNow: '刚刚阅读',
    minutesAgo: '分钟前阅读',
    hoursAgo: '小时前阅读',
    daysAgo: '天前阅读',
    yesterday: '昨天阅读',
  },
  english: {
    continueReading: 'Continue Reading',
    readAgo: 'ago',
    justNow: 'Just now',
    minutesAgo: 'min ago',
    hoursAgo: 'hr ago',
    daysAgo: 'days ago',
    yesterday: 'Yesterday',
  },
}

// Format message number based on language
function formatMessageNumber(messageNumber: number, language: 'traditional' | 'simplified' | 'english'): string {
  if (language === 'english') {
    return `Message ${messageNumber}`
  }
  // Chinese: "第x篇"
  return `第${messageNumber}篇`
}

function getRelativeTime(dateString: string, language: 'traditional' | 'simplified' | 'english'): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  const t = labels[language]
  
  if (diffMins < 1) {
    return t.justNow
  } else if (diffMins < 60) {
    if (language === 'english') {
      return `${diffMins} ${t.minutesAgo}`
    }
    return `${diffMins} ${t.minutesAgo}`
  } else if (diffHours < 24) {
    if (language === 'english') {
      return `${diffHours} ${t.hoursAgo}`
    }
    return `${diffHours} ${t.hoursAgo}`
  } else if (diffDays === 1) {
    return t.yesterday
  } else if (diffDays < 7) {
    if (language === 'english') {
      return `${diffDays} ${t.daysAgo}`
    }
    return `${diffDays} ${t.daysAgo}`
  } else {
    // For older dates, show the actual date
    return date.toLocaleDateString(language === 'english' ? 'en-US' : 'zh-TW', {
      month: 'short',
      day: 'numeric',
    })
  }
}

export function ContinueReadingCard({ language, toSimplified, theme }: ContinueReadingCardProps) {
  const [mounted, setMounted] = useState(false)
  const [recentBook, setRecentBook] = useState<{
    bookId: string
    messageIndex: number
    lastReadAt: string
    bookName: string
  } | null>(null)

  useEffect(() => {
    setMounted(true)
    
    // Get the most recently read book
    const mostRecent = syncService.getMostRecentBook()
    
    if (mostRecent) {
      // Get book name from bookNamesMap
      const bookInfo = bookNamesMap[mostRecent.bookId]
      let bookName: string
      
      if (bookInfo) {
        if (language === 'english') {
          bookName = bookInfo.english
        } else if (language === 'simplified') {
          bookName = bookInfo.chineseSimplified
        } else {
          bookName = bookInfo.chinese
        }
      } else {
        bookName = mostRecent.bookId
      }
      
      setRecentBook({
        ...mostRecent,
        bookName,
      })
    }
  }, [language])

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || !recentBook) {
    return null
  }

  const t = labels[language]
  const displayBookName = language === 'simplified' ? toSimplified(recentBook.bookName) : recentBook.bookName
  const relativeTime = getRelativeTime(recentBook.lastReadAt, language)
  
  // Calculate progress (messageIndex is 0-based, display as 1-based)
  const messageNumber = recentBook.messageIndex + 1

  // Theme-aware classes
  const cardBgClass = theme === 'sepia'
    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/60'
    : theme === 'dark'
      ? 'bg-gradient-to-r from-zinc-800/80 to-zinc-800/60 border-zinc-700/60'
      : 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200/60'

  const textPrimaryClass = theme === 'sepia'
    ? 'text-stone-900'
    : theme === 'dark'
      ? 'text-slate-100'
      : 'text-slate-900'

  const textSecondaryClass = theme === 'sepia'
    ? 'text-stone-600'
    : theme === 'dark'
      ? 'text-slate-400'
      : 'text-slate-500'

  const iconBgClass = theme === 'sepia'
    ? 'bg-amber-100'
    : theme === 'dark'
      ? 'bg-zinc-700'
      : 'bg-sky-100'

  const iconClass = theme === 'sepia'
    ? 'text-amber-700'
    : theme === 'dark'
      ? 'text-sky-400'
      : 'text-sky-600'

  const chevronClass = theme === 'sepia'
    ? 'text-amber-600'
    : theme === 'dark'
      ? 'text-slate-400'
      : 'text-slate-400'

  return (
    <Link href={`/reader/${recentBook.bookId}`} className="block">
      <Card className={`
        ${cardBgClass}
        border shadow-sm hover:shadow-md
        transition-all duration-200
        cursor-pointer overflow-hidden
      `}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={`
              ${iconBgClass}
              p-2 rounded-lg flex-shrink-0
            `}>
              <BookOpen className={`w-4 h-4 ${iconClass}`} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`
                  text-[11px] font-medium uppercase tracking-wide
                  ${theme === 'sepia' ? 'text-amber-700' : theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}
                `}>
                  {t.continueReading}
                </span>
                <span className={`text-[11px] ${textSecondaryClass}`}>
                  • {formatMessageNumber(messageNumber, language)}
                </span>
              </div>
              
              <h3 className={`font-medium text-sm truncate ${textPrimaryClass}`}>
                {displayBookName}
              </h3>
            </div>
            
            {/* Time */}
            <div className={`flex items-center gap-1 text-xs ${textSecondaryClass} flex-shrink-0`}>
              <Clock className="w-3 h-3" />
              <span>{relativeTime}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}