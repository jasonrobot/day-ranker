# DayEditor Reactive Form Design

**Date:** 2026-05-16

## Overview

Replace `DayEditor`'s signal-based, event-driven saving (with debounced comment writes) with Angular reactive forms and explicit Save/Cancel buttons. The editor holds its own local form state; the parent (`DayPopup`) reacts to outputs to close the dialog and show/hide navigation.

## Components

### `DayEditor`

**Form:** Built with `FormBuilder`, two controls:
- `score` — initialized to `currentDay.score ?? 0`
- `comment` — initialized to `currentDay.comment`

Angular's `form.dirty` tracks whether the user has made any changes. No manual state comparison needed.

**Save button:** Reads form values, calls `calendarStore.updateDay(...)`, then emits `closed`.

**Cancel button:** Emits `closed` without writing to the store.

**Outputs:**
- `closed: EventEmitter<void>` — emitted on both Save and Cancel. `DayPopup` calls `this.close()` in response.
- `dirtyChange: EventEmitter<boolean>` — emitted via `form.valueChanges` subscription whenever the form's dirty state changes. `DayPopup` uses this to show/hide prev/next buttons.

**Removed:**
- `debounce` / `lodash` dependency
- `OnDestroy` lifecycle hook
- `setScore` / `setComment` event handlers
- All manual signal-based writing to the store on input events

**Inputs:** `monthIndex`, `dayIndex`, `dayNumber` unchanged. Component reads the current day from `CalendarStore` on `ngOnInit` to seed the form.

### `DayPopup`

- Tracks a local `isDirty = false` boolean.
- On `(dirtyChange)`: updates `isDirty`.
- On `(closed)`: calls `this.close()`.
- Hides prev/next buttons when `isDirty` is true.

## Data Flow

```
User edits form
  → form.dirty = true
  → DayEditor emits dirtyChange(true)
  → DayPopup hides prev/next

User clicks Save
  → DayEditor writes to CalendarStore
  → DayEditor emits closed
  → DayPopup calls close()

User clicks Cancel
  → DayEditor emits closed
  → DayPopup calls close()
```

## Out of Scope

- `DayEditorStore` / component-scoped NgRx store (deferred — may revisit when more day fields are added)
- Score validation beyond what `isScore()` already provides
