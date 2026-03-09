# Cloud Sync System Documentation

This document provides comprehensive information about the Life Study Reader's cloud sync system, which enables users to synchronize their reading data across multiple devices.

## Overview

The sync system provides seamless data synchronization between local storage and Supabase cloud storage. It automatically handles:

- **Local-first approach**: All data is saved to localStorage immediately, ensuring offline functionality
- **Cloud sync when authenticated**: When users log in, their data is automatically synced to the cloud
- **Conflict resolution**: Uses timestamp-based conflict resolution when merging data from different sources
- **Real-time status updates**: UI components can subscribe to sync events for real-time feedback

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  useSync Hook   │───▶│  Sync Service   │                    │
│  │  (hooks/use-sync)│    │ (lib/sync-service)│                  │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                               │
│  ┌─────────────────┐             │                               │
│  │ SyncSettings    │             │                               │
│  │ Component       │             │                               │
│  └─────────────────┘             │                               │
│                                  ▼                               │
│                        ┌─────────────────┐                      │
│                        │  localStorage   │ (offline storage)    │
│                        └─────────────────┘                      │
│                                  │                               │
└──────────────────────────────────┼───────────────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────┐
                        │  Sync API       │
                        │ (/api/sync/full)│
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    Supabase     │ (cloud storage)
                        └─────────────────┘
```

## What Data is Synced

The sync system handles the following data types:

### Reading Progress
- **Reading Positions**: Current chapter/section and scroll position for each book
- **Message Progress**: The last read message index for each book

### User Content
- **Highlights**: Text highlights with color, position, and associated notes
- **Notes**: User-created notes linked to specific passages
- **Bookmarks**: Saved positions with labels and notes

### Settings & Preferences
- **Reader Settings**: Theme (light/sepia/dark), font families, font size, line height
- **TTS Settings**: Voice selections, rate, pitch, volume, and all TTS preferences
- **Language Preference**: Interface language (simplified/traditional/english)

### Statistics
- **Reading Stats**: Daily reading statistics (books read, chapters read, reading time)
- **Reading Goals**: User-defined reading goals (daily/weekly/monthly)

## How Automatic Sync Works

### Event-Driven Sync

The sync service uses an event-driven architecture:

1. **Data Changes**: When any data is modified (highlights, notes, bookmarks, etc.), the service emits a `data:changed` event
2. **Debouncing**: Changes are debounced (2 seconds by default) to prevent excessive API calls
3. **Pending Changes Counter**: The service tracks the number of pending changes
4. **Automatic Sync Trigger**: When a user is authenticated and online, sync is triggered automatically

### Authentication Integration

The [`useSync`](../hooks/use-sync.tsx:60) hook integrates with Clerk authentication:

```typescript
// Automatically syncs when user logs in
useEffect(() => {
  if (isAuthenticated && userId && !hasSyncedOnAuthRef.current) {
    hasSyncedOnAuthRef.current = true
    syncService.fullSync(userId)
  }
}, [isAuthenticated, userId])
```

### Online/Offline Handling

The system automatically detects network status:
- When offline, all changes are saved locally
- When back online, the service emits a `sync:start` event to trigger synchronization
- UI components show offline status to inform users

## API Endpoints

### GET `/api/sync/full`

Downloads all user data from the cloud.

**Query Parameters:**
- `userId` (required): The authenticated user's ID

**Response:**
```json
{
  "readingPositions": [...],
  "bookmarks": [...],
  "highlights": [...],
  "notes": [...],
  "readingStats": [...],
  "readingGoals": [...],
  "userSettings": {...},
  "userTTSSettings": {...},
  "userLanguage": {...}
}
```

### POST `/api/sync/full`

Uploads local data to the cloud.

**Request Body:**
```json
{
  "action": "upload",
  "userId": "user_xxx",
  "data": {
    "readingPositions": [...],
    "bookmarks": [...],
    "highlights": [...],
    "notes": [...],
    "readingStats": [...],
    "readingGoals": [...],
    "userSettings": {...},
    "userTTSSettings": {...},
    "userLanguage": {...}
  }
}
```

### DELETE `/api/sync/full`

Clears all user data from the cloud (used for account deletion).

**Query Parameters:**
- `userId` (required): The authenticated user's ID

## Database Schema

The sync system uses the following Supabase tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts linked to Clerk authentication |
| `reading_positions` | Current reading position per book |
| `bookmarks` | Saved bookmarks |
| `highlights` | Text highlights |
| `notes` | User notes |
| `reading_stats` | Daily reading statistics |
| `reading_goals` | Reading goals |
| `user_settings` | Reader display preferences |
| `user_tts_settings` | Text-to-speech preferences |
| `user_language` | Language preference |
| `sync_metadata` | Sync version tracking |

## Running the Database Migration

To set up the required database tables:

### Using Supabase CLI

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/add_user_preferences.sql`
4. Execute the SQL

