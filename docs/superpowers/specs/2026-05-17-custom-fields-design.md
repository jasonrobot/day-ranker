# Custom Fields Design

**Date:** 2026-05-17

## Overview

Allow users to define custom fields beyond `score` and `comment` on each day. Fields are global (shared across all years), defined once, and rendered in the day editor below the comment textarea. A settings dialog accessible from the calendar header manages field definitions.

---

## Data Models

### Field Definitions (`app.model.ts`)

Discriminated union off `type`, with a shared base:

```typescript
interface BaseFieldDefinition {
  label: string;
  hidden: boolean;
  order: number;
}

interface TextFieldDefinition extends BaseFieldDefinition {
  type: 'text';
}

interface BooleanFieldDefinition extends BaseFieldDefinition {
  type: 'boolean';
}

interface NumberFieldDefinition extends BaseFieldDefinition {
  type: 'number';
  range: [number, number];
}

type FieldDefinition = TextFieldDefinition | BooleanFieldDefinition | NumberFieldDefinition;
```

Type predicates for safe narrowing:

```typescript
function isTextField(f: FieldDefinition): f is TextFieldDefinition {
  return f.type === 'text';
}

function isBooleanField(f: FieldDefinition): f is BooleanFieldDefinition {
  return f.type === 'boolean';
}

function isNumberField(f: FieldDefinition): f is NumberFieldDefinition {
  return f.type === 'number';
}
```

### AppSettings

```typescript
interface AppSettings {
  customFields: FieldDefinition[];
}
```

### DayState

`DayState` gains one new property:

```typescript
interface DayState {
  score: Score | null;
  comment: string;
  customFields: Record<string, string | boolean | number>;
}
```

Keys are field labels. A missing key means the field did not exist when the day was recorded — the editor does not show or auto-create that key. A present key always carries a concrete value (no `null`).

---

## Storage

`StorageService` gains two new methods, following the same pattern as the existing year persistence:

- `loadSettings(): Promise<AppSettings>` — loads from Firestore (`/users/{uid}/settings`), falls back to localStorage key `'settings'`
- `saveSettings(settings: AppSettings): Promise<void>` — writes to localStorage immediately, then Firestore async

Field definitions are stored in a **separate Firestore document** from year data. They are not bundled with `saveYear()` and are not sent over the wire on day updates.

---

## CalendarStore

### State

```typescript
interface StoreState {
  years: Record<number, YearState>;
  currentYear: number;
  customFields: FieldDefinition[];
}
```

`customFields` is exposed as a public signal.

### Initialization

On store init, `loadSettings()` is called and the result is patched into state alongside year initialization.

### New Methods

- `addField(def: FieldDefinition): string | null` — validates label uniqueness; returns an error string if a field with the same label already exists, `null` on success. On success, appends to `customFields` and calls `saveSettings()`.
- `updateField(label: string, update: Partial<Omit<FieldDefinition, 'label' | 'type'>>)` — updates `hidden` and/or `order` on an existing field by label, calls `saveSettings()`.

`updateDay()` is unchanged. Custom field values are written by the editor as part of the normal `DayState` payload.

---

## Settings Dialog (`SettingsDialogComponent`)

Modeled after `DayPopup` — uses a `<dialog>` element, opened via a public `open()` method.

### Field List

Displays existing fields sorted by `order`. Each row shows:
- Label (read-only)
- Type (read-only)
- Order (`<input type="number">`, no range validation)
- Hidden (`<input type="checkbox">`)

Changes to order/hidden call `calendarStore.updateField()` immediately.

### Add Field Form

Inputs:
- Label (text)
- Type (select: `text` / `boolean` / `number`)
- Range (two number inputs, shown only when type = `number`)
- Order (number)

On submit, calls `calendarStore.addField()`. If a non-null string is returned, it is shown as an inline error message. The dialog stays open; the user fixes and retries.

---

## Calendar Header

A settings button (gear icon or "Settings" label) is added to the calendar header. Clicking it calls `settingsDialog.open()` on the `SettingsDialogComponent` instance — same pattern as `Calendar` calling `dayPopup.open()`.

---

## Day Editor (`DayEditorComponent`)

Custom field controls are rendered below the comment textarea.

### Visibility Rule

A field control is shown if and only if **both** conditions are true:
1. `fieldDefinition.hidden === false`
2. The day's `customFields` record contains that field's label as a key

If either condition fails, the field is silently skipped.

### Controls

Each visible field renders based on its type:
- `text` → `<input type="text">`
- `boolean` → `<input type="checkbox">`
- `number` → `<input type="number">` with `min`/`max` from `range`

### Save Behavior

On save, `updateDay()` is called with the full `customFields` record. Hidden fields that have existing values on the day are preserved — they are carried through the save untouched even though they are not rendered.

New field keys are only written when the user explicitly edits and saves — the editor does not auto-initialize missing keys.

---

## Non-Editor Day Component

Custom fields are not shown in the read-only `DayComponent` (calendar grid cells). No changes needed there.

---

## Testing

- Unit: `addField()` duplicate label validation
- Unit: type predicates (`isTextField`, `isBooleanField`, `isNumberField`)
- Unit: `updateDay()` preserves hidden field values through a save
- Component: settings dialog add-field inline error on duplicate label
