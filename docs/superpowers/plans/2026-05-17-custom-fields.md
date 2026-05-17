# Custom Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-defined custom fields (text, boolean, number) to each day, managed via a settings dialog and rendered in the day editor.

**Architecture:** Global field definitions live in `CalendarStore` alongside year data, persisted to a separate Firestore document via `StorageService`. The day editor renders visible non-hidden fields below the comment textarea; the settings dialog (modeled after `DayPopup`) lets users add fields and toggle their visibility/order.

**Tech Stack:** Angular 21.1, NgRx Signals, TypeScript discriminated unions, Angular `<dialog>` element, Vitest

---

## File Map

**Create:**
- `src/app/models/app.model.spec.ts` — type predicate unit tests
- `src/app/settings-dialog/settings-dialog.ts` — settings dialog component
- `src/app/settings-dialog/settings-dialog.html` — settings dialog template
- `src/app/settings-dialog/settings-dialog.scss` — settings dialog styles

**Modify:**
- `src/app/models/app.model.ts` — add field types, predicates, AppSettings, update DayState
- `src/app/services/storage.service.ts` — add `loadSettings` / `saveSettings`
- `src/app/calendar/calendar.store.ts` — add `customFields` state, `addField`, `updateField`, settings init
- `src/app/calendar/calendar.store.spec.ts` — update mock, add addField/updateField tests
- `src/app/day-editor/day-editor.ts` — add custom field rendering and save logic
- `src/app/day-editor/day-editor.html` — add custom field controls below comment
- `src/app/day-editor/day-editor.spec.ts` — update mock, add custom field save test
- `src/app/calendar/calendar.ts` — import SettingsDialog, add viewChild + openSettings
- `src/app/calendar/calendar.html` — add Settings button and `<app-settings-dialog>`

---

## Task 1: Update Data Models

**Files:**
- Modify: `src/app/models/app.model.ts`
- Create: `src/app/models/app.model.spec.ts`

- [ ] **Step 1: Write the failing predicate tests**

Create `src/app/models/app.model.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  FieldDefinition,
  isTextField,
  isBooleanField,
  isNumberField,
} from './app.model';

describe('isTextField', () => {
  it('returns true for a text field', () => {
    const f: FieldDefinition = { type: 'text', label: 'Notes', hidden: false, order: 0 };
    expect(isTextField(f)).toBe(true);
  });

  it('returns false for a boolean field', () => {
    const f: FieldDefinition = { type: 'boolean', label: 'Good', hidden: false, order: 0 };
    expect(isTextField(f)).toBe(false);
  });

  it('returns false for a number field', () => {
    const f: FieldDefinition = { type: 'number', label: 'Energy', hidden: false, order: 0, range: [0, 10] };
    expect(isTextField(f)).toBe(false);
  });
});

describe('isBooleanField', () => {
  it('returns true for a boolean field', () => {
    const f: FieldDefinition = { type: 'boolean', label: 'Good', hidden: false, order: 0 };
    expect(isBooleanField(f)).toBe(true);
  });

  it('returns false for a text field', () => {
    const f: FieldDefinition = { type: 'text', label: 'Notes', hidden: false, order: 0 };
    expect(isBooleanField(f)).toBe(false);
  });
});

describe('isNumberField', () => {
  it('returns true for a number field', () => {
    const f: FieldDefinition = { type: 'number', label: 'Energy', hidden: false, order: 0, range: [0, 10] };
    expect(isNumberField(f)).toBe(true);
  });

  it('returns false for a text field', () => {
    const f: FieldDefinition = { type: 'text', label: 'Notes', hidden: false, order: 0 };
    expect(isNumberField(f)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "app.model" /tmp/test-output.txt
```

Expected: FAIL — `isTextField` / `isBooleanField` / `isNumberField` not exported.

- [ ] **Step 3: Update `app.model.ts`**

Replace the entire file with:

