# Day Popup Design

**Date:** 2026-05-14

## Overview

A popup that lets users log their score and comment for any day without scrolling the main calendar. Opens to today by default, with sequential prev/next navigation.

## Architecture

A new standalone `DayPopupComponent` owns the `<dialog>` element and all popup logic. The `CalendarComponent` renders it once at the top level and holds a `ViewChild` reference. A "Today" button in the calendar header calls `popup.open()`, which sets the active day to today and calls `dialog.showModal()`.

**New files:**
- `src/app/day-popup/day-popup.ts`
- `src/app/day-popup/day-popup.html`
- `src/app/day-popup/day-popup.scss`

**Modified files:**
- `src/app/calendar/calendar.ts` — add `DayPopupComponent`, "Today" button
- `src/app/calendar/calendar.html` — render `<app-day-popup>` and "Today" button
- `src/app/day/day.ts` — flush debounce in `ngOnDestroy`

## Component: DayPopupComponent

**Signals:**
- `monthIndex = signal<number>(0)` — active month (0–11)
- `dayIndex = signal<number>(0)` — active day index within the month

**Computed:**
- `canGoPrev` — false when monthIndex === 0 && dayIndex === 0 (Jan 1)
- `canGoNext` — false when monthIndex === 11 && dayIndex === 30 (Dec 31, 0-indexed)

**Methods:**
- `open()` — sets signals to today's date, calls `dialogRef.nativeElement.showModal()`
- `close()` — calls `dialogRef.nativeElement.close()`
- `prev()` — decrements dayIndex, wrapping to previous month if needed
- `next()` — increments dayIndex, wrapping to next month if needed

**Template structure:**
```
<dialog>
  <header>
    <button (click)="close()">×</button>
    <span>{{ monthName }} {{ dayIndex() + 1 }}</span>
  </header>
  <div class="nav">
    <button [disabled]="!canGoPrev()" (click)="prev()">‹</button>
    <app-day
      [dayNumber]="dayIndex() + 1"
      [monthIndex]="monthIndex()"
      [dayIndex]="dayIndex()" />
    <button [disabled]="!canGoNext()" (click)="next()">›</button>
  </div>
</dialog>
```

## Day Component Change

`DayComponent.ngOnDestroy()` flushes any pending debounced comment save immediately, preventing lost updates when the popup closes before the 1-second debounce completes. This fix benefits both the popup and inline calendar contexts.

## Navigation Rules

- Sequential only: prev/next step one day at a time
- Month wrapping: decrement/increment month index when crossing month boundary
- Year boundary: `canGoPrev` disabled on Jan 1 (monthIndex 0, dayIndex 0), `canGoNext` disabled on Dec 31 (monthIndex 11, dayIndex 30)
- Multi-year navigation is out of scope

## Open Button

- Location: Calendar component header
- Label: "Today"
- Behavior: always opens to the current calendar date (not the last-viewed day)

## Data Flow

No new persistence logic. `DayComponent` writes directly to `CalendarStore` on every score/comment change (immediate for score, debounced 1s for comment, flushed on destroy). The popup is purely a navigation shell.
