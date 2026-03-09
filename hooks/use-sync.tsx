'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import syncService, {
  type SyncStatus,
  type SyncState,
  type SyncEventType,
  type SyncEvent,
} from '@/lib/sync-service'

export interface UseSyncReturn {
  // Sync state
  isSyncing: boolean
  lastSyncTime: string | null
  error: string | null
  isOnline: boolean
  status: SyncStatus
  pendingChanges: number

  // Sync methods
  syncToCloud: () => Promise<{ success: boolean; error?: string }>
  syncFromCloud: () => Promise<{ success: boolean; error?: string }>
  fullSync: () => Promise<{ success: boolean; error?: string }>
  triggerSync: () => Promise<{ success: boolean; error?: string }>

  // Auth state
  isAuthenticated: boolean
  userId: string | null
}

// Debounce helper
function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}

export function useSync(): UseSyncReturn {
  const { user, isLoaded } = useUser()
  const [syncState, setSyncState] = useState<SyncState>(() => syncService.getSyncState())
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  // Track if we've already synced on auth change
  const hasSyncedOnAuthRef = useRef(false)

  // Get current user ID
  const userId = user?.id ?? null
  const isAuthenticated = isLoaded && !!user

  // Subscribe to sync service events
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      const newState = syncService.getSyncState()
      setSyncState(newState)
    }

    // Subscribe to all relevant events
    const unsubscribers: (() => void)[] = []
    const eventTypes: SyncEventType[] = [
      'sync:start',
      'sync:complete',
      'sync:error',
      'data:changed',
      'auth:changed',
    ]

    for (const eventType of eventTypes) {
      unsubscribers.push(syncService.subscribe(eventType, handleSyncEvent))
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub())
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // Sync on auth change (when user logs in)
  useEffect(() => {
    if (isAuthenticated && userId && !hasSyncedOnAuthRef.current) {
      hasSyncedOnAuthRef.current = true
      // Perform initial sync when user logs in
      syncService.fullSync(userId).catch((error) => {
        console.error('Initial sync failed:', error)
      })
    } else if (!isAuthenticated) {
      hasSyncedOnAuthRef.current = false
    }
  }, [isAuthenticated, userId])

  // Sync to cloud (upload local data)
  const syncToCloud = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'Not authenticated' }
    }
    if (!isOnline) {
      return { success: false, error: 'Offline - cannot sync' }
    }
    return syncService.syncToCloud(userId)
  }, [userId, isOnline])

  // Sync from cloud (download cloud data)
  const syncFromCloud = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'Not authenticated' }
    }
    if (!isOnline) {
      return { success: false, error: 'Offline - cannot sync' }
    }
    return syncService.syncFromCloud(userId)
  }, [userId, isOnline])

  // Full sync (both directions)
  const fullSync = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'Not authenticated' }
    }
    if (!isOnline) {
      return { success: false, error: 'Offline - cannot sync' }
    }
    return syncService.fullSync(userId)
  }, [userId, isOnline])

  // Trigger sync - convenience method that performs full sync
  const triggerSync = fullSync

  return {
    // Sync state
    isSyncing: syncState.status === 'syncing',
    lastSyncTime: syncState.lastSyncAt,
    error: syncState.error,
    isOnline,
    status: syncState.status,
    pendingChanges: syncState.pendingChanges,

    // Sync methods
    syncToCloud,
    syncFromCloud,
    fullSync,
    triggerSync,

    // Auth state
    isAuthenticated,
    userId,
  }
}

// Hook for debounced sync triggering (used by other hooks)
export function useDebouncedSync(delay: number = 2000) {
  const { userId, isOnline, isAuthenticated } = useSync()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Trigger a debounced sync
  const triggerDebouncedSync = useCallback(() => {
    if (!isAuthenticated || !userId || !isOnline) {
      // Don't sync if not authenticated or offline
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Schedule sync
    timeoutRef.current = setTimeout(() => {
      syncService.fullSync(userId).catch((error) => {
        console.error('Debounced sync failed:', error)
      })
    }, delay)
  }, [isAuthenticated, userId, isOnline, delay])

  return { triggerDebouncedSync }
}

// Re-export syncService for direct access in other hooks
export { syncService }

export default useSync