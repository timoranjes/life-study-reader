import { NextRequest, NextResponse } from 'next/server'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

export const runtime = 'nodejs' // Use Node.js runtime for Azure Speech SDK
export const maxDuration = 30 // Allow up to 30 seconds for TTS generation

// Maximum text length to prevent timeouts
const MAX_TEXT_LENGTH = 450

// Azure Speech Service configuration
const SPEECH_KEY = process.env.AZURE_SPEECH_KEY
const SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'eastus'

interface WordTiming {
  text: string
  start: number // Start time in seconds
  end: number // End time in seconds
}

interface TTSResponse {
  audio: string // Base64 encoded audio
  timing: WordTiming[] // Word boundary data for highlighting
  duration: number // Total duration in seconds
}

interface TTSError {
  error: string
  details?: string
  fallback?: boolean // Indicates client should use browser TTS
}

/**
 * Estimate word timing based on text content and total duration
 * Azure provides word boundary events, but for simplicity we estimate
 */
function estimateWordTiming(text: string, durationSeconds: number): WordTiming[] {
  const timing: WordTiming[] = []
  
  // Split text into words/characters
  // For Chinese: split by characters
  // For English: split by words
  const isChinese = /[\u4e00-\u9fff]/.test(text)
  
  let segments: string[]
  if (isChinese) {
    // For Chinese, split into phrases by punctuation or individual characters
    segments = text.split(/([，。！？、；：「」『』（）\s]+)/).filter(s => s.trim())
  } else {
    // For English, split by words
    segments = text.split(/(\s+)/).filter(s => s.trim())
  }
  
  // Calculate time per segment based on character count
  const totalChars = segments.reduce((sum, s) => sum + s.length, 0)
  const timePerChar = durationSeconds / totalChars
  
  let currentTime = 0
  for (const segment of segments) {
    const segmentDuration = segment.length * timePerChar
    timing.push({
      text: segment,
      start: currentTime,
      end: currentTime + segmentDuration,
    })
    currentTime += segmentDuration
  }
  
  return timing
}

/**
 * Estimate duration based on text length and rate
 */
function estimateDuration(text: string, rate: number): number {
  const isChinese = /[\u4e00-\u9fff]/.test(text)
  const charCount = text.length
  
  // Base rate: characters per second
  const baseCharsPerSecond = isChinese ? 3.3 : 15
  const adjustedCharsPerSecond = baseCharsPerSecond * rate
  const duration = charCount / adjustedCharsPerSecond
  
  return Math.max(0.5, duration + 0.2)
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '\x26amp;')
    .replace(/</g, '\x26lt;')
    .replace(/>/g, '\x26gt;')
    .replace(/"/g, '\x26quot;')
    .replace(/'/g, '\x26apos;')
}

export async function GET(request: NextRequest): Promise<NextResponse<TTSResponse | TTSError>> {
  const { searchParams } = request.nextUrl
  const text = searchParams.get('text')
  const voice = searchParams.get('voice') || 'en-US-AriaNeural'
  const rate = searchParams.get('rate') || '1.0'
  
  // Validate text parameter
  if (!text) {
    return NextResponse.json(
      { error: 'Text parameter required' },
      { status: 400 }
    )
  }
  
  // Validate text length
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { 
        error: 'Text too long', 
        details: `Maximum ${MAX_TEXT_LENGTH} characters allowed. Received ${text.length} characters.`
      },
      { status: 400 }
    )
  }
  
  // Check for Azure credentials
  if (!SPEECH_KEY) {
    console.error('Azure Speech key not configured')
    return NextResponse.json(
      { 
        error: 'Azure TTS not configured', 
        details: 'AZURE_SPEECH_KEY environment variable is not set.',
        fallback: true
      },
      { status: 503 }
    )
  }
  
  try {
    // Parse rate - convert from multiplier to percentage string
    const rateNum = parseFloat(rate)
    const ratePercent = Math.round((rateNum - 1) * 100)
    const rateString = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`
    
    // Create speech config
    const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION)
    speechConfig.speechSynthesisVoiceName = voice
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
    
    // Create a pull stream for output
    const pullStream = sdk.AudioOutputStream.createPullStream()
    const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream)
    
    // Create synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)
    
    // Build SSML with rate
    const langCode = voice.split('-').slice(0, 2).join('-')
    const escapedText = escapeXml(text)
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${langCode}"><voice name="${voice}"><prosody rate="${rateString}">${escapedText}</prosody></voice></speak>`
    
    console.log('[Azure TTS] Synthesizing text:', text.substring(0, 50))
    
    // Synthesize speech
    const result = await new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          synthesizer.close()
          resolve(result)
        },
        (error) => {
          synthesizer.close()
          reject(error)
        }
      )
    })
    
    // Check result
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      const audioData = result.audioData
      const audioBase64 = arrayBufferToBase64(audioData)
      
      console.log('[Azure TTS] Audio generated, size:', audioBase64.length)
      
      // Estimate duration and timing
      const duration = estimateDuration(text, rateNum)
      const timing = estimateWordTiming(text, duration)
      
      const response: TTSResponse = {
        audio: audioBase64,
        timing,
        duration,
      }
      
      return NextResponse.json(response, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      })
    } else if (result.reason === sdk.ResultReason.Canceled) {
      const cancellation = sdk.SpeechSynthesisCancellationDetails.fromResult(result)
      console.error('Azure TTS cancelled:', cancellation.errorDetails)
      
      return NextResponse.json(
        { 
          error: 'TTS synthesis cancelled', 
          details: cancellation.errorDetails,
          fallback: true
        },
        { status: 500 }
      )
    } else {
      return NextResponse.json(
        { 
          error: 'TTS synthesis failed', 
          details: `Unknown result reason: ${result.reason}`,
          fallback: true
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Azure TTS error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'TTS generation failed', 
        details: errorMessage,
        fallback: true
      },
      { status: 500 }
    )
  }
}

// Handle POST requests
export async function POST(request: NextRequest): Promise<NextResponse<TTSResponse | TTSError>> {
  try {
    const body = await request.json()
    const { text, voice = 'en-US-AriaNeural', rate = '1.0' } = body
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text parameter required' },
        { status: 400 }
      )
    }
    
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { 
          error: 'Text too long', 
          details: `Maximum ${MAX_TEXT_LENGTH} characters allowed.`
        },
        { status: 400 }
      )
    }
    
    // Construct URL and call GET handler
    const url = new URL(request.url)
    url.searchParams.set('text', text)
    url.searchParams.set('voice', voice)
    url.searchParams.set('rate', rate)
    
    const newRequest = new NextRequest(url, { method: 'GET' })
    return GET(newRequest)
    
  } catch (error) {
    console.error('Azure TTS POST error:', error)
    
    return NextResponse.json(
      { 
        error: 'Invalid request body', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    )
  }
}