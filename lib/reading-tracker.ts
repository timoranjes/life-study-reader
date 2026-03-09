// Reading Tracker Library
// Tracks reading activity including messages read, reading time, and streaks
//
// IMPORTANT: Date Handling
// All date operations use local timezone to ensure consistent user experience.
// The getGoalProgress() function is the source of truth for goal progress display.
// The goal.progress field is updated incrementally for quick reference but may
// diverge from actual progress - always use getGoalProgress() for display purposes.

export interface MessageReadRecord {
  bookId: string
  messageId: string
  readAt: string // ISO timestamp
  readingTimeSeconds: number
}

export interface DailyStats {
  date: string // YYYY-MM-DD format (local timezone)
  messagesRead: number
  readingTimeMinutes: number
  booksRead: string[] // unique book IDs
  messageIds: string[] // unique message IDs read that day
}

export interface ReadingStats {
  totalMessages: number
  totalBooks: number
  totalReadingTimeMinutes: number
  currentStreak: number
  longestStreak: number
  lastReadDate: string | null
  thisWeekMessages: number
  thisMonthMessages: number
  dailyStats: DailyStats[]
}

export interface ReadingGoal {
  id: string
  type: 'daily' | 'weekly' | 'monthly'
  target: number
  unit: 'messages' | 'minutes'
  progress: number
  createdAt: string
  periodStart: string // Start of the current period (local timezone YYYY-MM-DD)
}

const STORAGE_KEYS = {
  STATS: 'reading-stats-v2',
  DAILY_STATS: 'daily-reading-stats',
  GOALS: 'reading-goals-v2',
  MESSAGE_RECORDS: 'message-read-records',
  DONE_MESSAGES: 'done-messages-v1', // New: track manually marked done messages
}

// ===== Local Date Utility Functions =====
// All date operations use local timezone to ensure consistent user experience
// A user in Asia/Hong_Kong (UTC+8) reading at 7:00 AM local time will have
// their activity recorded as the correct local date, not the previous day in UTC.

/**
 * Get a date string in YYYY-MM-DD format using local timezone
 * @param date - Date object to format, defaults to current date
 * @returns YYYY-MM-DD string in local timezone
 */
function getLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 * @returns Today's date string in local timezone
 */
function getToday(): string {
  return getLocalDateString(new Date());
}

/**
 * Get yesterday's date in YYYY-MM-DD format using local timezone
 * @returns Yesterday's date string in local timezone
 */
function getYesterdayLocal(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getLocalDateString(date);
}

/**
 * Get date from N days ago in YYYY-MM-DD format using local timezone
 * @param days - Number of days ago
 * @returns Date string in local timezone
 */
function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return getLocalDateString(date);
}

/**
 * Get start of current week (Sunday) in YYYY-MM-DD format using local timezone
 * @returns Start of week date string in local timezone
 */
function getStartOfWeek(): string {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return getLocalDateString(date);
}

/**
 * Get start of current month in YYYY-MM-DD format using local timezone
 * @returns Start of month date string in local timezone
 */
function getStartOfMonth(): string {
  const date = new Date();
  return getLocalDateString(new Date(date.getFullYear(), date.getMonth(), 1));
}

/**
 * Get period start date based on goal type using local timezone
 * @param type - Goal type (daily, weekly, monthly)
 * @returns Period start date string in local timezone
 */
function getPeriodStart(type: 'daily' | 'weekly' | 'monthly'): string {
  switch (type) {
    case 'daily':
      return getToday()
    case 'weekly':
      return getStartOfWeek()
    case 'monthly':
      return getStartOfMonth()
  }
}

/**
 * Get date N days before a given date string
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param days - Number of days before
 * @returns Date string in YYYY-MM-DD format
 */
function getDaysBefore(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00'); // Parse as local date
  date.setDate(date.getDate() - days);
  return getLocalDateString(date);
}

// Load stats from localStorage
export function loadStats(): ReadingStats {
  if (typeof window === 'undefined') {
    return getEmptyStats()
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STATS)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading reading stats:', error)
  }

  return getEmptyStats()
}

// Get empty stats object
function getEmptyStats(): ReadingStats {
  return {
    totalMessages: 0,
    totalBooks: 0,
    totalReadingTimeMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    thisWeekMessages: 0,
    thisMonthMessages: 0,
    dailyStats: [],
  }
}

