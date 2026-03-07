/**
 * Auto-backup reminder utility
 * Reminds users to backup their data periodically
 */

const STORAGE_KEY_LAST_BACKUP = "life-study:last-backup"
const STORAGE_KEY_BACKUP_REMINDER_DISMISSED = "life-study:backup-reminder-dismissed"

// Default reminder interval: 7 days in milliseconds
const DEFAULT_REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000

// Grace period after dismissing: 3 days
const DISMISS_GRACE_PERIOD = 3 * 24 * 60 * 60 * 1000

/**
 * Get the last backup timestamp
 */
export function getLastBackupTime(): number | null {
  if (typeof window === "undefined") return null
  
  const stored = localStorage.getItem(STORAGE_KEY_LAST_BACKUP)
  if (!stored) return null
  
  const timestamp = parseInt(stored, 10)
  return isNaN(timestamp) ? null : timestamp
}

/**
 * Record a backup event
 */
export function recordBackup(): void {
  if (typeof window === "undefined") return
  
  localStorage.setItem(STORAGE_KEY_LAST_BACKUP, String(Date.now()))
  // Clear dismissal since user just backed up
  localStorage.removeItem(STORAGE_KEY_BACKUP_REMINDER_DISMISSED)
}

/**
 * Check if enough time has passed since last backup
 */
export function shouldShowBackupReminder(intervalMs: number = DEFAULT_REMINDER_INTERVAL): boolean {
  if (typeof window === "undefined") return false
  
  // Check if reminder was recently dismissed
  const dismissedAt = localStorage.getItem(STORAGE_KEY_BACKUP_REMINDER_DISMISSED)
  if (dismissedAt) {
    const dismissedTime = parseInt(dismissedAt, 10)
    if (!isNaN(dismissedTime) && Date.now() - dismissedTime < DISMISS_GRACE_PERIOD) {
      return false
    }
  }
  
  const lastBackup = getLastBackupTime()
  
  // Never backed up
  if (lastBackup === null) {
    // Check if user has any data to backup
    return hasUserData()
  }
  
  // Check if interval has passed
  return Date.now() - lastBackup > intervalMs
}

/**
 * Dismiss the backup reminder
 */
export function dismissBackupReminder(): void {
  if (typeof window === "undefined") return
  
  localStorage.setItem(STORAGE_KEY_BACKUP_REMINDER_DISMISSED, String(Date.now()))
}

/**
 * Check if user has any data worth backing up
 */
export function hasUserData(): boolean {
  if (typeof window === "undefined") return false
  
  // Check for any reading states
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith("life-study-reader:")) {
      // Found some user data
      return true
    }
  }
  
  return false
}

/**
 * Get human-readable time since last backup
 */
export function getTimeSinceLastBackup(): string | null {
  const lastBackup = getLastBackupTime()
  if (lastBackup === null) return null
  
  const diffMs = Date.now() - lastBackup
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
  const diffMinutes = Math.floor(diffMs / (60 * 1000))
  
  if (diffDays > 0) {
    return `${diffDays} 天前`
  } else if (diffHours > 0) {
    return `${diffHours} 小时前`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} 分钟前`
  } else {
    return "刚刚"
  }
}

/**
 * Get backup status for display
 */
export function getBackupStatus(): {
  hasBackup: boolean
  lastBackupTime: number | null
  timeSinceBackup: string | null
  needsBackup: boolean
} {
  const lastBackupTime = getLastBackupTime()
  const hasBackup = lastBackupTime !== null
  const timeSinceBackup = getTimeSinceLastBackup()
  const needsBackup = shouldShowBackupReminder()
  
  return {
    hasBackup,
    lastBackupTime,
    timeSinceBackup,
    needsBackup,
  }
}