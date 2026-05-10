# CSV Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CSV import button to the Calendar that parses `YYYY-MM-DD,score,comment` rows, detects the year from the file, and replaces all stored data for that year.

**Architecture:** A new `CsvImportService` handles all parsing logic and is injected into the `Calendar` component. Calendar gains a hidden file input and an "Import CSV" button; on file selection it reads the file text, calls the service, saves via `StorageService`, and hydrates the store directly.

**Tech Stack:** Angular 21.1, NgRx Signals (`CalendarStore`), Vitest, TypeScript

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/app/services/csv-import.service.ts` |
| Create | `src/app/services/csv-import.service.spec.ts` |
| Modify | `src/app/calendar/calendar.ts` |
| Modify | `src/app/calendar/calendar.html` |
| Modify | `src/app/calendar/calendar.spec.ts` |

---

## Task 1: CsvImportService — tests

**Files:**
- Create: `src/app/services/csv-import.service.spec.ts`

- [ ] **Step 1: Create the spec file**

```typescript
// src/app/services/csv-import.service.spec.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { CsvImportService } from './csv-import.service';

describe('CsvImportService', () => {
  let service: CsvImportService;

  beforeEach(() => {
    service = new CsvImportService();
  });

  it('parses a well-formed CSV and returns correct YearState', () => {
    const csv = '2025-01-15,3,Great day\n2025-06-20,-2,bad day';
    const result = service.parse(csv);

    expect(result).not.toBeNull();
    expect(result!.year).toBe(2025);
    expect(result!.state.months[0].days[14].score).toBe(3);
    expect(result!.state.months[0].days[14].comment).toBe('Great day');
    expect(result!.state.months[5].days[19].score).toBe(-2);
    expect(result!.state.months[5].days[19].comment).toBe('bad day');
  });

  it('preserves commas inside comments', () => {
    const csv = '2025-03-10,1,good, not great, but okay';
    const result = service.parse(csv);

    expect(result!.state.months[2].days[9].comment).toBe('good, not great, but okay');
  });

  it('excludes rows whose year does not match the detected year', () => {
    const csv = '2025-01-01,1,first\n2024-06-15,2,other year\n2025-02-01,3,also 2025';
    const result = service.parse(csv);

    expect(result!.year).toBe(2025);
    expect(result!.state.months[0].days[0].score).toBe(1);
    expect(result!.state.months[1].days[0].score).toBe(3);
    // 2024 row not loaded — June 15 should be default 0
    expect(result!.state.months[5].days[14].score).toBe(0);
  });

  it('skips rows with an invalid date format without throwing', () => {
    const csv = 'not-a-date,1,comment\n2025-01-01,2,valid';
    const result = service.parse(csv);

    expect(result).not.toBeNull();
    expect(result!.state.months[0].days[0].score).toBe(2);
  });

  it('skips rows with a non-numeric score without throwing', () => {
    const csv = '2025-04-05,bad,comment\n2025-04-06,1,valid';
    const result = service.parse(csv);

    expect(result!.state.months[3].days[4].score).toBe(0);
    expect(result!.state.months[3].days[5].score).toBe(1);
  });

  it('skips blank lines without throwing', () => {
    const csv = '\n2025-01-01,1,fine\n\n';
    const result = service.parse(csv);

    expect(result).not.toBeNull();
    expect(result!.state.months[0].days[0].score).toBe(1);
  });

  it('returns null for empty input', () => {
    expect(service.parse('')).toBeNull();
  });

  it('returns null when no valid rows exist', () => {
    expect(service.parse('bad-line\nanother-bad-line')).toBeNull();
  });

  it('handles a leap year correctly (Feb 29)', () => {
    const csv = '2024-02-29,2,leap day';
    const result = service.parse(csv);

    expect(result!.state.months[1].days[28].score).toBe(2);
    expect(result!.state.months[1].days[28].comment).toBe('leap day');
  });

  it('initializes unset days to score 0 and empty comment', () => {
    const csv = '2025-07-04,1,holiday';
    const result = service.parse(csv);

    expect(result!.state.months[0].days[0].score).toBe(0);
    expect(result!.state.months[0].days[0].comment).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
npm test -- csv-import
```

Expected: multiple failures — `CsvImportService` does not exist yet.

---

## Task 2: CsvImportService — implementation

**Files:**
- Create: `src/app/services/csv-import.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// src/app/services/csv-import.service.ts
import { Injectable } from '@angular/core';
import { Score, YearState } from '../models/app.model';

@Injectable({ providedIn: 'root' })
export class CsvImportService {
  parse(csvText: string): { year: number; state: YearState } | null {
    const lines = csvText.split('\n').filter(l => l.trim() !== '');
    let detectedYear: number | null = null;
    let state: YearState | null = null;

    for (const line of lines) {
      const firstComma = line.indexOf(',');
      if (firstComma === -1) continue;
      const secondComma = line.indexOf(',', firstComma + 1);
      if (secondComma === -1) continue;

      const datePart = line.substring(0, firstComma);
      const scorePart = line.substring(firstComma + 1, secondComma);
      const comment = line.substring(secondComma + 1);

      const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) continue;

      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const day = parseInt(dateMatch[3], 10);

      if (detectedYear === null) {
        detectedYear = year;
        state = this.buildEmptyYearState(year);
      } else if (year !== detectedYear) {
        continue;
      }

      const score = parseInt(scorePart, 10);
      if (isNaN(score) || score < -3 || score > 3) continue;

      const monthIdx = month - 1;
      const dayIdx = day - 1;

      if (monthIdx < 0 || monthIdx > 11) continue;
      if (dayIdx < 0 || dayIdx >= state!.months[monthIdx].days.length) continue;

      state!.months[monthIdx].days[dayIdx] = { score: score as Score, comment };
    }

    if (detectedYear === null || state === null) return null;
    return { year: detectedYear, state };
  }

  private buildEmptyYearState(year: number): YearState {
    return {
      months: Array.from({ length: 12 }, (_, monthIdx) => ({
        days: Array.from(
          { length: new Date(year, monthIdx + 1, 0).getDate() },
          () => ({ score: 0 as Score, comment: '' })
        ),
      })),
    };
  }
}
```

- [ ] **Step 2: Run tests to confirm they all pass**

```bash
npm test -- csv-import
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/services/csv-import.service.ts src/app/services/csv-import.service.spec.ts
git commit -m "feat: add CsvImportService with CSV parsing logic"
```

---

## Task 3: Wire CSV import into the Calendar component

**Files:**
- Modify: `src/app/calendar/calendar.ts`
- Modify: `src/app/calendar/calendar.html`
- Modify: `src/app/calendar/calendar.spec.ts`

- [ ] **Step 1: Update `calendar.ts`**

Replace the entire file with:

```typescript
// src/app/calendar/calendar.ts
import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { CalendarStore } from './calendar.store';
import { Month } from '../month/month';
import { CsvImportService } from '../services/csv-import.service';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-calendar',
  imports: [Month],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  currentYear = new Date().getFullYear();

  private readonly csvImport = inject(CsvImportService);
  private readonly storage = inject(StorageService);
  private readonly store = inject(CalendarStore);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  triggerImport(): void {
    this.fileInput()?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = this.csvImport.parse(text);
    if (!result) return;

    await this.storage.saveYear(result.year, result.state);
    this.store.hydrate(result.state);
    input.value = '';
  }
}
```

- [ ] **Step 2: Update `calendar.html`**

Replace the entire file with:

```html
<div class="calendar-container">
  <div class="calendar-header">
    <h2>Year: {{ currentYear }}</h2>
    <button (click)="triggerImport()">Import CSV</button>
    <input #fileInput type="file" accept=".csv" style="display: none" (change)="onFileSelected($event)">
  </div>
  <div class="months-list">
    @for (month of months; track month; let i = $index) {
      <app-month [monthName]="month" [monthIndex]="i" [year]="currentYear"></app-month>
    }
  </div>
</div>
```

- [ ] **Step 3: Update `calendar.spec.ts`**

Add these two tests to the existing `describe('Calendar')` block. They go after the existing `'should create'` test. First, read the current spec to find where to insert them, then add:

```typescript
it('renders the Import CSV button', () => {
  fixture.detectChanges();
  const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
  expect(button.textContent?.trim()).toBe('Import CSV');
});

it('onFileSelected does nothing when parse returns null', async () => {
  mockCsvImportService.parse.mockReturnValue(null);
  const mockFile = new File(['bad data'], 'test.csv', { type: 'text/csv' });
  const mockEvent = {
    target: { files: [mockFile], value: '' },
  } as unknown as Event;

  await component.onFileSelected(mockEvent);

  expect(mockStorageService.saveYear).not.toHaveBeenCalled();
});

it('onFileSelected saves and hydrates when parse returns a valid result', async () => {
  const fakeState = { months: [] } as any;
  mockCsvImportService.parse.mockReturnValue({ year: 2025, state: fakeState });
  const mockFile = new File(['2025-01-01,1,test'], 'test.csv', { type: 'text/csv' });
  const mockEvent = {
    target: { files: [mockFile], value: '' },
  } as unknown as Event;

  await component.onFileSelected(mockEvent);

  expect(mockStorageService.saveYear).toHaveBeenCalledWith(2025, fakeState);
});
```

Also add `mockCsvImportService` to the test setup — add this alongside the existing `mockStorageService`:

```typescript
const mockCsvImportService = {
  parse: vi.fn(),
};
```

And add it to the `providers` array in `TestBed.configureTestingModule`:

```typescript
{ provide: CsvImportService, useValue: mockCsvImportService },
```

And add the import at the top of the spec:

```typescript
import { CsvImportService } from '../services/csv-import.service';
```

Reset the mock in `beforeEach`:

```typescript
mockCsvImportService.parse.mockReset();
```

- [ ] **Step 4: Run tests**

```bash
npm test -- calendar
```

Expected: all calendar tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/calendar/calendar.ts src/app/calendar/calendar.html src/app/calendar/calendar.spec.ts
git commit -m "feat: add Import CSV button to Calendar component"
```