// Save stats to localStorage
function saveStats(stats: ReadingStats): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats))
  } catch (error) {
    console.error('Error saving reading stats:', error)
  }
}

// Load daily stats
function loadDailyStats(): DailyStats[] {
  if (typeof window === 'undefined') return []

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DAILY_STATS)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading daily stats:', error)
  }

  return []
}

// Save daily stats
function saveDailyStats(dailyStats: DailyStats[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(dailyStats))
  } catch (error) {
    console.error('Error saving daily stats:', error)
  }
}

// Calculate streak from daily stats
// Fixed: Deduplicate dates before calculating to handle edge cases
function calculateStreak(dailyStats: DailyStats[]): { current: number; longest: number } {
  if (dailyStats.length === 0) return { current: 0, longest: 0 }

  // Deduplicate dates to handle any duplicate entries that may exist
  const uniqueDates = [...new Set(dailyStats.map(d => d.date))];
  
  // Sort by date descending
  const sorted = uniqueDates.sort((a, b) => new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime());
  
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  
  const today = getToday()
  const yesterday = getYesterdayLocal()
  
  // Check if user read today or yesterday to maintain streak
  const firstDate = sorted[0]
  if (firstDate === today || firstDate === yesterday) {
    currentStreak = 1
    
    // Count consecutive days
    for (let i = 1; i < sorted.length; i++) {
      const expectedPrevDate = getDaysBefore(sorted[i - 1], 1)
      if (sorted[i] === expectedPrevDate) {
        currentStreak++
      } else {
        break
      }
    }
  }
  
  // Calculate longest streak
  tempStreak = 1
  for (let i = 1; i < sorted.length; i++) {
    const expectedPrevDate = getDaysBefore(sorted[i - 1], 1)
    if (sorted[i] === expectedPrevDate) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)
  
  return { current: currentStreak, longest: longestStreak }
}

// Track a message being read
// NOTE: This function tracks message counts only. Time tracking is handled
// separately by trackReadingTime() to avoid double-counting.
export function trackMessageRead(
  bookId: string,
  messageId: string,
  readingTimeSeconds: number = 60 // Default 1 minute if not specified
): ReadingStats {
  const stats = loadStats()
  const dailyStats = loadDailyStats()
  const today = getToday()
  
  // Find or create today's stats
  let todayStats = dailyStats.find(d => d.date === today)
  
  if (!todayStats) {
    todayStats = {
      date: today,
      messagesRead: 0,
      readingTimeMinutes: 0,
      booksRead: [],
      messageIds: [],
    }
    dailyStats.push(todayStats)
  }
  
  // Check if this message was already read today
  const messageKey = `${bookId}-${messageId}`
  const alreadyReadToday = todayStats.messageIds.includes(messageKey)
  
  if (!alreadyReadToday) {
    // Update today's stats for message count
    todayStats.messagesRead += 1
    todayStats.messageIds.push(messageKey)
    
    if (!todayStats.booksRead.includes(bookId)) {
      todayStats.booksRead.push(bookId)
    }
  }
  
  // NOTE: Reading time is NOT added here to avoid double-counting with trackReadingTime()
  // The readingTimeSeconds parameter is kept for backward compatibility and used only for goal updates
  
  // Save daily stats
  saveDailyStats(dailyStats)
  
  // Update overall stats
  const allMessageIds = new Set<string>()
  const allBookIds = new Set<string>()
  let totalReadingMinutes = 0
  
  dailyStats.forEach(day => {
    day.messageIds.forEach(msgId => allMessageIds.add(msgId))
    day.booksRead.forEach(bookId => allBookIds.add(bookId))
    totalReadingMinutes += day.readingTimeMinutes
  })
  
  // Calculate week and month stats
  const weekStart = getStartOfWeek()
  const monthStart = getStartOfMonth()
  
  let thisWeekMessageIds = new Set<string>()
  let thisMonthMessageIds = new Set<string>()
  
  dailyStats.forEach(day => {
    if (day.date >= weekStart) {
      day.messageIds.forEach(msgId => thisWeekMessageIds.add(msgId))
    }
    if (day.date >= monthStart) {
      day.messageIds.forEach(msgId => thisMonthMessageIds.add(msgId))
    }
  })
  
  const thisWeekMessages = thisWeekMessageIds.size
  const thisMonthMessages = thisMonthMessageIds.size
  
  // Calculate streaks
  const { current: currentStreak, longest: longestStreak } = calculateStreak(dailyStats)
  
  // Update stats object
  stats.totalMessages = allMessageIds.size
  stats.totalBooks = allBookIds.size
  stats.totalReadingTimeMinutes = Math.round(totalReadingMinutes)
  stats.currentStreak = currentStreak
  stats.longestStreak = longestStreak
  stats.lastReadDate = today
  stats.thisWeekMessages = thisWeekMessages
  stats.thisMonthMessages = thisMonthMessages
  stats.dailyStats = dailyStats.slice(-30) // Keep last 30 days
  
  // Save and return
  saveStats(stats)
  
  // Update goals progress (message count only, time is tracked separately)
  updateGoalsProgressForMessage(readingTimeSeconds)
  
  return stats
}

