import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET - Fetch all user data from cloud
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch all user data in parallel
    const [
      readingPositions,
      bookmarks,
      highlights,
      notes,
      readingStats,
      readingGoals,
      userSettings,
      userTTSSettings,
      userLanguage,
    ] = await Promise.all([
      supabase.from('reading_positions').select('*').eq('user_id', userId),
      supabase.from('bookmarks').select('*').eq('user_id', userId),
      supabase.from('highlights').select('*').eq('user_id', userId),
      supabase.from('notes').select('*').eq('user_id', userId),
      supabase.from('reading_stats').select('*').eq('user_id', userId),
      supabase.from('reading_goals').select('*').eq('user_id', userId),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      supabase.from('user_tts_settings').select('*').eq('user_id', userId).single(),
      supabase.from('user_language').select('*').eq('user_id', userId).single(),
    ])

    return NextResponse.json({
      readingPositions: readingPositions.data || [],
      bookmarks: bookmarks.data || [],
      highlights: highlights.data || [],
      notes: notes.data || [],
      readingStats: readingStats.data || [],
      readingGoals: readingGoals.data || [],
      userSettings: userSettings.data || null,
      userTTSSettings: userTTSSettings.data || null,
      userLanguage: userLanguage.data || null,
    })
  } catch (error) {
    console.error('Error fetching sync data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync data' },
      { status: 500 }
    )
  }
}

// POST - Sync data to cloud
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, data } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Ensure user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (!existingUser) {
      // Create user if doesn't exist
      await supabase.from('users').insert({
        clerk_id: userId,
        email: null,
      })
    }

    if (action === 'upload' && data) {
      // Upload local data to cloud
      const results = await Promise.all([
        data.readingPositions?.length > 0
          ? supabase.from('reading_positions').upsert(
              data.readingPositions.map((rp: any) => ({
                user_id: userId,
                book_id: rp.book_id,
                chapter: rp.chapter,
                section: rp.section,
                scroll_position: rp.scroll_position || 0,
              })),
              { onConflict: 'user_id,book_id' }
            )
          : null,
        data.bookmarks?.length > 0
          ? supabase.from('bookmarks').upsert(
              data.bookmarks.map((b: any) => ({
                user_id: userId,
                book_id: b.book_id,
                chapter: b.chapter,
                section: b.section,
                title: b.title,
                note: b.note,
              }))
            )
          : null,
        data.highlights?.length > 0
          ? supabase.from('highlights').upsert(
              data.highlights.map((h: any) => ({
                user_id: userId,
                book_id: h.book_id,
                chapter: h.chapter,
                section: h.section,
                start_offset: h.start_offset,
                end_offset: h.end_offset,
                text: h.text,
                color: h.color || 'yellow',
                note: h.note,
              }))
            )
          : null,
        data.notes?.length > 0
          ? supabase.from('notes').upsert(
              data.notes.map((n: any) => ({
                user_id: userId,
                book_id: n.book_id,
                chapter: n.chapter,
                section: n.section,
                title: n.title,
                content: n.content,
              }))
            )
          : null,
        data.readingStats?.length > 0
          ? supabase.from('reading_stats').upsert(
              data.readingStats.map((rs: any) => ({
                user_id: userId,
                date: rs.date,
                books_read: rs.books_read || 0,
                chapters_read: rs.chapters_read || 0,
                reading_time_minutes: rs.reading_time_minutes || 0,
              })),
              { onConflict: 'user_id,date' }
            )
          : null,
        data.readingGoals?.length > 0
          ? supabase.from('reading_goals').upsert(
              data.readingGoals.map((rg: any) => ({
                user_id: userId,
                type: rg.type,
                target: rg.target,
                unit: rg.unit,
                start_date: rg.start_date,
                end_date: rg.end_date,
                is_active: rg.is_active ?? true,
              }))
            )
          : null,
        // User settings (single record per user)
        data.userSettings
          ? supabase.from('user_settings').upsert(
              {
                user_id: userId,
                theme: data.userSettings.theme,
                font_size: data.userSettings.font_size,
                line_height: data.userSettings.line_height,
                font_family: data.userSettings.font_family,
                chinese_font_family: data.userSettings.chinese_font_family,
                english_font_family: data.userSettings.english_font_family,
                margin_size: data.userSettings.margin_size,
              },
              { onConflict: 'user_id' }
            )
          : null,
        // TTS settings (single record per user)
        data.userTTSSettings
          ? supabase.from('user_tts_settings').upsert(
              {
                user_id: userId,
                voice_id: data.userTTSSettings.voice_id,
                voice_id_traditional: data.userTTSSettings.voice_id_traditional,
                voice_id_simplified: data.userTTSSettings.voice_id_simplified,
                voice_id_english: data.userTTSSettings.voice_id_english,
                rate: data.userTTSSettings.rate,
                pitch: data.userTTSSettings.pitch,
                volume: data.userTTSSettings.volume,
                auto_continue: data.userTTSSettings.auto_continue,
                highlight_enabled: data.userTTSSettings.highlight_enabled,
                expand_bible_references: data.userTTSSettings.expand_bible_references,
                normalize_polyphonic_chars: data.userTTSSettings.normalize_polyphonic_chars,
                remove_structural_markers: data.userTTSSettings.remove_structural_markers,
                natural_pauses: data.userTTSSettings.natural_pauses,
                pause_multiplier: data.userTTSSettings.pause_multiplier,
                emphasize_capitalized: data.userTTSSettings.emphasize_capitalized,
                prefer_neural_voices: data.userTTSSettings.prefer_neural_voices,
                engine: data.userTTSSettings.engine,
                edge_voice_gender: data.userTTSSettings.edge_voice_gender,
                edge_voice_id: data.userTTSSettings.edge_voice_id,
              },
              { onConflict: 'user_id' }
            )
          : null,
        // Language preference (single record per user)
        data.userLanguage
          ? supabase.from('user_language').upsert(
              {
                user_id: userId,
                language: data.userLanguage.language,
              },
              { onConflict: 'user_id' }
            )
          : null,
      ])

      return NextResponse.json({ success: true, action: 'upload' })
    }

    if (action === 'merge' && data) {
      // Merge local and cloud data
      // For simplicity, we'll upload the local data
      // In a real implementation, you'd merge with conflict resolution
      return POST(new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ action: 'upload', userId, data }),
      }))
    }

    // Default: just return success
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error syncing data:', error)
    return NextResponse.json(
      { error: 'Failed to sync data' },
      { status: 500 }
    )
  }
}

// DELETE - Clear all user data from cloud
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Delete all user data
    await Promise.all([
      supabase.from('reading_positions').delete().eq('user_id', userId),
      supabase.from('bookmarks').delete().eq('user_id', userId),
      supabase.from('highlights').delete().eq('user_id', userId),
      supabase.from('notes').delete().eq('user_id', userId),
      supabase.from('reading_stats').delete().eq('user_id', userId),
      supabase.from('reading_goals').delete().eq('user_id', userId),
      supabase.from('user_settings').delete().eq('user_id', userId),
      supabase.from('user_tts_settings').delete().eq('user_id', userId),
      supabase.from('user_language').delete().eq('user_id', userId),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing cloud data:', error)
    return NextResponse.json(
      { error: 'Failed to clear cloud data' },
      { status: 500 }
    )
  }
}