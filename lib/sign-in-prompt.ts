/**
 * Sign-in prompt utility
 * Manages the sign-in reminder state for users who haven't authenticated
 */

const STORAGE_KEY_SIGN_IN_PROMPT_DISMISSED = "life-study:sign-in-prompt-dismissed"
const STORAGE_KEY_SIGN_IN_NEVER_REMIND = "life-study:sign-in-prompt-never-remind"

// Grace period after dismissing: 3 days
const DISMISS_GRACE_PERIOD = 3 * 24 * 60 * 60 * 1000

/**
 * Check if user has any local data worth syncing
 */
export function hasLocalData(): boolean {
  if (typeof window === "undefined") return false
  
  // Check for any reading states, bookmarks, highlights, notes
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith("life-study-reader:")) {
      return true
    }
  }
  
  return false
}

/**
 * Check if the never-remind flag is set
 */
export function isSignInPromptPermanentlyDismissed(): boolean {
  if (typeof window === "undefined") return false
  
  return localStorage.getItem(STORAGE_KEY_SIGN_IN_NEVER_REMIND) === "true"
}

/**
 * Set the never-remind flag (permanent dismissal)
 */
export function setNeverRemindSignIn(): void {
  if (typeof window === "undefined") return
  
  localStorage.setItem(STORAGE_KEY_SIGN_IN_NEVER_REMIND, "true")
  // Clear any existing grace period dismissal
  localStorage.removeItem(STORAGE_KEY_SIGN_IN_PROMPT_DISMISSED)
}

/**
 * Clear the never-remind flag (re-enable prompts)
 */
export function clearNeverRemindSignIn(): void {
  if (typeof window === "undefined") return
  
  localStorage.removeItem(STORAGE_KEY_SIGN_IN_NEVER_REMIND)
  localStorage.removeItem(STORAGE_KEY_SIGN_IN_PROMPT_DISMISSED)
}

/**
 * Dismiss the sign-in prompt with a grace period
 */
export function dismissSignInPromptGrace(): void {
  if (typeof window === "undefined") return
  
  localStorage.setItem(STORAGE_KEY_SIGN_IN_PROMPT_DISMISSED, String(Date.now()))
}

/**
 * Check if grace period is active
 */
function isGracePeriodActive(): boolean {
  if (typeof window === "undefined") return false
  
  const dismissedAt = localStorage.getItem(STORAGE_KEY_SIGN_IN_PROMPT_DISMISSED)
  if (!dismissedAt) return false
  
  const dismissedTime = parseInt(dismissedAt, 10)
  if (isNaN(dismissedTime)) return false
  
  return Date.now() - dismissedTime < DISMISS_GRACE_PERIOD
}

/**
 * Check if the sign-in prompt should be shown
 * Returns true only if:
 * 1. Never-remind is NOT set
 * 2. Grace period is NOT active
 * 3. User has local data to sync
 */
export function shouldShowSignInPrompt(): boolean {
  if (typeof window === "undefined") return false
  
  // Check if permanently dismissed
  if (isSignInPromptPermanentlyDismissed()) {
    return false
  }
  
  // Check if grace period is active
  if (isGracePeriodActive()) {
    return false
  }
  
  // Only show if user has local data
  return hasLocalData()
}

/**
 * Get the current sign-in prompt state for debugging/display
 */
export function getSignInPromptStatus(): {
  neverRemind: boolean
  gracePeriodActive: boolean
  hasLocalData: boolean
  shouldShow: boolean
} {
  return {
    neverRemind: isSignInPromptPermanentlyDismissed(),
    gracePeriodActive: isGracePeriodActive(),
    hasLocalData: hasLocalData(),
    shouldShow: shouldShowSignInPrompt(),
  }
}