// Track reading time (call periodically while reading)
export function trackReadingTime(bookId: string, seconds: number): void {
  if (typeof window === 'undefined') return
  
  const today = getToday()
  const dailyStats = loadDailyStats()
  
  let todayStats = dailyStats.find(d => d.date === today)
  
  if (!todayStats) {
    todayStats = {
      date: today,
      messagesRead: 0,
      readingTimeMinutes: 0,
      booksRead: [],
      messageIds: [],
    }
    dailyStats.push(todayStats)
  }
  
  // Add reading time
  todayStats.readingTimeMinutes += Math.round(seconds / 60 * 10) / 10
  
  if (!todayStats.booksRead.includes(bookId)) {
    todayStats.booksRead.push(bookId)
  }
  
  saveDailyStats(dailyStats)
  
  // Update total reading time in stats
  const stats = loadStats()
  stats.totalReadingTimeMinutes += Math.round(seconds / 60)
  saveStats(stats)
  
  // Update goals for time-based goals (uses single load-modify-save pattern)
  updateTimeGoalsInternal(loadGoals(), seconds, true)
}

// Load goals
export function loadGoals(): ReadingGoal[] {
  if (typeof window === 'undefined') return []

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GOALS)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading reading goals:', error)
  }

  return []
}

// Save goals
export function saveGoals(goals: ReadingGoal[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals))
  } catch (error) {
    console.error('Error saving reading goals:', error)
  }
}

// Add a new goal
export function addGoal(
  type: 'daily' | 'weekly' | 'monthly',
  target: number,
  unit: 'messages' | 'minutes'
): ReadingGoal[] {
  const goals = loadGoals()
  
  const newGoal: ReadingGoal = {
    id: Date.now().toString(),
    type,
    target,
    unit,
    progress: 0,
    createdAt: new Date().toISOString(),
    periodStart: getPeriodStart(type),
  }
  
  goals.push(newGoal)
  saveGoals(goals)
  
  return goals
}

// Update goals progress when a message is read (message count goals only)
// Fixed: Uses single load-modify-save pattern to avoid race conditions
function updateGoalsProgressForMessage(readingTimeSeconds: number): void {
  const goals = loadGoals()
  
  let updated = false
  
  goals.forEach(goal => {
    // Check if we need to reset the period
    const periodStart = getPeriodStart(goal.type)
    if (goal.periodStart !== periodStart) {
      goal.progress = 0
      goal.periodStart = periodStart
      updated = true
    }
    
    // Update progress for message-based goals only
    if (goal.unit === 'messages') {
      goal.progress += 1
      updated = true
    }
    
    // Update progress for time-based goals
    if (goal.unit === 'minutes') {
      goal.progress += readingTimeSeconds / 60
      updated = true
    }
  })
  
  if (updated) {
    saveGoals(goals)
  }
}

// Update time-based goals internally (modifies goals array in place)
// Fixed: This function now modifies goals in place and optionally saves
// to avoid race conditions with multiple load/save operations
function updateTimeGoalsInternal(goals: ReadingGoal[], seconds: number, shouldSave: boolean): void {
  let updated = false
  
  goals.forEach(goal => {
    // Check if we need to reset the period
    const periodStart = getPeriodStart(goal.type)
    if (goal.periodStart !== periodStart) {
      goal.progress = 0
      goal.periodStart = periodStart
      updated = true
    }
    
    // Update progress for time-based goals
    if (goal.unit === 'minutes') {
      goal.progress += seconds / 60
      updated = true
    }
  })
  
  if (updated && shouldSave) {
    saveGoals(goals)
  }
}

