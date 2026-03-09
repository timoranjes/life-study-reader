// Audio Queue Manager for TTS Chunking
// Manages sequential playback of audio chunks with prefetching

import type { WordTiming } from './tts-cache'

export interface AudioChunk {
  id: string
  text: string
  audioBase64: string
  timing: WordTiming[]
  duration: number
  audioUrl?: string // Blob URL after conversion
}

export interface AudioQueueState {
  chunks: AudioChunk[]
  currentIndex: number
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
}

type WordCallback = (word: string, timing: WordTiming, chunkIndex: number) => void
type ChunkEndCallback = (chunkIndex: number) => void
type QueueEndCallback = () => void
type TimeUpdateCallback = (currentTime: number, duration: number) => void
type ErrorCallback = (error: Error, chunkIndex: number) => void

/**
 * AudioQueueManager
 * 
 * Manages sequential playback of audio chunks with:
 * - Prefetching support
 * - Word timing callbacks for highlighting
 * - Seamless chunk transitions
 */
export class AudioQueueManager {
  private queue: AudioChunk[] = []
  private currentIndex = 0
  private audioElement: HTMLAudioElement | null = null
  private isPlaying = false
  private isLoading = false
  
  // Callbacks
  private onWordCallback?: WordCallback
  private onChunkEndCallback?: ChunkEndCallback
  private onQueueEndCallback?: QueueEndCallback
  private onTimeUpdateCallback?: TimeUpdateCallback
  private onErrorCallback?: ErrorCallback
  
