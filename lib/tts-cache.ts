// TTS Audio Caching Utility
// Uses IndexedDB to cache audio data and timing information

const DB_NAME = 'life-study-tts-cache'
const STORE_NAME = 'audio-cache'
const MAX_CACHE_SIZE = 100 * 1024 * 1024 // 100MB max cache

export interface WordTiming {
  text: string
  start: number
  end: number
}

export interface TTSCacheEntry {
  hash: string
  audioBase64: string      // Base64 encoded MP3
  timing: WordTiming[]     // Word boundary timing data
  duration: number         // Total duration in seconds
  text: string            // Original text (for debugging)
  voice: string           // Voice ID used
  rate: number            // Playback rate
  timestamp: number       // When cached
  size: number            // Size in bytes
}

/**
 * Generate a hash key from text, voice, and rate
 * Uses SHA-256 for consistent hashing
 */
export async function generateCacheKey(
  text: string,
  voice: string,
  rate: number
): Promise<string> {
  const data = `${text}:${voice}:${rate.toFixed(2)}`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Initialize IndexedDB
 * Returns a promise that resolves to the database instance
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'hash' })
      }
    }
  })
}

/**
 * Get cached TTS data
 * @param hash - The cache key hash
 * @returns The cached entry or null if not found
 */
export async function getCachedTTS(hash: string): Promise<TTSCacheEntry | null> {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(hash)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  } catch (error) {
    console.warn('TTS cache read error:', error)
    return null
  }
}

/**
 * Cache TTS data
 * @param hash - The cache key hash
 * @param audioBase64 - Base64 encoded audio data
 * @param timing - Word timing array
 * @param duration - Total duration
 * @param text - Original text (for debugging)
 * @param voice - Voice ID used
 * @param rate - Playback rate
 */
export async function setCachedTTS(
  hash: string,
  audioBase64: string,
  timing: WordTiming[],
  duration: number,
  text: string,
  voice: string,
  rate: number
): Promise<void> {
  try {
    const db = await initDB()
    const entry: TTSCacheEntry = {
      hash,
      audioBase64,
      timing,
      duration,
      text,
      voice,
      rate,
      timestamp: Date.now(),
      size: audioBase64.length,
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(entry)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        // Prune cache if needed after adding new entry
        pruneCache().catch(err => console.warn('Cache prune error:', err))
        resolve()
      }
    })
  } catch (error) {
    console.warn('TTS cache write error:', error)
    // Silently fail - caching is not critical
  }
}

/**
 * Check if a cached entry exists for the given parameters
 */
export async function hasCachedTTS(
  text: string,
  voice: string,
  rate: number
): Promise<boolean> {
  const hash = await generateCacheKey(text, voice, rate)
  const entry = await getCachedTTS(hash)
  return entry !== null
}

/**
 * Get cached entry by text, voice, and rate
 */
export async function getCachedTTSByParams(
  text: string,
  voice: string,
  rate: number
): Promise<TTSCacheEntry | null> {
  const hash = await generateCacheKey(text, voice, rate)
  return getCachedTTS(hash)
}

/**
 * Clear all cached TTS data
 */
export async function clearTTSCache(): Promise<void> {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.warn('TTS cache clear error:', error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entries: number
  totalSize: number
  oldestEntry: number | null
  newestEntry: number | null
}> {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const entries = request.result as TTSCacheEntry[]
        const totalSize = entries.reduce((sum, e) => sum + e.size, 0)
        const timestamps = entries.map(e => e.timestamp)
        
        resolve({
          entries: entries.length,
          totalSize,
          oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
          newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
        })
      }
    })
  } catch (error) {
    console.warn('TTS cache stats error:', error)
    return { entries: 0, totalSize: 0, oldestEntry: null, newestEntry: null }
  }
}

/**
 * Prune cache to stay under size limit
 * Removes oldest entries first
 */
async function pruneCache(): Promise<void> {
  try {
    const stats = await getCacheStats()
    
    if (stats.totalSize <= MAX_CACHE_SIZE * 0.8) {
      // Under 80% of limit, no need to prune
      return
    }
    
    const db = await initDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const getAllRequest = store.getAll()
    
    return new Promise((resolve, reject) => {
      getAllRequest.onerror = () => reject(getAllRequest.error)
      getAllRequest.onsuccess = () => {
        const entries = getAllRequest.result as TTSCacheEntry[]
        
        // Sort by timestamp (oldest first)
        entries.sort((a, b) => a.timestamp - b.timestamp)
        
        const deleteTransaction = db.transaction(STORE_NAME, 'readwrite')
        const deleteStore = deleteTransaction.objectStore(STORE_NAME)
        
        let currentSize = stats.totalSize
        let deleted = 0
        
        for (const entry of entries) {
          if (currentSize <= MAX_CACHE_SIZE * 0.6) {
            // Down to 60% of limit, stop pruning
            break
          }
          deleteStore.delete(entry.hash)
          currentSize -= entry.size
          deleted++
        }
        
        if (deleted > 0) {
          console.log(`[TTS Cache] Pruned ${deleted} entries, freed ${stats.totalSize - currentSize} bytes`)
        }
        
        resolve()
      }
    })
  } catch (error) {
    console.warn('TTS cache prune error:', error)
  }
}

/**
 * Convert base64 audio to Blob for playback
 */
export function base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

/**
 * Create an object URL from base64 audio
 * Remember to revoke the URL when done
 */
export function createAudioUrl(base64: string): string {
  const blob = base64ToBlob(base64)
  return URL.createObjectURL(blob)
}

/**
 * Revoke an audio URL to free memory
 */
export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url)
}