```typescript
export type Score = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export function isScore(value: number): value is Score {
  return value >= -3 && value <= 3;
}

export interface BaseFieldDefinition {
  label: string;
  hidden: boolean;
  order: number;
}

export interface TextFieldDefinition extends BaseFieldDefinition {
  type: 'text';
}

export interface BooleanFieldDefinition extends BaseFieldDefinition {
  type: 'boolean';
}

export interface NumberFieldDefinition extends BaseFieldDefinition {
  type: 'number';
  range: [number, number];
}

export type FieldDefinition = TextFieldDefinition | BooleanFieldDefinition | NumberFieldDefinition;
export type FieldType = 'text' | 'boolean' | 'number';

export function isTextField(f: FieldDefinition): f is TextFieldDefinition {
  return f.type === 'text';
}

export function isBooleanField(f: FieldDefinition): f is BooleanFieldDefinition {
  return f.type === 'boolean';
}

export function isNumberField(f: FieldDefinition): f is NumberFieldDefinition {
  return f.type === 'number';
}

export interface AppSettings {
  customFields: FieldDefinition[];
}

// customFields is optional for backwards compatibility with data saved before this feature.
// Treat absent customFields as {}.
export interface DayState {
  score: Score | null;
  comment: string;
  customFields?: Record<string, string | boolean | number>;
}

export interface MonthState {
  days: DayState[];
}

export interface YearState {
  months: MonthState[];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "app.model\|FAIL\|Tests " /tmp/test-output.txt
```

Expected: all predicate tests PASS. Existing tests may have TypeScript issues — fix any import errors that arise.

- [ ] **Step 5: Commit**

```bash
git add src/app/models/app.model.ts src/app/models/app.model.spec.ts
git commit -m "feat: add custom field types, predicates, and AppSettings to data model"
```

---

## Task 2: Update StorageService

**Files:**
- Modify: `src/app/services/storage.service.ts`

- [ ] **Step 1: Add `loadSettings` and `saveSettings` to `StorageService`**

Replace the file contents with:

```typescript
import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../firebase';
import { AuthService } from './auth.service';
import { AppSettings, YearState } from '../models/app.model';

const DEFAULT_SETTINGS: AppSettings = { customFields: [] };

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);
  private readonly authService = inject(AuthService);

  private localKey(uid: string, year: number): string {
    return `day-ranker:${uid}:${year}`;
  }

  private localSettingsKey(uid: string): string {
    return `day-ranker:${uid}:settings`;
  }

  async loadYear(year: number): Promise<YearState | null> {
    const uid = this.authService.user()?.uid;
    if (!uid) return null;

    try {
      const ref = doc(this.firestore, `users/${uid}/years/${year}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as YearState;
      }
    } catch (e) {
      console.error('Firestore read failed, falling back to localStorage', e);
    }

    const raw = localStorage.getItem(this.localKey(uid, year));
    return raw ? JSON.parse(raw) : null;
  }

  async saveYear(year: number, state: YearState): Promise<void> {
    const uid = this.authService.user()?.uid;
    if (!uid) return;

    localStorage.setItem(this.localKey(uid, year), JSON.stringify(state));

    const ref = doc(this.firestore, `users/${uid}/years/${year}`);
    setDoc(ref, state).catch(e => {
      console.error('Firestore write failed', e);
    });
  }

  async loadSettings(): Promise<AppSettings> {
    const uid = this.authService.user()?.uid;
    if (!uid) return DEFAULT_SETTINGS;

    try {
      const ref = doc(this.firestore, `users/${uid}/settings`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as AppSettings;
      }
    } catch (e) {
      console.error('Firestore settings read failed, falling back to localStorage', e);
    }

    const raw = localStorage.getItem(this.localSettingsKey(uid));
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const uid = this.authService.user()?.uid;
    if (!uid) return;

    localStorage.setItem(this.localSettingsKey(uid), JSON.stringify(settings));

    const ref = doc(this.firestore, `users/${uid}/settings`);
    setDoc(ref, settings).catch(e => {
      console.error('Firestore settings write failed', e);
    });
  }
}
```

- [ ] **Step 2: Run all tests to verify nothing broke**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "FAIL\|Tests " /tmp/test-output.txt
```

