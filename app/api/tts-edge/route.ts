import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 30

// Maximum text length to prevent timeouts
const MAX_TEXT_LENGTH = 500

interface TTSResponse {
  audio: string
  timing: Array<{ text: string; start: number; end: number }>
  duration: number
}

interface TTSError {
  error: string
  details?: string
  fallback?: boolean
}

// Available voices for Edge TTS
const VOICE_MAP: Record<string, string> = {
  'en-US-AriaNeural': 'en-US-AriaNeural',
  'en-US-GuyNeural': 'en-US-GuyNeural',
  'en-GB-SoniaNeural': 'en-GB-SoniaNeural',
  'zh-CN-XiaoxiaoNeural': 'zh-CN-XiaoxiaoNeural',
  'zh-CN-YunxiNeural': 'zh-CN-YunxiNeural',
  'zh-HK-HiuGaNeural': 'zh-HK-HiuGaNeural',
  'zh-TW-HsiaoChenNeural': 'zh-TW-HsiaoChenNeural',
}

/**
 * Estimate word timing based on text content and total duration
 */
function estimateWordTiming(text: string, durationSeconds: number): Array<{ text: string; start: number; end: number }> {
  const timing: Array<{ text: string; start: number; end: number }> = []
  
  const isChinese = /[\u4e00-\u9fff]/.test(text)
  
  let segments: string[]
  if (isChinese) {
    segments = text.split(/([，。！？、；：「」『』（）\s]+)/).filter(s => s.trim())
  } else {
    segments = text.split(/(\s+)/).filter(s => s.trim())
  }
  
  const totalChars = segments.reduce((sum, s) => sum + s.length, 0)
  if (totalChars === 0) return timing
  
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
 * Generate TTS using Azure Cognitive Services REST API
 * This works in edge runtime since it uses fetch instead of the SDK
 */
async function generateAzureTTS(
  text: string,
  voice: string,
  rate: number,
  speechKey: string,
  region: string
): Promise<ArrayBuffer> {
  // Convert rate from multiplier to percentage string
  const ratePercent = Math.round((rate - 1) * 100)
  const rateString = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`
  
  // Build SSML
  const langCode = voice.split('-').slice(0, 2).join('-')
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
  
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${langCode}"><voice name="${voice}"><prosody rate="${rateString}">${escapedText}</prosody></voice></speak>`
  
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
      'User-Agent': 'LifeStudyReader/1.0',
    },
    body: ssml,
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Azure TTS failed: ${response.status} - ${errorText}`)
  }
  
  return response.arrayBuffer()
}

export async function GET(request: NextRequest): Promise<NextResponse<TTSResponse | TTSError>> {
  const { searchParams } = request.nextUrl
  const text = searchParams.get('text')
  const voice = searchParams.get('voice') || 'en-US-AriaNeural'
  const rate = searchParams.get('rate') || '1.0'
  
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
  
  // Get Azure credentials from environment
  const speechKey = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION || 'eastasia'
  
  if (!speechKey) {
    return NextResponse.json(
      { 
        error: 'TTS not configured', 
        details: 'Speech service not available',
        fallback: true
      },
      { status: 503 }
    )
  }
  
  try {
    const rateNum = parseFloat(rate)
    
    // Use Azure REST API (works in edge runtime)
    const audioBuffer = await generateAzureTTS(text, voice, rateNum, speechKey, region)
    const audioBase64 = arrayBufferToBase64(audioBuffer)
    
    const duration = estimateDuration(text, rateNum)
    const timing = estimateWordTiming(text, duration)
    
    return NextResponse.json({
      audio: audioBase64,
      timing,
      duration,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    })
    
  } catch (error) {
    console.error('Edge TTS error:', error)
    
    return NextResponse.json(
      { 
        error: 'TTS generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: true
      },
      { status: 500 }
    )
  }
}

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
    
    const url = new URL(request.url)
    url.searchParams.set('text', text)
    url.searchParams.set('voice', voice)
    url.searchParams.set('rate', rate)
    
    const newRequest = new NextRequest(url, { method: 'GET' })
    return GET(newRequest)
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Invalid request body', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    )
  }
}