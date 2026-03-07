# Free TTS Enhancement Plan

## Overview

This plan outlines improvements to the TTS system using completely free solutions. The focus is on maximizing naturalness with the existing Web Speech API through better text preprocessing, voice selection, and user preference persistence.

## Key Improvement Areas

### 1. Enhanced Text Preprocessing for Naturalness

#### 1.1 Natural Pause Injection
Add context-aware pauses at punctuation and semantic boundaries:
- **Sentence end**: 400-600ms pause after periods, exclamation, question marks
- **Clause boundaries**: 200-300ms after commas, semicolons, colons
- **Paragraph breaks**: 600-800ms between paragraphs
- **Quote boundaries**: Brief pause before/after quotes

#### 1.2 Prosody Enhancement via SSML-like Processing
Since Web Speech API doesn't fully support SSML, we simulate it:
- **Emphasis detection**: Words in ALL CAPS or *italicized* get subtle emphasis
- **Number formatting**: Convert numbers to natural spoken form (1,234 → "one thousand two hundred thirty-four")
- **Abbreviation expansion**: Convert common abbreviations (cf. → "compare", i.e. → "that is")
- **Bible reference formatting**: Already implemented, enhance with natural phrasing

#### 1.3 Smart Sentence Breaking
- Break long sentences into natural chunks for better TTS processing
- Respect semantic boundaries (don't break mid-phrase)
- Handle Chinese and English differently (Chinese uses different breaking rules)

### 2. Voice Selection Improvements

#### 2.1 Neural Voice Detection and Prioritization
Modern browsers provide high-quality neural voices for free:
- **Edge browser**: Microsoft neural voices (HsiaoChen, YunJhe, Jenny, etc.)
- **Chrome**: Google neural voices
- **Safari**: Apple neural voices

Detection strategy:
```typescript
// Neural voice name patterns
const NEURAL_VOICE_PATTERNS = [
  /Natural/i,
  /Neural/i,
  /Online\s*\(Natural\)/i,
  /Enhanced/i,
]

// Priority order for voice quality
// 1. Neural voices (highest quality)
// 2. Enhanced/Premium voices
// 3. Standard voices (fallback)
```

#### 2.2 Per-Language Voice Memory
Remember user's preferred voice for each language separately:
```typescript
interface TTSSettings {
  // ... existing settings
  voiceIdChinese: string      // Voice for Chinese content
  voiceIdEnglish: string      // Voice for English content
  useNeuralVoices: boolean    // Prefer neural voices when available
}
```

#### 2.3 Automatic Fallback
If user's saved voice is no longer available (browser update, etc.):
- Fall back to best available voice of same quality tier
- Notify user of voice change
- Remember new preference

### 3. User Preference Persistence Improvements

#### 3.1 Enhanced Settings Storage
```typescript
interface TTSSettings {
  // Voice preferences
  voiceId: string                    // Current active voice
  voiceIdTraditional: string         // Preferred voice for Traditional Chinese
  voiceIdSimplified: string          // Preferred voice for Simplified Chinese  
  voiceIdEnglish: string             // Preferred voice for English
  
  // Playback preferences
  rate: number                       // Speech rate (0.5 - 2.0)
  pitch: number                      // Pitch adjustment (0.5 - 2.0)
  volume: number                     // Volume (0.0 - 1.0)
  
  // Naturalness settings
  naturalPauses: boolean             // Add natural pauses
  pauseMultiplier: number            // Pause duration multiplier (0.5 - 2.0)
  emphasizeCapitalized: boolean      // Add emphasis to ALL CAPS words
  
  // Content processing
  autoContinue: boolean              // Auto-continue to next message
  expandBibleReferences: boolean     // Expand Bible references
  normalizePolyphonicChars: boolean // Handle polyphonic characters
  removeStructuralMarkers: boolean   // Remove outline markers
  
  // Quality preferences
  preferNeuralVoices: boolean        // Prefer neural voices
  autoSelectBestVoice: boolean       // Auto-select best available voice
}
```

#### 3.2 Settings Migration
Handle migration from old settings format to new format seamlessly.

### 4. Naturalness Enhancement Implementation

#### 4.1 Pause Injection System
```typescript
// lib/tts-pauses.ts
interface PauseConfig {
  sentence: number      // ms after sentence end
  clause: number        // ms after comma/semicolon
  paragraph: number     // ms between paragraphs
  quote: number         // ms before/after quotes
}

const DEFAULT_PAUSES: PauseConfig = {
  sentence: 500,
  clause: 250,
  paragraph: 700,
  quote: 150,
}

function injectPauses(text: string, pauses: PauseConfig): string {
  // Insert pause markers using Unicode zero-width spaces with timing hints
  // Or use speechSynthesis API's pause/resume for precise timing
}
```

#### 4.2 Chunked Speech for Long Content
For very long paragraphs, split into natural chunks:
```typescript
function chunkTextForNaturalSpeech(text: string): string[] {
  // Split at natural boundaries
  // Each chunk should be 1-3 sentences
  // Maintain context across chunks
}
```

### 5. UI Improvements

#### 5.1 Enhanced Settings Panel
- Add "Naturalness" section with pause controls
- Show voice quality badge more prominently
- Add "Test Voice" button to preview selection
- Display browser's best available voices at top

#### 5.2 Voice Quality Indicators
Show clearer quality indicators:
- 🟢 Neural (Best quality)
- 🟡 Enhanced (Good quality)
- ⚪ Standard (Basic quality)

### 6. Implementation Phases

#### Phase 1: Settings Enhancement
1. Extend TTSSettings interface
2. Update storage functions for migration
3. Add per-language voice preference

#### Phase 2: Voice Selection
1. Implement neural voice detection
2. Add automatic best-voice selection
3. Improve fallback logic

#### Phase 3: Naturalness Processing
1. Implement pause injection
2. Add emphasis detection
3. Enhance number/abbreviation handling

#### Phase 4: UI Updates
1. Update settings panel
2. Add voice preview feature
3. Improve quality indicators

## Technical Details

### Browser Neural Voice Availability

| Browser | Chinese Neural Voices | English Neural Voices |
|---------|----------------------|----------------------|
| Edge | HsiaoChen, YunJhe, HsiaoYu | Jenny, Guy, Aria |
| Chrome | Google 普通话, Google 臺灣 | Google US, Google UK |
| Safari | Ting-Ting, Sin-ji | Samantha, Alex, Daniel |

### Files to Modify

1. `lib/tts-types.ts` - Extended settings interface
2. `lib/tts-storage.ts` - Enhanced storage and migration
3. `lib/tts-preprocessor.ts` - Naturalness preprocessing
4. `lib/tts-pauses.ts` - New file for pause logic
5. `hooks/use-tts.tsx` - Integration of new features
6. `components/reader/tts-settings-panel.tsx` - UI updates

## Success Metrics

1. **Voice Persistence**: User selection remembered across sessions
2. **Naturalness Score**: Subjective improvement in speech quality
3. **Voice Quality**: Prefer neural voices when available
4. **User Satisfaction**: Clear indication of voice quality in UI