// Delete a goal
export function deleteGoal(goalId: string): ReadingGoal[] {
  const goals = loadGoals()
  const updated = goals.filter(g => g.id !== goalId)
  saveGoals(updated)
  return updated
}

// Get progress for a specific goal
// IMPORTANT: This is the source of truth for goal progress display.
// The goal.progress field is updated incrementally for quick reference but may
// diverge from actual progress due to timing issues. Always use this function
// for displaying goal progress to users.
export function getGoalProgress(goal: ReadingGoal): number {
  const dailyStats = loadDailyStats()
  const periodStart = getPeriodStart(goal.type)
  
  let progress = 0
  
  dailyStats
    .filter(day => day.date >= periodStart)
    .forEach(day => {
      if (goal.unit === 'messages') {
        progress += day.messagesRead
      } else {
        progress += day.readingTimeMinutes
      }
    })
  
  return Math.round(progress * 10) / 10
}

// Check and reset goal periods if they have expired
// Call this when loading goals for display to ensure periods are reset
// even if the user hasn't read for a while
export function checkAndResetGoalPeriods(): ReadingGoal[] {
  const goals = loadGoals();
  let updated = false;
  
  goals.forEach(goal => {
    const currentPeriodStart = getPeriodStart(goal.type);
    if (goal.periodStart !== currentPeriodStart) {
      goal.progress = 0;
      goal.periodStart = currentPeriodStart;
      updated = true;
    }
  });
  
  if (updated) {
    saveGoals(goals);
  }
  return goals;
}

// Refresh all goals progress
// Uses getGoalProgress() as source of truth
export function refreshGoalsProgress(): ReadingGoal[] {
  const goals = loadGoals()
  
  goals.forEach(goal => {
    // Use getGoalProgress() as source of truth
    goal.progress = getGoalProgress(goal)
    goal.periodStart = getPeriodStart(goal.type)
  })
  
  saveGoals(goals)
  return goals
}

// ===== Manual "Mark as Done" Functions =====

export interface DoneMessage {
  messageKey: string // `${bookId}-${messageId}`
  markedAt: string // ISO timestamp
}

// Load done messages from localStorage
export function loadDoneMessages(): DoneMessage[] {
  if (typeof window === 'undefined') return []

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DONE_MESSAGES)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading done messages:', error)
  }

  return []
}

// Save done messages to localStorage
function saveDoneMessages(doneMessages: DoneMessage[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.DONE_MESSAGES, JSON.stringify(doneMessages))
  } catch (error) {
    console.error('Error saving done messages:', error)
  }
}

// Check if a message is marked as done
export function isMessageDone(bookId: string, messageId: string): boolean {
  const doneMessages = loadDoneMessages()
  const messageKey = `${bookId}-${messageId}`
  return doneMessages.some(dm => dm.messageKey === messageKey)
}

// Toggle message done status (mark as done or unmark)
export function toggleMessageDone(bookId: string, messageId: string): boolean {
  const doneMessages = loadDoneMessages()
  const messageKey = `${bookId}-${messageId}`
  
  const existingIndex = doneMessages.findIndex(dm => dm.messageKey === messageKey)
  
  if (existingIndex >= 0) {
    // Unmark as done
    doneMessages.splice(existingIndex, 1)
    saveDoneMessages(doneMessages)
    return false
  } else {
    // Mark as done
    doneMessages.push({
      messageKey,
      markedAt: new Date().toISOString(),
    })
    saveDoneMessages(doneMessages)
    
    // Track the message as read for stats (with 0 time since it's manual marking)
    trackMessageRead(bookId, messageId, 0)
    
    return true
  }
}

// Get count of done messages for a specific book
export function getDoneCountForBook(bookId: string): number {
  const doneMessages = loadDoneMessages()
  return doneMessages.filter(dm => dm.messageKey.startsWith(`${bookId}-`)).length
}

// Get total count of done messages
export function getTotalDoneCount(): number {
  const doneMessages = loadDoneMessages()
  return doneMessages.length
}

// Get done message keys for a specific book
export function getDoneMessageKeysForBook(bookId: string): string[] {
  const doneMessages = loadDoneMessages()
  return doneMessages
    .filter(dm => dm.messageKey.startsWith(`${bookId}-`))
    .map(dm => dm.messageKey)
}

// Export utility functions for use in other modules
export { getLocalDateString, getYesterdayLocal, getPeriodStart as getPeriodStartLocal }