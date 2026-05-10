# CSV Import Design

**Date:** 2026-05-10

## Overview

A one-time CSV import feature that lets the user load historical day-rating data from a spreadsheet into the app. The import replaces all existing data for the year detected in the CSV.

## CSV Format

```
YYYY-MM-DD,score,comment
```

- `score`: integer in range [-3, +3]
- `comment`: free text; may contain commas (handled by splitting on first two commas only)

## Components

### `CsvImportService`

New service at `src/app/services/csv-import.service.ts`.

**Method:** `parse(csvText: string): { year: number; state: YearState } | null`

- Splits input on newlines, skips blank lines
- Detects the target year from the first valid row
- Skips any rows whose year does not match the detected year
- For each valid row: splits on the first two commas, maps `YYYY-MM-DD` → `monthIdx = MM - 1`, `dayIdx = DD - 1`
- Clamps score to [-3, +3]
- Skips unparseable rows silently
- Returns `null` if no valid rows are found

### `Calendar` Component Changes

- Add a hidden `<input type="file" accept=".csv">` element
- Add an "Import CSV" button that programmatically triggers the file input
- On file selected:
  1. Read file contents via `FileReader`
  2. Call `CsvImportService.parse()`
  3. If result is non-null, call `StorageService.saveYear()` with the parsed `YearState`
  4. Re-hydrate the store so the UI reflects the imported data

## Data Flow

```
button click → file input → FileReader
  → CsvImportService.parse()
  → { year, YearState }
  → StorageService.saveYear()
  → store hydrated → UI updates
```

## Error Handling

- Invalid rows (bad date format, non-numeric score, wrong year) are silently skipped
- If `parse()` returns `null` (no valid rows), no changes are made to the store or storage
- No user-facing error UI is required (one-time operation, user controls the file)

## Testing

- Unit test `CsvImportService.parse()` with:
  - Happy path: well-formed CSV produces correct `YearState`
  - Comments containing commas are preserved
  - Rows from other years are excluded
  - Invalid rows are skipped without throwing
  - Empty/blank input returns `null`