Expected: all existing tests still PASS (StorageService is mocked in tests).

- [ ] **Step 3: Commit**

```bash
git add src/app/services/storage.service.ts
git commit -m "feat: add loadSettings/saveSettings to StorageService"
```

---

## Task 3: Update CalendarStore

**Files:**
- Modify: `src/app/calendar/calendar.store.ts`
- Modify: `src/app/calendar/calendar.store.spec.ts`

- [ ] **Step 1: Write failing store tests for addField and updateField**

Add to the bottom of `src/app/calendar/calendar.store.spec.ts` (inside the outer `describe('CalendarStore', ...)`), and also update the `mockStorageService` at the top:

First, update the `mockStorageService` const at the top of the file:

```typescript
const mockStorageService = {
  loadYear: vi.fn().mockResolvedValue(null),
  saveYear: vi.fn().mockResolvedValue(undefined),
  loadSettings: vi.fn().mockResolvedValue({ customFields: [] }),
  saveSettings: vi.fn().mockResolvedValue(undefined),
};
```

Then add these describe blocks inside the outer `describe('CalendarStore', ...)`:

```typescript
describe('addField', () => {
  it('adds a new field and returns null on success', () => {
    const result = store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    expect(result).toBeNull();
    expect(store.customFields().length).toBe(1);
    expect(store.customFields()[0].label).toBe('Notes');
  });

  it('returns an error string when a duplicate label is added', () => {
    store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    const result = store.addField({ type: 'boolean', label: 'Notes', hidden: false, order: 1 });
    expect(result).toBeTypeOf('string');
    expect(store.customFields().length).toBe(1);
  });

  it('calls saveSettings after adding a field', () => {
    store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    expect(mockStorageService.saveSettings).toHaveBeenCalledOnce();
  });
});

describe('updateField', () => {
  it('updates the hidden property of a field', () => {
    store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    store.updateField('Notes', { hidden: true });
    expect(store.customFields()[0].hidden).toBe(true);
  });

  it('updates the order property of a field', () => {
    store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    store.updateField('Notes', { order: 5 });
    expect(store.customFields()[0].order).toBe(5);
  });

  it('calls saveSettings after updating a field', () => {
    store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    vi.clearAllMocks();
    store.updateField('Notes', { order: 1 });
    expect(mockStorageService.saveSettings).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "addField\|updateField\|FAIL\|Tests " /tmp/test-output.txt
```

Expected: FAIL — `addField` and `updateField` do not exist on the store yet.

- [ ] **Step 3: Update `calendar.store.ts`**

Replace the entire file with:

