export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reading_positions: {
        Row: {
          id: string
          user_id: string
          book_id: string
          chapter: number
          section: number
          scroll_position: number
          last_read_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          chapter: number
          section: number
          scroll_position?: number
          last_read_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          chapter?: number
          section?: number
          scroll_position?: number
          last_read_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          book_id: string
          chapter: number
          section: number
          title: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          chapter: number
          section: number
          title?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          chapter?: number
          section?: number
          title?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      highlights: {
        Row: {
          id: string
          user_id: string
          book_id: string
          chapter: number
          section: number
          start_offset: number
          end_offset: number
          text: string
          color: string
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          chapter: number
          section: number
          start_offset: number
          end_offset: number
          text: string
          color?: string
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          chapter?: number
          section?: number
          start_offset?: number
          end_offset?: number
          text?: string
          color?: string
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          book_id: string
          chapter: number | null
          section: number | null
          title: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          chapter?: number | null
          section?: number | null
          title: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          chapter?: number | null
          section?: number | null
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      reading_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          books_read: number
          chapters_read: number
          reading_time_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          books_read?: number
          chapters_read?: number
          reading_time_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          books_read?: number
          chapters_read?: number
          reading_time_minutes?: number
          created_at?: string
          updated_at?: string
        }
      }
      reading_goals: {
        Row: {
          id: string
          user_id: string
          type: 'daily' | 'weekly' | 'monthly' | 'yearly'
          target: number
          unit: 'chapters' | 'minutes' | 'books'
          start_date: string
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'daily' | 'weekly' | 'monthly' | 'yearly'
          target: number
          unit: 'chapters' | 'minutes' | 'books'
          start_date: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'daily' | 'weekly' | 'monthly' | 'yearly'
          target?: number
          unit?: 'chapters' | 'minutes' | 'books'
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sync_metadata: {
        Row: {
          id: string
          user_id: string
          entity_type: string
          entity_id: string
          last_synced_at: string
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: string
          entity_id: string
          last_synced_at?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?: string
          entity_id?: string
          last_synced_at?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          theme: string
          font_size: number
          line_height: number
          font_family: string
          chinese_font_family: string
          english_font_family: string
          margin_size: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: string
          font_size?: number
          line_height?: number
          font_family?: string
          chinese_font_family?: string
          english_font_family?: string
          margin_size?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: string
          font_size?: number
          line_height?: number
          font_family?: string
          chinese_font_family?: string
          english_font_family?: string
          margin_size?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_tts_settings: {
        Row: {
          id: string
          user_id: string
          voice_id: string
          voice_id_traditional: string
          voice_id_simplified: string
          voice_id_english: string
          rate: number
          pitch: number
          volume: number
          auto_continue: boolean
          highlight_enabled: boolean
          expand_bible_references: boolean
          normalize_polyphonic_chars: boolean
          remove_structural_markers: boolean
          natural_pauses: boolean
          pause_multiplier: number
          emphasize_capitalized: boolean
          prefer_neural_voices: boolean
          engine: string
          edge_voice_gender: string
          edge_voice_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          voice_id?: string
          voice_id_traditional?: string
          voice_id_simplified?: string
          voice_id_english?: string
          rate?: number
          pitch?: number
          volume?: number
          auto_continue?: boolean
          highlight_enabled?: boolean
          expand_bible_references?: boolean
          normalize_polyphonic_chars?: boolean
          remove_structural_markers?: boolean
          natural_pauses?: boolean
          pause_multiplier?: number
          emphasize_capitalized?: boolean
          prefer_neural_voices?: boolean
          engine?: string
          edge_voice_gender?: string
          edge_voice_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          voice_id?: string
          voice_id_traditional?: string
          voice_id_simplified?: string
          voice_id_english?: string
          rate?: number
          pitch?: number
          volume?: number
          auto_continue?: boolean
          highlight_enabled?: boolean
          expand_bible_references?: boolean
          normalize_polyphonic_chars?: boolean
          remove_structural_markers?: boolean
          natural_pauses?: boolean
          pause_multiplier?: number
          emphasize_capitalized?: boolean
          prefer_neural_voices?: boolean
          engine?: string
          edge_voice_gender?: string
          edge_voice_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_language: {
        Row: {
          id: string
          user_id: string
          language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          language?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types for sync data
export interface SyncData {
  readingPositions: Database['public']['Tables']['reading_positions']['Row'][]
  bookmarks: Database['public']['Tables']['bookmarks']['Row'][]
  highlights: Database['public']['Tables']['highlights']['Row'][]
  notes: Database['public']['Tables']['notes']['Row'][]
  readingStats: Database['public']['Tables']['reading_stats']['Row'][]
  readingGoals: Database['public']['Tables']['reading_goals']['Row'][]
  userSettings?: Database['public']['Tables']['user_settings']['Row']
  userTTSSettings?: Database['public']['Tables']['user_tts_settings']['Row']
  userLanguage?: Database['public']['Tables']['user_language']['Row']
}

export interface SyncPayload {
  readingPositions?: Database['public']['Tables']['reading_positions']['Insert'][]
  bookmarks?: Database['public']['Tables']['bookmarks']['Insert'][]
  highlights?: Database['public']['Tables']['highlights']['Insert'][]
  notes?: Database['public']['Tables']['notes']['Insert'][]
  readingStats?: Database['public']['Tables']['reading_stats']['Insert'][]
  readingGoals?: Database['public']['Tables']['reading_goals']['Insert'][]
  userSettings?: Database['public']['Tables']['user_settings']['Insert']
  userTTSSettings?: Database['public']['Tables']['user_tts_settings']['Insert']
  userLanguage?: Database['public']['Tables']['user_language']['Insert']
}