"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import type { Language } from "@/lib/reading-data"
import type { TTSSettings, WordTiming, AudioChunk } from "@/lib/tts-types"
import { getDefaultVoiceForLanguage } from "@/lib/edge-tts-voices"
import { 
  generateCacheKey, 
  getCachedTTSByParams, 
  setCachedTTS, 
  type TTSCacheEntry 
} from "@/lib/tts-cache"
import { AudioQueueManager, createAudioQueue } from "@/lib/audio-queue"
import { preprocessTextForTTS } from "@/lib/tts-preprocessor"

// Maximum chunk size for Edge TTS API (characters)
const MAX_CHUNK_SIZE = 400

interface UseEdgeTTSOptions {
  language: Language
  paragraphs: string[]
  settings: TTSSettings
  metadata?: {
    title: string
    bookName?: string
    chapterNumber?: number
  }
  onPositionChange?: (paragraphIndex: number, wordIndex: number, word: string) => void
  onChunkEnd?: (chunkIndex: number) => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

interface UseEdgeTTSReturn {
  isPlaying: boolean
  isLoading: boolean
  currentChunk: number
  totalChunks: number
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  nextChunk: () => Promise<void>
  prevChunk: () => Promise<void>
  isAvailable: boolean
  fallbackMode: boolean
}

/**
 * Hook for Edge TTS functionality with chunking and caching
 */
export function useEdgeTTS({
  language,
  paragraphs,
  settings,
  metadata,
  onPositionChange,
  onChunkEnd,
  onEnd,
  onError,
}: UseEdgeTTSOptions): UseEdgeTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [isAvailable, setIsAvailable] = useState(true)
  const [fallbackMode, setFallbackMode] = useState(false)
  
  const audioQueueRef = useRef<AudioQueueManager | null>(null)
  const chunksRef = useRef<string[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Initialize audio queue on mount
  useEffect(() => {
    audioQueueRef.current = createAudioQueue()
    
    // Set up callbacks
    audioQueueRef.current.onWord((word, timing, chunkIndex) => {
      onPositionChange?.(chunkIndex, 0, word)
    })
    
    audioQueueRef.current.onChunkEnd((chunkIndex) => {
      setCurrentChunk(chunkIndex + 1)
      onChunkEnd?.(chunkIndex)
    })
    
    audioQueueRef.current.onQueueEnd(() => {
      setIsPlaying(false)
      setCurrentChunk(0)
      // Clear Media Session when playback ends
      audioQueueRef.current?.clearMediaSession()
      onEnd?.()
    })
    
    audioQueueRef.current.onError((error, chunkIndex) => {
      console.error('[Edge TTS] Audio error:', error)
      onError?.(error)
    })
    
    return () => {
      audioQueueRef.current?.clearMediaSession()
      audioQueueRef.current?.destroy()
    }
  }, [])
  
  // Chunk text into manageable pieces
  const chunkText = useCallback((text: string): string[] => {
    if (text.length <= MAX_CHUNK_SIZE) {
      return [text]
    }
    
    const chunks: string[] = []
    const sentences = text.split(/([。！？.!?]+)/)
    let currentChunk = ''
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      if (currentChunk.length + sentence.length > MAX_CHUNK_SIZE) {
        if (currentChunk) {
          chunks.push(currentChunk)
          currentChunk = ''
        }
        // If single sentence is too long, split by characters
        if (sentence.length > MAX_CHUNK_SIZE) {
          for (let j = 0; j < sentence.length; j += MAX_CHUNK_SIZE) {
            chunks.push(sentence.slice(j, j + MAX_CHUNK_SIZE))
          }
        } else {
          currentChunk = sentence
        }
      } else {
        currentChunk += sentence
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk)
    }
    
    return chunks
  }, [])
  
  // Fetch a single chunk from API or cache
  const fetchChunk = useCallback(async (
    text: string,
    voice: string,
    rate: number,
    chunkId: string,
    signal: AbortSignal
  ): Promise<AudioChunk | null> => {
    try {
      // Check cache first
      const cached = await getCachedTTSByParams(text, voice, rate)
      if (cached) {
        return {
          id: chunkId,
          text,
          audioBase64: cached.audioBase64,
          timing: cached.timing,
          duration: cached.duration,
        }
      }
      
      // Fetch from API
      const response = await fetch(
        `/api/tts/?text=${encodeURIComponent(text)}&voice=${voice}&rate=${rate}`,
        { signal }
      )
      
      if (!response.ok) {
        const data = await response.json()
        
        // Check if we should fallback
        if (data.fallback) {
          setFallbackMode(true)
          setIsAvailable(false)
          toast.error('Edge TTS unavailable', {
            description: 'Falling back to system voice',
          })
          return null
        }
        
        throw new Error(data.error || 'TTS API error')
      }
      
      const data = await response.json()
      
      // Cache the result
      await setCachedTTS(
        await generateCacheKey(text, voice, rate),
        data.audio,
        data.timing,
        data.duration,
        text,
        voice,
        rate
      )
      
      return {
        id: chunkId,
        text,
        audioBase64: data.audio,
        timing: data.timing,
        duration: data.duration,
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null
      }
      console.error('[Edge TTS] Fetch error:', error)
      throw error
    }
  }, [])
  