```typescript
import { computed, inject } from '@angular/core';
import { signalStore, withMethods, withState, patchState, withComputed } from '@ngrx/signals';
import { AppSettings, DayState, FieldDefinition, YearState } from '../models/app.model';
import { StorageService } from '../services/storage.service';

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function defaultYearState(year: number): YearState {
  return {
    months: Array.from({ length: 12 }, (_, monthIdx) => ({
      days: Array.from(
        { length: getDaysInMonth(year, monthIdx) },
        () => ({ score: null, comment: '', customFields: {} })
      ),
    })),
  };
}

interface StoreState {
  years: Record<number, YearState>;
  currentYear: number;
  customFields: FieldDefinition[];
}

function defaultState(): StoreState {
  const year = new Date().getFullYear();
  return {
    years: { [year]: defaultYearState(year) },
    currentYear: year,
    customFields: [],
  };
}

export const CalendarStore = signalStore(
  { providedIn: 'root' },
  withState<StoreState>(defaultState()),
  withComputed(({ years, currentYear }) => {
    const months = computed(() => years()[currentYear()]?.months ?? defaultYearState(currentYear()).months);
    return {
      months,
      monthStats: computed(() =>
        months().map(month => {
          const scoredDays = month.days.filter(day => day.score !== null);
          const total = scoredDays.reduce((sum, day) => sum + day.score!, 0);
          const average = scoredDays.length > 0 ? total / scoredDays.length : 0;
          return { total, average };
        })
      ),
    };
  }),
  withMethods(store => {
    const storageService = inject(StorageService);

    storageService.loadSettings().then((settings: AppSettings) => {
      patchState(store, { customFields: settings.customFields });
    });

    return {
      updateDay(monthIdx: number, dayIdx: number, update: Partial<DayState>) {
        const year = store.currentYear();
        const months = store.months().map((month, mIdx) => {
          if (mIdx === monthIdx) {
            const days = month.days.map((day, dIdx) =>
              dIdx === dayIdx ? { ...day, ...update } : day
            );
            return { ...month, days };
          }
          return month;
        });
        const yearState = { months };
        patchState(store, { years: { ...store.years(), [year]: yearState } });
        storageService.saveYear(year, yearState);
      },
      getDay(monthIdx: number, dayIdx: number) {
        return computed(() => store.months()[monthIdx].days[dayIdx]);
      },
      async setYear(year: number): Promise<void> {
        patchState(store, {
          currentYear: year,
          years: store.years()[year]
            ? store.years()
            : { ...store.years(), [year]: defaultYearState(year) },
        });
        const state = await storageService.loadYear(year);
        if (state) {
          patchState(store, { years: { ...store.years(), [year]: state } });
        }
      },
      hydrate(year: number, state: YearState) {
        patchState(store, { years: { ...store.years(), [year]: state } });
      },
      reset() {
        patchState(store, defaultState());
      },
      addField(def: FieldDefinition): string | null {
        const exists = store.customFields().some(f => f.label === def.label);
        if (exists) {
          return `A field named "${def.label}" already exists.`;
        }
        const updated = [...store.customFields(), def];
        patchState(store, { customFields: updated });
        storageService.saveSettings({ customFields: updated });
        return null;
      },
      updateField(label: string, update: Partial<Omit<FieldDefinition, 'label' | 'type'>>) {
        const updated = store.customFields().map(f =>
          f.label === label ? { ...f, ...update } : f
        );
        patchState(store, { customFields: updated });
        storageService.saveSettings({ customFields: updated });
      },
    };
  })
);
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "FAIL\|Tests " /tmp/test-output.txt
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/calendar/calendar.store.ts src/app/calendar/calendar.store.spec.ts
git commit -m "feat: add customFields state, addField, and updateField to CalendarStore"
```

---

## Task 4: Create Settings Dialog Component

**Files:**
- Create: `src/app/settings-dialog/settings-dialog.ts`
- Create: `src/app/settings-dialog/settings-dialog.html`
- Create: `src/app/settings-dialog/settings-dialog.scss`

- [ ] **Step 1: Write the failing settings dialog test**

Create `src/app/settings-dialog/settings-dialog.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SettingsDialog } from './settings-dialog';
import { CalendarStore } from '../calendar/calendar.store';
import { StorageService } from '../services/storage.service';

describe('SettingsDialog', () => {
  let component: SettingsDialog;
  let fixture: ComponentFixture<SettingsDialog>;
  let store: InstanceType<typeof CalendarStore>;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
    loadSettings: vi.fn().mockResolvedValue({ customFields: [] }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [SettingsDialog],
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();

    store = TestBed.inject(CalendarStore);
    fixture = TestBed.createComponent(SettingsDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows an inline error when adding a field with a duplicate label', () => {
    store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    fixture.detectChanges();

    component.newLabel = 'Notes';
    component.newType = 'text';
    component.newOrder = 1;
    component.submitAddField();
    fixture.detectChanges();

    expect(component.addError()).toContain('Notes');
    const errorEl = fixture.nativeElement.querySelector('.add-error');
    expect(errorEl).toBeTruthy();
  });

  it('clears the error and resets the form on successful add', () => {
    store.addField({ type: 'text', label: 'Notes', hidden: false, order: 0 });
    component.newLabel = 'Notes';
    component.submitAddField();
    fixture.detectChanges();

    component.newLabel = 'Energy';
    component.newType = 'number';
    component.newRangeMin = 1;
    component.newRangeMax = 10;
    component.newOrder = 1;
    component.submitAddField();
    fixture.detectChanges();

    expect(component.addError()).toBeNull();
    expect(component.newLabel).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "SettingsDialog\|FAIL\|Tests " /tmp/test-output.txt
```

