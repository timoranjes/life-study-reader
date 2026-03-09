'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Book, Clock, Calendar, TrendingUp, Award, Target, Flame } from 'lucide-react'
import { useTheme } from 'next-themes'
import { loadStats, type ReadingStats } from '@/lib/reading-tracker'

interface StatsSectionProps {
  language: 'traditional' | 'simplified' | 'english'
  toSimplified: (text: string) => string
}

const labels = {
  traditional: {
    title: '閱讀統計',
    totalMessages: '已讀信息',
    totalBooks: '已讀書籍',
    readingTime: '閱讀時間',
    currentStreak: '連續閱讀',
    longestStreak: '最長連續',
    thisWeek: '本週閱讀',
    thisMonth: '本月閱讀',
    minutes: '分鐘',
    hours: '小時',
    days: '天',
    messages: '篇',
    noData: '尚無閱讀記錄',
    noDataDescription: '開始閱讀後，您的統計數據將顯示在這裡',
    lastRead: '上次閱讀',
    streakEmoji: '🔥',
    keepGoing: '繼續保持！',
    startStreak: '開始您的閱讀連續記錄',
  },
  simplified: {
    title: '阅读统计',
    totalMessages: '已读信息',
    totalBooks: '已读书籍',
    readingTime: '阅读时间',
    currentStreak: '连续阅读',
    longestStreak: '最长连续',
    thisWeek: '本周阅读',
    thisMonth: '本月阅读',
    minutes: '分钟',
    hours: '小时',
    days: '天',
    messages: '篇',
    noData: '尚无阅读记录',
    noDataDescription: '开始阅读后，您的统计数据将显示在这里',
    lastRead: '上次阅读',
    streakEmoji: '🔥',
    keepGoing: '继续保持！',
    startStreak: '开始您的阅读连续记录',
  },
  english: {
    title: 'Reading Stats',
    totalMessages: 'Messages Read',
    totalBooks: 'Books Read',
    readingTime: 'Reading Time',
    currentStreak: 'Current Streak',
    longestStreak: 'Longest Streak',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    minutes: 'min',
    hours: 'hr',
    days: 'days',
    messages: 'messages',
    noData: 'No Reading Records',
    noDataDescription: 'Start reading and your stats will appear here',
    lastRead: 'Last Read',
    streakEmoji: '🔥',
    keepGoing: 'Keep it up!',
    startStreak: 'Start your reading streak',
  },
}

export function StatsSection({ language, toSimplified }: StatsSectionProps) {
  const { theme } = useTheme()
  const [stats, setStats] = useState<ReadingStats | null>(null)
  const [mounted, setMounted] = useState(false)

  const effectiveLanguage = language === 'simplified' ? 'simplified' : language
  const t = labels[effectiveLanguage]

  useEffect(() => {
    setMounted(true)
    loadStatsFromStorage()
    
    // Listen for storage changes (from other tabs or reader)
    const handleStorageChange = () => {
      loadStatsFromStorage()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Also refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadStatsFromStorage()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadStatsFromStorage = () => {
    const loadedStats = loadStats()
    setStats(loadedStats)
  }

  const cardClass = theme === 'sepia'
    ? 'bg-[#f5edd8]/80 border-[#d4c4a8]'
    : theme === 'dark'
      ? 'bg-zinc-900/60 border-zinc-800'
      : 'bg-white/70 border-slate-200/60'

  const textPrimaryClass = theme === 'sepia'
    ? 'text-stone-900'
    : theme === 'dark'
      ? 'text-slate-100'
      : 'text-slate-900'

  const textSecondaryClass = theme === 'sepia'
    ? 'text-stone-700'
    : theme === 'dark'
      ? 'text-slate-300'
      : 'text-slate-600'

  if (!mounted) return null

  if (!stats || stats.totalMessages === 0) {
    return (
      <div className="space-y-4">
        <Card className={`${cardClass} border`}>
          <CardContent className="pt-6 text-center">
            <TrendingUp className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${textPrimaryClass}`}>{t.noData}</h3>
            <p className={`text-sm ${textSecondaryClass}`}>{t.noDataDescription}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} ${t.minutes}`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours} ${t.hours} ${mins} ${t.minutes}` : `${hours} ${t.hours}`
  }

  const statCards = [
    { icon: Book, label: t.totalMessages, value: `${stats.totalMessages} ${t.messages}`, color: 'text-blue-500' },
    { icon: Target, label: t.totalBooks, value: stats.totalBooks, color: 'text-green-500' },
    { icon: Clock, label: t.readingTime, value: formatReadingTime(stats.totalReadingTimeMinutes), color: 'text-purple-500' },
    { icon: Flame, label: t.currentStreak, value: `${stats.currentStreak} ${t.days}`, color: 'text-orange-500' },
  ]

  return (
    <div className="space-y-4">
      {/* Streak Banner */}
      {stats.currentStreak > 0 && (
        <Card className={`${cardClass} border`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t.streakEmoji}</span>
                <div>
                  <p className={`text-sm font-medium ${textPrimaryClass}`}>{t.currentStreak}</p>
                  <p className={`text-xs ${textSecondaryClass}`}>{t.keepGoing}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold text-orange-500`}>{stats.currentStreak}</p>
                <p className={`text-xs ${textSecondaryClass}`}>{t.days}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat, index) => (
          <Card key={index} className={`${cardClass} border`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className={`text-xs ${textSecondaryClass}`}>{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${textPrimaryClass}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Longest Streak */}
      {stats.longestStreak > 0 && (
        <Card className={`${cardClass} border`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className={`h-5 w-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={`text-sm font-medium ${textPrimaryClass}`}>{t.longestStreak}</span>
              </div>
              <span className={`text-lg font-bold ${textPrimaryClass}`}>{stats.longestStreak} {t.days}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly/Monthly Progress */}
      <div className="grid grid-cols-2 gap-3">
        <Card className={`${cardClass} border`}>
          <CardContent className="pt-4 pb-3">
            <p className={`text-xs ${textSecondaryClass} mb-1`}>{t.thisWeek}</p>
            <p className={`text-lg font-bold ${textPrimaryClass}`}>{stats.thisWeekMessages} {t.messages}</p>
          </CardContent>
        </Card>
        <Card className={`${cardClass} border`}>
          <CardContent className="pt-4 pb-3">
            <p className={`text-xs ${textSecondaryClass} mb-1`}>{t.thisMonth}</p>
            <p className={`text-lg font-bold ${textPrimaryClass}`}>{stats.thisMonthMessages} {t.messages}</p>
          </CardContent>
        </Card>
      </div>

      {/* Last Read */}
      {stats.lastReadDate && (
        <Card className={`${cardClass} border`}>
          <CardContent className="pt-4">
            <p className={`text-xs ${textSecondaryClass}`}>{t.lastRead}: {new Date(stats.lastReadDate).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}