  // Play with Edge TTS
  const play = useCallback(async () => {
    if (!audioQueueRef.current) return
    
    // Get voice - use specific voice ID if set, otherwise use gender preference
    const voice = settings.edgeVoiceId || getDefaultVoiceForLanguage(language, settings.edgeVoiceGender)
    
    // Preprocess and chunk paragraphs
    const processedParagraphs = paragraphs.map(p => 
      preprocessTextForTTS(p, {
        expandBibleReferences: settings.expandBibleReferences,
        handlePolyphonicCharacters: settings.normalizePolyphonicChars,
        removeStructuralMarkers: settings.removeStructuralMarkers,
        naturalPauses: settings.naturalPauses,
        pauseMultiplier: settings.pauseMultiplier,
        emphasizeCapitalized: settings.emphasizeCapitalized,
      })
    )
    
    // Combine all paragraphs and chunk
    const fullText = processedParagraphs.join('\n')
    const chunks = chunkText(fullText)
    chunksRef.current = chunks
    setTotalChunks(chunks.length)
    
    if (chunks.length === 0) return
    
    // Cancel any previous requests
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    setIsLoading(true)
    audioQueueRef.current.clearQueue()
    
    try {
      // Fetch first chunk to start immediately
      const firstChunk = await fetchChunk(
        chunks[0],
        voice,
        settings.rate,
        '0',
        signal
      )
      
      if (!firstChunk) {
        // Fallback mode triggered
        setIsLoading(false)
        return
      }
      
      audioQueueRef.current.addChunk(firstChunk)
      
      // Set up Media Session for iOS background playback
      if (metadata) {
        audioQueueRef.current.updateMediaSession({
          title: metadata.title,
          artist: metadata.bookName,
          album: metadata.chapterNumber ? `Chapter ${metadata.chapterNumber}` : undefined
        })
        
        // Set up Media Session handlers for lock screen controls
        audioQueueRef.current.setupMediaSessionHandlers({
          onPlay: async () => {
            await audioQueueRef.current?.resume()
            setIsPlaying(true)
          },
          onPause: () => {
            audioQueueRef.current?.pause()
            setIsPlaying(false)
          },
          onNextTrack: async () => {
            await audioQueueRef.current?.nextChunk()
          },
          onPreviousTrack: async () => {
            await audioQueueRef.current?.prevChunk()
          }
        })
      }
      
      // Start playback
      await audioQueueRef.current.play()
      setIsLoading(false)
      setIsPlaying(true)
      setCurrentChunk(0)
      
      // Prefetch remaining chunks in background
      const prefetchPromises = chunks.slice(1).map((text, index) =>
        fetchChunk(text, voice, settings.rate, String(index + 1), signal)
          .then(chunk => {
            if (chunk) {
              audioQueueRef.current?.addChunk(chunk)
            }
          })
          .catch(err => {
            if (err.name !== 'AbortError') {
              console.error('[Edge TTS] Prefetch error:', err)
            }
          })
      )
      
      // Don't await prefetch - let it happen in background
      Promise.all(prefetchPromises).catch(console.error)
      
    } catch (error) {
      console.error('[Edge TTS] Play error:', error)
      setIsLoading(false)
      setIsPlaying(false)
      
      toast.error('Edge TTS error', {
        description: (error as Error).message,
      })
      
      onError?.(error as Error)
    }
  }, [language, paragraphs, settings, chunkText, fetchChunk, onError])
  
  // Pause playback
  const pause = useCallback(() => {
    audioQueueRef.current?.pause()
    setIsPlaying(false)
  }, [])
  
  // Stop playback
  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    audioQueueRef.current?.stop()
    setIsPlaying(false)
    setIsLoading(false)
    setCurrentChunk(0)
  }, [])
  
  // Next chunk
  const nextChunk = useCallback(async () => {
    await audioQueueRef.current?.nextChunk()
  }, [])
  
  // Previous chunk
  const prevChunk = useCallback(async () => {
    await audioQueueRef.current?.prevChunk()
  }, [])
  
  return {
    isPlaying,
    isLoading,
    currentChunk,
    totalChunks,
    play,
    pause,
    stop,
    nextChunk,
    prevChunk,
    isAvailable,
    fallbackMode,
  }
}

export default useEdgeTTS