Expected: FAIL — `SettingsDialog` module not found.

- [ ] **Step 3: Create `settings-dialog.ts`**

```typescript
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarStore } from '../calendar/calendar.store';
import { FieldDefinition, FieldType, isNumberField } from '../models/app.model';

@Component({
  selector: 'app-settings-dialog',
  imports: [FormsModule],
  templateUrl: './settings-dialog.html',
  styleUrl: './settings-dialog.scss',
})
export class SettingsDialog {
  readonly calendarStore = inject(CalendarStore);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  readonly sortedFields = computed(() =>
    [...this.calendarStore.customFields()].sort((a, b) => a.order - b.order)
  );

  readonly addError = signal<string | null>(null);

  newLabel = '';
  newType: FieldType = 'text';
  newRangeMin = 0;
  newRangeMax = 10;
  newOrder = 0;

  readonly isNumberField = isNumberField;

  open(): void {
    this.dialogRef()?.nativeElement.showModal();
  }

  close(): void {
    this.dialogRef()?.nativeElement.close();
  }

  submitAddField(): void {
    const def = this.buildFieldDef();
    const error = this.calendarStore.addField(def);
    if (error) {
      this.addError.set(error);
      return;
    }
    this.addError.set(null);
    this.resetForm();
  }

  updateOrder(label: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.calendarStore.updateField(label, { order: value });
  }

  updateHidden(label: string, event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.calendarStore.updateField(label, { hidden: value });
  }

  private buildFieldDef(): FieldDefinition {
    const base = { label: this.newLabel, hidden: false, order: this.newOrder };
    if (this.newType === 'number') {
      return { ...base, type: 'number', range: [this.newRangeMin, this.newRangeMax] as [number, number] };
    }
    if (this.newType === 'boolean') {
      return { ...base, type: 'boolean' };
    }
    return { ...base, type: 'text' };
  }

  private resetForm(): void {
    this.newLabel = '';
    this.newType = 'text';
    this.newRangeMin = 0;
    this.newRangeMax = 10;
    this.newOrder = 0;
  }
}
```

- [ ] **Step 4: Create `settings-dialog.html`**

```html
<dialog #dialog>
  <div class="settings-header">
    <h2>Settings</h2>
    <button class="close-btn" (click)="close()">×</button>
  </div>

  <div class="settings-body">
    <h3>Custom Fields</h3>

    @if (sortedFields().length > 0) {
      <table class="fields-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Type</th>
            <th>Order</th>
            <th>Hidden</th>
          </tr>
        </thead>
        <tbody>
          @for (field of sortedFields(); track field.label) {
            <tr>
              <td>{{ field.label }}</td>
              <td>{{ field.type }}</td>
              <td>
                <input
                  type="number"
                  [value]="field.order"
                  (change)="updateOrder(field.label, $event)"
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  [checked]="field.hidden"
                  (change)="updateHidden(field.label, $event)"
                />
              </td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <p class="no-fields">No custom fields yet.</p>
    }

    <h3>Add Field</h3>
    <div class="add-field-form">
      <label>
        Label:
        <input type="text" [(ngModel)]="newLabel" />
      </label>
      <label>
        Type:
        <select [(ngModel)]="newType">
          <option value="text">text</option>
          <option value="boolean">boolean</option>
          <option value="number">number</option>
        </select>
      </label>
      @if (newType === 'number') {
        <label>
          Range min:
          <input type="number" [(ngModel)]="newRangeMin" />
        </label>
        <label>
          Range max:
          <input type="number" [(ngModel)]="newRangeMax" />
        </label>
      }
      <label>
        Order:
        <input type="number" [(ngModel)]="newOrder" />
      </label>
      <button (click)="submitAddField()">Add Field</button>
      @if (addError()) {
        <p class="add-error">{{ addError() }}</p>
      }
    </div>
  </div>
</dialog>
```

