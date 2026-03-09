-- Migration: Add user preferences tables
-- Description: Creates tables for user settings, TTS preferences, and language preference
-- These tables store user-specific preferences that sync across devices

-- ============================================================================
-- 1. User Settings Table (Reader Settings)
-- ============================================================================
-- Stores reader display preferences like theme, font settings, etc.

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'sepia', 'dark')),
    font_size INTEGER DEFAULT 16,
    line_height REAL DEFAULT 1.6,
    font_family TEXT DEFAULT 'serif',
    chinese_font_family TEXT DEFAULT 'serif' CHECK (chinese_font_family IN ('serif', 'sans', 'kai')),
    english_font_family TEXT DEFAULT 'serif' CHECK (english_font_family IN ('serif', 'sans', 'mono')),
    margin_size TEXT DEFAULT 'medium' CHECK (margin_size IN ('small', 'medium', 'large')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own settings
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own settings
CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own settings
CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own settings
CREATE POLICY "Users can delete own settings" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. User TTS Settings Table
-- ============================================================================
-- Stores text-to-speech preferences

CREATE TABLE IF NOT EXISTS public.user_tts_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    voice_id TEXT DEFAULT '',
    voice_id_traditional TEXT DEFAULT '',
    voice_id_simplified TEXT DEFAULT '',
    voice_id_english TEXT DEFAULT '',
    rate REAL DEFAULT 1.0 CHECK (rate >= 0.5 AND rate <= 2.0),
    pitch REAL DEFAULT 1.0 CHECK (pitch >= 0.5 AND pitch <= 2.0),
    volume REAL DEFAULT 1.0 CHECK (volume >= 0.0 AND volume <= 1.0),
    auto_continue BOOLEAN DEFAULT true,
    highlight_enabled BOOLEAN DEFAULT true,
    expand_bible_references BOOLEAN DEFAULT true,
    normalize_polyphonic_chars BOOLEAN DEFAULT true,
    remove_structural_markers BOOLEAN DEFAULT true,
    natural_pauses BOOLEAN DEFAULT true,
    pause_multiplier REAL DEFAULT 1.0 CHECK (pause_multiplier >= 0.5 AND pause_multiplier <= 2.0),
    emphasize_capitalized BOOLEAN DEFAULT true,
    prefer_neural_voices BOOLEAN DEFAULT true,
    engine TEXT DEFAULT 'edge' CHECK (engine IN ('edge', 'browser')),
    edge_voice_gender TEXT DEFAULT 'female' CHECK (edge_voice_gender IN ('female', 'male')),
    edge_voice_id TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_tts_settings_user_id ON public.user_tts_settings(user_id);

-- Enable RLS
ALTER TABLE public.user_tts_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own TTS settings
CREATE POLICY "Users can view own TTS settings" ON public.user_tts_settings
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own TTS settings
CREATE POLICY "Users can insert own TTS settings" ON public.user_tts_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own TTS settings
CREATE POLICY "Users can update own TTS settings" ON public.user_tts_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own TTS settings
CREATE POLICY "Users can delete own TTS settings" ON public.user_tts_settings
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. User Language Table
-- ============================================================================
-- Stores user's preferred language (simplified, traditional, english)

CREATE TABLE IF NOT EXISTS public.user_language (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT DEFAULT 'simplified' CHECK (language IN ('simplified', 'traditional', 'english')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_language_user_id ON public.user_language(user_id);

-- Enable RLS
ALTER TABLE public.user_language ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own language preference
CREATE POLICY "Users can view own language" ON public.user_language
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own language preference
CREATE POLICY "Users can insert own language" ON public.user_language
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own language preference
CREATE POLICY "Users can update own language" ON public.user_language
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own language preference
CREATE POLICY "Users can delete own language" ON public.user_language
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Trigger for automatic updated_at timestamps
-- ============================================================================
-- Function to automatically update the updated_at column

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all preference tables
DROP TRIGGER IF EXISTS handle_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER handle_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_tts_settings_updated_at ON public.user_tts_settings;
CREATE TRIGGER handle_user_tts_settings_updated_at
    BEFORE UPDATE ON public.user_tts_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_language_updated_at ON public.user_language;
CREATE TRIGGER handle_user_language_updated_at
    BEFORE UPDATE ON public.user_language
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.user_settings IS 'Stores user reader preferences like theme, font settings';
COMMENT ON TABLE public.user_tts_settings IS 'Stores text-to-speech preferences for each user';
COMMENT ON TABLE public.user_language IS 'Stores user preferred language setting';