### Manual Migration

If you need to create the main sync tables, run this SQL:

```sql
-- Core sync tables (if not already created)
CREATE TABLE IF NOT EXISTS public.reading_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    section INTEGER NOT NULL,
    scroll_position INTEGER DEFAULT 0,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    section INTEGER NOT NULL,
    title TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    section INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    text TEXT NOT NULL,
    color TEXT DEFAULT 'yellow',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL,
    chapter INTEGER,
    section INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reading_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    books_read INTEGER DEFAULT 0,
    chapters_read INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.reading_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'yearly')),
    target INTEGER NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('chapters', 'minutes', 'books')),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.reading_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;
```

## Conflict Resolution

The sync service uses timestamp-based conflict resolution:

### For Bookmarks
```typescript
// Compare timestamps and keep the newer one
const localTime = new Date(existing.updatedAt ?? existing.createdAt).getTime()
const cloudTime = new Date(cloudBookmark.updated_at).getTime()

if (cloudTime > localTime) {
  // Use cloud version
} else {
  // Keep local version
}
```

### For Highlights & Notes
- Items are merged by ID
- New items from cloud are added to local storage
- Existing items are preserved (local changes take precedence)

### For Settings
- Cloud settings with `updated_at` timestamps are compared
- A 1-minute tolerance is used to account for clock differences
- Newer settings are applied

## Troubleshooting Common Issues

### Sync Not Working

**Symptoms**: Data not syncing between devices

**Solutions**:
1. Check if you're logged in: The sync only works when authenticated
2. Check network status: Sync requires an internet connection
3. Check browser console for errors: Look for API errors or CORS issues
4. Verify Supabase connection: Ensure environment variables are set correctly

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Data Conflicts

**Symptoms**: Unexpected data after sync

**Solutions**:
1. The sync uses timestamps to resolve conflicts
2. If data appears incorrect, you can trigger a manual sync from the settings panel
3. Check the `pendingChanges` counter in the UI - if it's high, sync may be delayed

### Offline Mode Issues

**Symptoms**: Changes not saved when offline

**Solutions**:
1. All changes are saved to localStorage when offline
2. When back online, the sync automatically resumes
3. Check the offline indicator in the UI

### API Errors

**Common Error Codes**:

| Status Code | Meaning | Solution |
|-------------|---------|----------|
| 400 | Bad Request | Check that userId is provided |
| 401 | Unauthorized | User not authenticated with Clerk |
| 500 | Server Error | Check Supabase connection and logs |

### Debug Mode

To enable debug logging for sync operations:

```typescript
// In your component
useEffect(() => {
  const unsubscribe = syncService.subscribe('sync:start', (event) => {
    console.log('Sync started:', event)
  })
  return unsubscribe
}, [])
```

## Best Practices

1. **Always check authentication**: Use the `isAuthenticated` flag from `useSync()` before showing sync UI
2. **Handle offline gracefully**: Use the `isOnline` flag to disable sync buttons when offline
3. **Show sync status**: Display `isSyncing`, `lastSyncTime`, and `pendingChanges` to keep users informed
4. **Error handling**: Display the `error` state when sync fails

## Related Files

- [`lib/sync-service.ts`](../lib/sync-service.ts) - Core sync service implementation
- [`hooks/use-sync.tsx`](../hooks/use-sync.tsx) - React hook for sync functionality
- [`components/reader/sync-settings.tsx`](../components/reader/sync-settings.tsx) - Sync settings UI component
- [`app/api/sync/full/route.ts`](../app/api/sync/full/route.ts) - API endpoint handlers
- [`types/database.ts`](../types/database.ts) - Database type definitions
- [`supabase/migrations/add_user_preferences.sql`](../supabase/migrations/add_user_preferences.sql) - Database migration