- [ ] **Step 5: Create `settings-dialog.scss`**

```scss
dialog {
  border-radius: 8px;
  border: 1px solid #ccc;
  padding: 0;
  min-width: 500px;

  &::backdrop {
    background: rgba(0, 0, 0, 0.4);
  }
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;

  h2 {
    margin: 0;
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.settings-body {
  padding: 16px;
}

.fields-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;

  th, td {
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  input[type="number"] {
    width: 60px;
  }
}

.no-fields {
  color: #888;
  margin-bottom: 16px;
}

.add-field-form {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.add-error {
  color: red;
  margin: 0;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "FAIL\|Tests " /tmp/test-output.txt
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/settings-dialog/
git commit -m "feat: add SettingsDialog component for managing custom field definitions"
```

---

## Task 5: Add Settings Button to Calendar Header

**Files:**
- Modify: `src/app/calendar/calendar.ts`
- Modify: `src/app/calendar/calendar.html`

- [ ] **Step 1: Update `calendar.ts`**

Add `SettingsDialog` to imports and add `openSettings()`:

```typescript
import { Component, ElementRef, inject, viewChild, DOCUMENT } from '@angular/core';
import { CalendarStore } from './calendar.store';
import { Month } from '../month/month';
import { CsvImportService } from '../services/csv-import.service';
import { StorageService } from '../services/storage.service';
import { DayPopup } from '../day-popup/day-popup';
import { SettingsDialog } from '../settings-dialog/settings-dialog';

@Component({
  selector: 'app-calendar',
  imports: [Month, DayPopup, SettingsDialog],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  private readonly csvImport = inject(CsvImportService);
  private readonly storage = inject(StorageService);
  private readonly document = inject(DOCUMENT);
  readonly store = inject(CalendarStore);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly popup = viewChild(DayPopup);
  readonly settingsDialog = viewChild(SettingsDialog);

  readonly currentYear = this.store.currentYear;

  triggerImport(): void {
    this.fileInput()?.nativeElement.click();
  }

  openPopup(): void {
    const today = new Date();
    if (this.store.currentYear() !== today.getFullYear()) {
      this.store.setYear(today.getFullYear());
    }
    this.popup()?.open();
    setTimeout(() => {
      this.document.querySelector('.is-today')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  openDay(e: { monthIndex: number; dayIndex: number }): void {
    this.popup()?.open(e.monthIndex, e.dayIndex);
  }

  openSettings(): void {
    this.settingsDialog()?.open();
  }

  prevYear(): void {
    this.store.setYear(this.store.currentYear() - 1);
  }

  nextYear(): void {
    this.store.setYear(this.store.currentYear() + 1);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = this.csvImport.parse(text);
    if (!result) return;

    await this.storage.saveYear(result.year, result.state);
    this.store.hydrate(result.year, result.state);
    input.value = '';
  }
}
```

- [ ] **Step 2: Update `calendar.html`**

```html
<div class="calendar-container">
  <div class="calendar-header">
    <h2>
      <button (click)="prevYear()">‹</button>
      Year: {{ currentYear() }}
      <button (click)="nextYear()">›</button>
    </h2>
    <button (click)="openPopup()">Today</button>
    <button (click)="triggerImport()">Import CSV</button>
    <button (click)="openSettings()">Settings</button>
    <input #fileInput type="file" accept=".csv" style="display: none" (change)="onFileSelected($event)">
  </div>
  <div class="months-list">
    @for (month of months; track month; let i = $index) {
      <app-month [monthName]="month" [monthIndex]="i" [year]="currentYear()" (dayClick)="openDay($event)"></app-month>
    }
  </div>
  <app-day-popup />
  <app-settings-dialog />
</div>
```

