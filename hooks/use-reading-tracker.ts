'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  loadStats,
  loadGoals,
  trackMessageRead,
  trackReadingTime,
  addGoal,
  deleteGoal,
  refreshGoalsProgress,
  checkAndResetGoalPeriods,
  type ReadingStats,
  type ReadingGoal,
} from '@/lib/reading-tracker'
import syncService from '@/lib/sync-service'

interface UseReadingTrackerReturn {
  stats: ReadingStats | null
  goals: ReadingGoal[]
  trackMessage: (bookId: string, messageId: string, readingTimeSeconds?: number) => void
  trackTime: (bookId: string, seconds: number) => void
  addNewGoal: (type: 'daily' | 'weekly' | 'monthly', target: number, unit: 'messages' | 'minutes') => void
  removeGoal: (goalId: string) => void
  refreshStats: () => void
  refreshGoals: () => void
}

export function useReadingTracker(): UseReadingTrackerReturn {
  const [stats, setStats] = useState<ReadingStats | null>(null)
  const [goals, setGoals] = useState<ReadingGoal[]>([])
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    refreshStats()
    refreshGoals()
    
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refreshStats = useCallback(() => {
    if (!mountedRef.current) return
    // Load from sync service which handles localStorage
    const loadedStats = syncService.getReadingStats()
    setStats(loadedStats)
  }, [])

  const refreshGoals = useCallback(() => {
    if (!mountedRef.current) return
    // Check and reset goal periods before loading goals for display
    // This ensures periods are reset even if user hasn't read for a while
    const goals = checkAndResetGoalPeriods()
    setGoals(goals)
    // Also update sync service
    syncService.saveReadingGoals(goals)
  }, [])

  const trackMessage = useCallback((bookId: string, messageId: string, readingTimeSeconds: number = 60) => {
    const updatedStats = trackMessageRead(bookId, messageId, readingTimeSeconds)
    if (mountedRef.current) {
      setStats(updatedStats)
      // Save to sync service for cloud sync
      syncService.saveReadingStats(updatedStats)
      // Also refresh goals to update progress
      const updatedGoals = refreshGoalsProgress()
      setGoals(updatedGoals)
      syncService.saveReadingGoals(updatedGoals)
    }
  }, [])

  const trackTime = useCallback((bookId: string, seconds: number) => {
    trackReadingTime(bookId, seconds)
    if (mountedRef.current) {
      // Refresh and sync stats and goals
      const updatedStats = syncService.getReadingStats()
      setStats(updatedStats)
      syncService.saveReadingStats(updatedStats)
      
      const updatedGoals = syncService.getReadingGoals()
      setGoals(updatedGoals)
      syncService.saveReadingGoals(updatedGoals)
    }
  }, [])

  const addNewGoal = useCallback((type: 'daily' | 'weekly' | 'monthly', target: number, unit: 'messages' | 'minutes') => {
    const updatedGoals = addGoal(type, target, unit)
    if (mountedRef.current) {
      setGoals(updatedGoals)
      // Save to sync service for cloud sync
      syncService.saveReadingGoals(updatedGoals)
    }
  }, [])

  const removeGoal = useCallback((goalId: string) => {
    const updatedGoals = deleteGoal(goalId)
    if (mountedRef.current) {
      setGoals(updatedGoals)
      // Save to sync service for cloud sync
      syncService.saveReadingGoals(updatedGoals)
    }
  }, [])

  return {
    stats,
    goals,
    trackMessage,
    trackTime,
    addNewGoal,
    removeGoal,
    refreshStats,
    refreshGoals,
  }
}

// Hook for tracking reading time automatically
export function useReadingTimer(bookId: string, isActive: boolean = true) {
  const startTimeRef = useRef<number | null>(null)
  const accumulatedTimeRef = useRef<number>(0)
  const lastTickRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isActive) {
      // Pause timer
      if (startTimeRef.current && lastTickRef.current) {
        accumulatedTimeRef.current += (Date.now() - lastTickRef.current) / 1000
      }
      startTimeRef.current = null
      lastTickRef.current = null
      return
    }

    // Start or resume timer
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
      lastTickRef.current = Date.now()
    }

    // Track time every 30 seconds
    const interval = setInterval(() => {
      if (lastTickRef.current && isActive) {
        const elapsed = (Date.now() - lastTickRef.current) / 1000
        accumulatedTimeRef.current += elapsed
        lastTickRef.current = Date.now()
        
        // Track every 30 seconds
        if (accumulatedTimeRef.current >= 30) {
          trackReadingTime(bookId, accumulatedTimeRef.current)
          accumulatedTimeRef.current = 0
        }
      }
    }, 30000) // 30 seconds

    return () => {
      clearInterval(interval)
      // Track any remaining time
      if (accumulatedTimeRef.current > 0) {
        trackReadingTime(bookId, accumulatedTimeRef.current)
        accumulatedTimeRef.current = 0
      }
    }
  }, [bookId, isActive])

  // Track time on unmount or when bookId changes
  useEffect(() => {
    return () => {
      if (accumulatedTimeRef.current > 0) {
        trackReadingTime(bookId, accumulatedTimeRef.current)
        accumulatedTimeRef.current = 0
      }
    }
  }, [bookId])
}

// Hook for tracking message visibility
export function useMessageVisibility(
  bookId: string,
  messageIndex: number,
  messageId: string,
  options: {
    minVisibleTime?: number // Minimum time in ms before counting as read
    threshold?: number // Percentage of message that needs to be visible
  } = {}
) {
  const { minVisibleTime = 3000, threshold = 0.5 } = options
  const messageRef = useRef<HTMLDivElement>(null)
  const visibilityStartRef = useRef<number | null>(null)
  const hasBeenReadRef = useRef(false)

  useEffect(() => {
    const messageEl = messageRef.current
    if (!messageEl) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            // Message is visible
            if (!visibilityStartRef.current) {
              visibilityStartRef.current = Date.now()
            }
          } else {
            // Message is not visible
            if (visibilityStartRef.current && !hasBeenReadRef.current) {
              const visibleTime = Date.now() - visibilityStartRef.current
              if (visibleTime >= minVisibleTime) {
                // Message was visible long enough, count as read
                hasBeenReadRef.current = true
                trackMessageRead(bookId, messageId, Math.round(visibleTime / 1000))
              }
            }
            visibilityStartRef.current = null
          }
        })
      },
      {
        threshold: [threshold],
      }
    )

    observer.observe(messageEl)

    return () => {
      observer.disconnect()
      // If message was visible when unmounting, track it
      if (visibilityStartRef.current && !hasBeenReadRef.current) {
        const visibleTime = Date.now() - visibilityStartRef.current
        if (visibleTime >= minVisibleTime) {
          trackMessageRead(bookId, messageId, Math.round(visibleTime / 1000))
        }
      }
    }
  }, [bookId, messageId, minVisibleTime, threshold])

  return messageRef
}