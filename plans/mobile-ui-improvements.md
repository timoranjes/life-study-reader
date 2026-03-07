# Mobile UI Improvements Plan

## Overview
This plan addresses two mobile UI issues:
1. Voice list not scrollable in TTS settings panel
2. Title hidden by too many buttons in mobile header

---

## Issue 1: TTS Settings Panel - Voice List Scrolling

### Current Problem
In [`tts-settings-panel.tsx`](components/reader/tts-settings-panel.tsx:105), the Sheet content uses `max-h-[70vh]` but the ScrollArea doesn't properly enable scrolling because:
- The parent `SheetContent` needs to be a flex container
- The `ScrollArea` needs a defined height or flex-1 with proper constraints

### Solution
Modify the SheetContent structure to properly enable scrolling:

**File**: [`components/reader/tts-settings-panel.tsx`](components/reader/tts-settings-panel.tsx)

**Changes**:
1. Add `flex flex-col` to `SheetContent` 
2. Remove `max-h-[70vh]` and instead use `h-[70vh]` or `max-h-[70vh]` with proper flex
3. Ensure `ScrollArea` has explicit height via `flex-1` and parent has proper constraints

```tsx
<SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-3 h-[70vh] flex flex-col">
  <SheetHeader className="pb-4 shrink-0">
    ...
  </SheetHeader>
  <ScrollArea className="flex-1 -mx-4 px-4">
    ...
  </ScrollArea>
</SheetContent>
```

---

## Issue 2: Reader Header - Mobile Title Visibility

### Current Problem
In [`reader-header.tsx`](components/reader/reader-header.tsx:47), the header has:
- **Left side**: Home + Menu buttons (~80px)
- **Center**: Title with `flex-1 truncate` (competed for space)
- **Right side**: Language switcher + 4 icon buttons (~180px)

On mobile (320px-375px width), the title gets squeezed or hidden.

### Solution: 2-Row Header Layout on Mobile

**File**: [`components/reader/reader-header.tsx`](components/reader/reader-header.tsx)

**Approach**: 
- On mobile: Stack buttons on top row, title on second row
- On desktop (md breakpoint and above): Keep current single-row layout

**Proposed Layout**:

```
Mobile ( < 768px ):
┌─────────────────────────────────────┐
│ 🏠 书架  ☰  │ 繁 简 EN │ 🔊 🔍 📓 ⚙️ │  <- Row 1: Buttons
├─────────────────────────────────────┤
│          Message Title Here         │  <- Row 2: Title (centered, full width)
└─────────────────────────────────────┘

Desktop ( >= 768px ):
┌───────────────────────────────────────────────────┐
│ 🏠 书架  ☰  │   Message Title   │ 繁 简 EN │ 🔊 🔍 📓 ⚙️ │
└───────────────────────────────────────────────────┘
```

**Implementation Details**:

1. Change outer header height:
   - Mobile: `h-auto` (or `min-h-14`)
   - Desktop: `h-14` (existing)

2. Use flex-col on mobile, flex-row on desktop:
   ```tsx
   <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border md:h-14">
     <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full px-3 max-w-2xl mx-auto">
       <!-- Row 1: All buttons -->
       <div className="flex items-center justify-between h-14 md:h-full">
         <!-- Left buttons (Home, Menu) -->
         <div className="flex items-center gap-1 shrink-0">...</div>
         
         <!-- Right buttons (Language, TTS, Search, Notebook, Settings) -->
         <div className="flex items-center gap-0.5 shrink-0">...</div>
       </div>
       
       <!-- Row 2: Title (mobile only) -->
       <h1 className="md:hidden text-sm font-semibold text-foreground px-2 pb-2 text-center truncate">
         {title}
       </h1>
       
       <!-- Title for desktop (inline with buttons) -->
       <h1 className="hidden md:block text-sm font-semibold text-foreground truncate px-2 text-center flex-1">
         {title}
       </h1>
     </div>
   </header>
   ```

**Alternative Cleaner Approach**:
Use a single title that moves position based on viewport:

```tsx
<header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
   <div className="flex flex-col max-w-2xl mx-auto">
     <!-- Button row -->
     <div className="flex items-center justify-between h-14 px-3">
       <!-- Left buttons -->
       <div className="flex items-center gap-1">...</div>
       
       <!-- Right buttons -->
       <div className="flex items-center gap-0.5">...</div>
     </div>
     
     <!-- Title row (mobile only) -->
     <div className="md:hidden px-3 pb-2 text-center">
       <h1 className="text-sm font-semibold text-foreground truncate">
         {title}
       </h1>
     </div>
     
     <!-- Desktop title is positioned absolutely or in a separate layout -->
   </div>
</header>
```

---

## Implementation Checklist

### TTS Settings Panel
- [ ] Modify `SheetContent` to use flex layout with proper height constraints
- [ ] Test voice list scrolling with many voices

### Reader Header  
- [ ] Implement 2-row layout for mobile
- [ ] Ensure desktop layout remains unchanged (single row)
- [ ] Adjust padding and spacing for mobile title row
- [ ] Verify title truncation works properly
- [ ] Test on various mobile viewport widths (320px, 375px, 414px)

---

## Files to Modify

1. [`components/reader/tts-settings-panel.tsx`](components/reader/tts-settings-panel.tsx)
   - Line 105: SheetContent styling changes

2. [`components/reader/reader-header.tsx`](components/reader/reader-header.tsx)
   - Lines 47-141: Restructure header layout with responsive 2-row design