- [ ] **Step 3: Run all tests**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "FAIL\|Tests " /tmp/test-output.txt
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/calendar/calendar.ts src/app/calendar/calendar.html
git commit -m "feat: add Settings button to calendar header"
```

---

## Task 6: Update DayEditor for Custom Fields

**Files:**
- Modify: `src/app/day-editor/day-editor.ts`
- Modify: `src/app/day-editor/day-editor.html`
- Modify: `src/app/day-editor/day-editor.spec.ts`

- [ ] **Step 1: Update the mock in `day-editor.spec.ts` and add a custom fields test**

Update `mockStorageService` in `day-editor.spec.ts`:

```typescript
const mockStorageService = {
  loadYear: vi.fn().mockResolvedValue(null),
  saveYear: vi.fn().mockResolvedValue(undefined),
  loadSettings: vi.fn().mockResolvedValue({ customFields: [] }),
  saveSettings: vi.fn().mockResolvedValue(undefined),
};
```

Update the existing `'save() calls calendarStore.updateDay with form values'` test — it now needs to expect `customFields`:

```typescript
it('save() calls calendarStore.updateDay with form values', () => {
  const updateSpy = vi.spyOn(component.calendarStore, 'updateDay');
  component.form.setValue({ score: 2, comment: 'nice' });
  component.save();
  expect(updateSpy).toHaveBeenCalledWith(0, 0, { score: 2, comment: 'nice', customFields: {} });
});
```

Add a new test for hidden field value preservation:

```typescript
it('save() preserves hidden custom field values from dayState', () => {
  // Set up a day that already has a custom field value
  component.calendarStore.updateDay(0, 0, {
    score: 1,
    comment: '',
    customFields: { Energy: 8, Notes: 'hello' },
  });
  // Add a hidden field definition for 'Energy'
  component.calendarStore.addField({ type: 'number', label: 'Energy', hidden: true, order: 0, range: [0, 10] });
  // Add a visible field definition for 'Notes'
  component.calendarStore.addField({ type: 'text', label: 'Notes', hidden: false, order: 1 });
  fixture.detectChanges();

  const updateSpy = vi.spyOn(component.calendarStore, 'updateDay');
  component.form.setValue({ score: 2, comment: 'updated' });
  component.save();

  const [, , update] = updateSpy.mock.calls[0];
  expect(update.customFields['Energy']).toBe(8);
  expect(update.customFields['Notes']).toBe('hello');
});
```

- [ ] **Step 2: Run tests to verify the new test fails**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "preserves hidden\|FAIL\|Tests " /tmp/test-output.txt
```

Expected: the new test FAIL, existing tests still PASS (after mock update).

- [ ] **Step 3: Update `day-editor.ts`**

