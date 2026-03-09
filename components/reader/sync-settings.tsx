'use client'

import { useUser } from '@clerk/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Clock } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSync } from '@/hooks/use-sync'

export function SyncSettings() {
  const { user } = useUser()
  const { theme } = useTheme()
  const {
    isSyncing,
    lastSyncTime,
    error,
    isOnline,
    triggerSync,
    isAuthenticated,
    pendingChanges,
  } = useSync()

  const handleSync = async () => {
    await triggerSync()
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

  // Format last sync time
  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return null
    try {
      const date = new Date(isoString)
      return date.toLocaleString()
    } catch {
      return null
    }
  }

  const formattedLastSync = formatLastSync(lastSyncTime)

  return (
    <Card className={`${cardClass} border`}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3 mb-4">
          {isOnline ? (
            <Cloud className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
          ) : (
            <CloudOff className={`h-5 w-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
          )}
          <div>
            <h3 className={`font-medium ${textPrimaryClass}`}>Cloud Sync</h3>
            <p className={`text-sm ${textSecondaryClass}`}>
              {isAuthenticated
                ? `Signed in as ${user?.emailAddresses?.[0]?.emailAddress || 'User'}`
                : 'Sign in to sync your data'
              }
            </p>
          </div>
        </div>

        {/* Online/Offline Status */}
        {!isOnline && (
          <div className={`flex items-center gap-2 mb-4 text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
            <CloudOff className="h-4 w-4" />
            You're offline - sync will resume when back online
          </div>
        )}

        {/* Error Status */}
        {error && (
          <div className={`flex items-center gap-2 mb-4 text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Last Sync Time */}
        {formattedLastSync && (
          <div className={`flex items-center gap-2 mb-4 text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
            <Check className="h-4 w-4" />
            Last synced: {formattedLastSync}
          </div>
        )}

        {/* Pending Changes */}
        {pendingChanges > 0 && (
          <div className={`flex items-center gap-2 mb-4 text-sm ${textSecondaryClass}`}>
            <Clock className="h-4 w-4" />
            {pendingChanges} pending change{pendingChanges !== 1 ? 's' : ''} awaiting sync
          </div>
        )}

        <Button
          onClick={handleSync}
          disabled={isSyncing || !isOnline || !isAuthenticated}
          className="w-full"
          variant="outline"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </>
          )}
        </Button>

        {/* Sync Info */}
        <p className={`text-xs mt-3 ${textSecondaryClass} opacity-70`}>
          Sync your bookmarks, highlights, notes, and reading progress across devices.
        </p>
      </CardContent>
    </Card>
  )
}