  // Timing tracking
  private currentWordIndex = 0
  private lastTimeUpdate = 0
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio()
      // iOS background audio support - playsinline attributes
      this.audioElement.setAttribute('playsinline', 'true')
      this.audioElement.setAttribute('webkit-playsinline', 'true')
      this.setupAudioListeners()
    }
  }
  
  /**
   * Set up audio element event listeners
   */
  private setupAudioListeners(): void {
    if (!this.audioElement) return
    
    this.audioElement.addEventListener('ended', () => {
      this.handleChunkEnd()
    })
    
    this.audioElement.addEventListener('timeupdate', () => {
      this.handleTimeUpdate()
    })
    
    this.audioElement.addEventListener('error', (e) => {
      this.handleError(e)
    })
    
    this.audioElement.addEventListener('canplaythrough', () => {
      this.isLoading = false
    })
  }
  
  /**
   * Add a chunk to the queue
   */
  addChunk(chunk: AudioChunk): void {
    this.queue.push(chunk)
  }
  
  /**
   * Add multiple chunks to the queue
   */
  addChunks(chunks: AudioChunk[]): void {
    this.queue.push(...chunks)
  }
  
  /**
   * Clear the queue and reset state
   */
  clearQueue(): void {
    // Revoke all blob URLs
    this.queue.forEach(chunk => {
      if (chunk.audioUrl) {
        URL.revokeObjectURL(chunk.audioUrl)
      }
    })
    
    this.queue = []
    this.currentIndex = 0
    this.currentWordIndex = 0
    this.isPlaying = false
    this.isLoading = false
    
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
    }
  }
  
  /**
   * Start playback from beginning or current position
   */
  async play(): Promise<void> {
    if (this.queue.length === 0) {
      console.warn('[AudioQueue] No chunks to play')
      return
    }
    
    this.isPlaying = true
    await this.playChunk(this.currentIndex)
  }
  
  /**
   * Pause playback
   */
  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause()
      this.isPlaying = false
      // Update Media Session playback state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused'
      }
    }
  }
  
  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.audioElement && this.queue.length > 0) {
      await this.audioElement.play()
      this.isPlaying = true
      // Update Media Session playback state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing'
      }
    }
  }
  
  /**
   * Stop playback and reset to beginning
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.currentTime = 0
    }
    this.isPlaying = false
    this.currentIndex = 0
    this.currentWordIndex = 0
  }
  
  /**
   * Skip to a specific chunk
   */
  async skipToChunk(index: number): Promise<void> {
    if (index < 0 || index >= this.queue.length) {
      console.warn('[AudioQueue] Invalid chunk index:', index)
      return
    }
    
    this.currentIndex = index
    this.currentWordIndex = 0
    
    if (this.isPlaying) {
      await this.playChunk(index)
    }
  }
  
  /**
   * Skip to next chunk
   */
  async nextChunk(): Promise<void> {
    if (this.currentIndex < this.queue.length - 1) {
      await this.skipToChunk(this.currentIndex + 1)
    }
  }
  
  /**
   * Skip to previous chunk
   */
  async prevChunk(): Promise<void> {
    if (this.currentIndex > 0) {
      await this.skipToChunk(this.currentIndex - 1)
    }
  }
  
  /**
   * Play a specific chunk
   */
  private async playChunk(index: number): Promise<void> {
    const chunk = this.queue[index]
    if (!chunk) {
      this.onQueueEndCallback?.()
      return
    }
    
    this.isLoading = true
    this.currentWordIndex = 0
    
    // Create blob URL if not exists
    if (!chunk.audioUrl) {
      const blob = this.base64ToBlob(chunk.audioBase64)
      chunk.audioUrl = URL.createObjectURL(blob)
    }
    
    if (this.audioElement) {
      this.audioElement.src = chunk.audioUrl
      try {
        await this.audioElement.play()
        this.isPlaying = true
        this.isLoading = false
        // Update Media Session playback state
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing'
        }
      } catch (error) {
        console.error('[AudioQueue] Play error:', error)
        this.handleError(error as Event)
      }
    }
  }
  
  /**
   * Handle time update for word highlighting
   */
  private handleTimeUpdate(): void {
    if (!this.audioElement || !this.isPlaying) return
    
    const currentTime = this.audioElement.currentTime
    const chunk = this.queue[this.currentIndex]
    
    if (!chunk) return
    
    // Throttle time updates to ~60fps
    if (currentTime - this.lastTimeUpdate < 0.016) return
    this.lastTimeUpdate = currentTime
    
    // Notify time update
    this.onTimeUpdateCallback?.(currentTime, chunk.duration)
    
    // Find current word based on timing
    const timing = chunk.timing
    if (!timing || timing.length === 0) return
    
    // Optimize: start search from last word index
    for (let i = this.currentWordIndex; i < timing.length; i++) {
      const t = timing[i]
      if (currentTime >= t.start && currentTime < t.end) {
        if (i !== this.currentWordIndex) {
          this.currentWordIndex = i
          this.onWordCallback?.(t.text, t, this.currentIndex)
        }
        break
      }
    }
  }
  
  /**
   * Handle chunk end
   */
  private handleChunkEnd(): void {
    this.onChunkEndCallback?.(this.currentIndex)
    
    this.currentIndex++
    
    if (this.currentIndex < this.queue.length) {
      // Play next chunk
      this.playChunk(this.currentIndex)
    } else {
      // End of queue
      this.isPlaying = false
      this.onQueueEndCallback?.()
    }
  }
  
  /**
   * Handle errors
   */
  private handleError(event: Event | Error): void {
    const error = event instanceof Error ? event : new Error('Audio playback error')
    console.error('[AudioQueue] Error:', error)
    this.onErrorCallback?.(error, this.currentIndex)
  }
  
  /**
   * Convert base64 to Blob
   */
  private base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new Blob([bytes], { type: mimeType })
  }
  
  // ============ Setters for callbacks ============
  
  onWord(callback: WordCallback): void {
    this.onWordCallback = callback
  }
  
  onChunkEnd(callback: ChunkEndCallback): void {
    this.onChunkEndCallback = callback
  }
  
  onQueueEnd(callback: QueueEndCallback): void {
    this.onQueueEndCallback = callback
  }
  
  onTimeUpdate(callback: TimeUpdateCallback): void {
    this.onTimeUpdateCallback = callback
  }
  
  onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback
  }
  
  // ============ Media Session API ============
  
  /**
   * Update Media Session metadata for lock screen controls
   */
  updateMediaSession(metadata: { title: string; artist?: string; album?: string; artwork?: MediaImage[] }): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.artist || 'Life-Study Reader',
        album: metadata.album,
        artwork: metadata.artwork
      })
    }
  }
  
  /**
   * Set up Media Session action handlers for lock screen controls
   */
  setupMediaSessionHandlers(handlers: {
    onPlay: () => void
    onPause: () => void
    onPreviousTrack?: () => void
    onNextTrack?: () => void
    onSeekBackward?: () => void
    onSeekForward?: () => void
  }): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', handlers.onPlay)
      navigator.mediaSession.setActionHandler('pause', handlers.onPause)
      if (handlers.onPreviousTrack) {
        navigator.mediaSession.setActionHandler('previoustrack', handlers.onPreviousTrack)
      }
      if (handlers.onNextTrack) {
        navigator.mediaSession.setActionHandler('nexttrack', handlers.onNextTrack)
      }
      if (handlers.onSeekBackward) {
        navigator.mediaSession.setActionHandler('seekbackward', handlers.onSeekBackward)
      }
      if (handlers.onSeekForward) {
        navigator.mediaSession.setActionHandler('seekforward', handlers.onSeekForward)
      }
    }
  }
  
  /**
   * Clear Media Session metadata and handlers
   */
  clearMediaSession(): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
      try {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.setActionHandler('seekbackward', null)
        navigator.mediaSession.setActionHandler('seekforward', null)
      } catch (e) {
        // Ignore errors when clearing handlers
      }
    }
  }
  
  // ============ Getters ============
  
  getCurrentIndex(): number {
    return this.currentIndex
  }
  
  getIsPlaying(): boolean {
    return this.isPlaying
  }
  
  getIsLoading(): boolean {
    return this.isLoading
  }
  
  getQueueLength(): number {
    return this.queue.length
  }
  
  getCurrentChunk(): AudioChunk | null {
    return this.queue[this.currentIndex] || null
  }
  
  getState(): AudioQueueState {
    const currentChunk = this.getCurrentChunk()
    return {
      chunks: this.queue,
      currentIndex: this.currentIndex,
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTime: this.audioElement?.currentTime || 0,
      duration: currentChunk?.duration || 0,
    }
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop()
    this.clearQueue()
    
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
      this.audioElement = null
    }
  }
}

/**
 * Create a new AudioQueueManager instance
 */
export function createAudioQueue(): AudioQueueManager {
  return new AudioQueueManager()
}