```typescript
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CalendarStore } from '../calendar/calendar.store';
import { isBooleanField, isNumberField, isTextField, Score, isScore } from '../models/app.model';
import { scoreClass as getScoreClass } from '../day/day';

@Component({
  selector: 'app-day-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './day-editor.html',
  styleUrl: './day-editor.scss',
})
export class DayEditor {
  dayNumber = input<number>(1);
  monthIndex = input<number>(0);
  dayIndex = input<number>(0);

  saved = output<void>();
  dirtyChange = output<boolean>();

  commentInput = viewChild<ElementRef<HTMLTextAreaElement>>('commentInput');

  readonly calendarStore = inject(CalendarStore);
  private readonly fb = inject(FormBuilder);

  readonly isTextField = isTextField;
  readonly isBooleanField = isBooleanField;
  readonly isNumberField = isNumberField;

  readonly dayState = computed(() =>
    this.calendarStore.months()[this.monthIndex()].days[this.dayIndex()]
  );
  readonly scoreClass = computed(() => getScoreClass(this.dayState().score));

  readonly visibleFields = computed(() =>
    this.calendarStore.customFields()
      .filter(f => !f.hidden)
      .sort((a, b) => a.order - b.order)
  );

  readonly customFieldValues = signal<Record<string, string | boolean | number>>({});

  readonly form = this.fb.group({
    score: [0],
    comment: [''],
  });

  constructor() {
    effect(() => {
      const day = this.dayState();
      this.form.setValue(
        { score: day.score ?? 0, comment: day.comment },
        { emitEvent: false }
      );

      // Build customFieldValues: start with all existing values (includes hidden fields),
      // then fill in defaults for visible fields that are missing keys.
      const existing = day.customFields ?? {};
      const vals: Record<string, string | boolean | number> = { ...existing };
      for (const field of this.visibleFields()) {
        if (!(field.label in vals)) {
          if (isTextField(field)) {
            vals[field.label] = '';
          } else if (isBooleanField(field)) {
            vals[field.label] = false;
          } else if (isNumberField(field)) {
            vals[field.label] = field.range[0];
          }
        }
      }
      this.customFieldValues.set(vals);

      this.form.markAsPristine();
      this.dirtyChange.emit(false);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.dirtyChange.emit(this.form.dirty);
    });
  }

  focusComment() {
    this.commentInput()?.nativeElement.focus();
  }

  onCustomFieldChange(label: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const field = this.calendarStore.customFields().find(f => f.label === label);
    if (!field) return;

    let value: string | boolean | number;
    if (isBooleanField(field)) {
      value = input.checked;
    } else if (isNumberField(field)) {
      value = Number(input.value);
    } else {
      value = input.value;
    }

    this.customFieldValues.update(vals => ({ ...vals, [label]: value }));
    this.dirtyChange.emit(true);
  }

  save(): void {
    const score = this.form.value.score ?? 0;
    const comment = this.form.value.comment ?? '';
    if (!isScore(score)) return;
    this.calendarStore.updateDay(this.monthIndex(), this.dayIndex(), {
      score: score as Score,
      comment,
      customFields: this.customFieldValues(),
    });
    this.saved.emit();
  }
}
```

- [ ] **Step 4: Update `day-editor.html`**

```html
<div class="day-container {{ scoreClass() }}">
  <div class="day-number">{{ dayNumber() }}</div>
  <form [formGroup]="form">
    <label>
      Score (-3 to +3):
      <input type="number" formControlName="score" min="-3" max="3" />
    </label>
    <label>
      Comment:
      <textarea class="comment-input" formControlName="comment" #commentInput></textarea>
    </label>
    @for (field of visibleFields(); track field.label) {
      <label>
        {{ field.label }}:
        @if (isTextField(field)) {
          <input
            type="text"
            [value]="customFieldValues()[field.label] ?? ''"
            (input)="onCustomFieldChange(field.label, $event)"
          />
        }
        @if (isBooleanField(field)) {
          <input
            type="checkbox"
            [checked]="customFieldValues()[field.label]"
            (change)="onCustomFieldChange(field.label, $event)"
          />
        }
        @if (isNumberField(field)) {
          <input
            type="number"
            [value]="customFieldValues()[field.label] ?? field.range[0]"
            [min]="field.range[0]"
            [max]="field.range[1]"
            (input)="onCustomFieldChange(field.label, $event)"
          />
        }
      </label>
    }
  </form>
</div>
```

- [ ] **Step 5: Run all tests**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "FAIL\|Tests " /tmp/test-output.txt
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/day-editor/day-editor.ts src/app/day-editor/day-editor.html src/app/day-editor/day-editor.spec.ts
git commit -m "feat: render custom fields in day editor below comment"
```

---

## Done

All six tasks complete. The feature is fully implemented:
- Custom field types and predicates in the data model
- Settings persisted separately from year data
- CalendarStore manages global field definitions with duplicate-label protection
- Settings dialog lets users add fields and toggle visibility/order
- Day editor renders non-hidden fields and preserves all custom field values on save
