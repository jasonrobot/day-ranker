# Firebase Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase Auth (Google sign-in) and Firestore persistence to day-ranker, with localStorage as a write-through cache and offline fallback.

**Architecture:** Three new services (`AuthService`, `StorageService`, `SyncService`) sit alongside the existing `CalendarStore`. `CalendarStore` calls `StorageService.saveYear()` after every `updateDay()`. `SyncService` reacts to auth state changes to hydrate or reset the store. The `App` component conditionally renders a login screen or calendar based on auth state.

**Tech Stack:** Angular 21, NgRx Signals, Firebase JS SDK v10+ (no AngularFire), Vitest

---

## File Map

**New files:**
- `src/environments/environment.ts` — Firebase config, dev (placeholder values)
- `src/environments/environment.prod.ts` — Firebase config, prod (placeholder values)
- `src/app/firebase.ts` — Firebase app + Auth + Firestore InjectionTokens
- `src/app/services/auth.service.ts` — Google sign-in/out, user signal, error signal
- `src/app/services/auth.service.spec.ts`
- `src/app/services/storage.service.ts` — Write-through localStorage + Firestore reads/writes
- `src/app/services/storage.service.spec.ts`
- `src/app/services/sync.service.ts` — Auth state listener → hydrate/reset CalendarStore
- `src/app/services/sync.service.spec.ts`
- `src/app/calendar/calendar.store.spec.ts` — Dedicated store unit tests
- `src/app/login/login.ts` — Login component
- `src/app/login/login.html`
- `src/app/login/login.scss`

**Modified files:**
- `package.json` — add `firebase`
- `angular.json` — add `fileReplacements` for prod environment
- `src/app/calendar/calendar.store.ts` — add `hydrate()`, `reset()`, inject `StorageService`, call `saveYear()` in `updateDay()`
- `src/app/calendar/calendar.spec.ts` — provide `CalendarStore` explicitly, add mock `StorageService`
- `src/app/day/day.spec.ts` — add mock `StorageService`
- `src/app/month/month.spec.ts` — add mock `StorageService`
- `src/app/calendar/calendar.ts` — remove `providers: [CalendarStore]`
- `src/app/app.ts` — inject `AuthService` + `SyncService`, conditional render
- `src/app/app.html` — conditional login/calendar template
- `src/app/app.config.ts` — add `CalendarStore` to root providers

---

## Task 1: Install Firebase and Create Environment Files

**Files:**
- Create: `src/environments/environment.ts`
- Create: `src/environments/environment.prod.ts`
- Create: `src/app/firebase.ts`
- Modify: `package.json`
- Modify: `angular.json`

- [ ] **Step 1: Install the Firebase SDK**

```bash
npm install firebase
```

Expected: `firebase` appears in `dependencies` in `package.json`.

- [ ] **Step 2: Create the dev environment file**

Create `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_DEV_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
};
```

> **Action required:** After creating a Firebase project at console.firebase.google.com, replace the placeholder values with your real project config. Enable Google sign-in under Authentication → Sign-in method. Enable Firestore under Firestore Database.

- [ ] **Step 3: Create the prod environment file**

Create `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  firebase: {
    apiKey: 'YOUR_PROD_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
};
```

- [ ] **Step 4: Add fileReplacements to angular.json for the prod build**

In `angular.json`, find the `"production"` configuration under `projects.<name>.architect.build.configurations` and add `fileReplacements`:

```json
"production": {
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.prod.ts"
    }
  ],
  "budgets": [...]
}
```

- [ ] **Step 5: Create Firebase InjectionTokens**

Create `src/app/firebase.ts`:

```typescript
import { InjectionToken, inject } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp', {
  providedIn: 'root',
  factory: () => initializeApp(environment.firebase),
});

export const FIREBASE_AUTH = new InjectionToken<Auth>('FirebaseAuth', {
  providedIn: 'root',
  factory: () => getAuth(inject(FIREBASE_APP)),
});

export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('FirebaseFirestore', {
  providedIn: 'root',
  factory: () => getFirestore(inject(FIREBASE_APP)),
});
```

- [ ] **Step 6: Commit**

```bash
git add src/environments/ src/app/firebase.ts package.json package-lock.json angular.json
git commit -m "feat: install Firebase SDK and create environment config"
```

---

## Task 2: AuthService (TDD)

**Files:**
- Create: `src/app/services/auth.service.spec.ts`
- Create: `src/app/services/auth.service.ts`

- [ ] **Step 1: Create the services directory and write the failing tests**

```bash
mkdir -p src/app/services
```

Create `src/app/services/auth.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FIREBASE_AUTH } from '../firebase';

const { mockOnAuthStateChanged, mockSignInWithPopup, mockSignOut } = vi.hoisted(() => ({
  mockOnAuthStateChanged: vi.fn(),
  mockSignInWithPopup: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mockOnAuthStateChanged,
  signInWithPopup: mockSignInWithPopup,
  signOut: mockSignOut,
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({})),
}));

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let authStateCallback: (user: { uid: string; email: string } | null) => void;

  beforeEach(() => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: typeof authStateCallback) => {
      authStateCallback = callback;
      return vi.fn();
    });
    mockSignInWithPopup.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: FIREBASE_AUTH, useValue: {} },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('initializes user as null', () => {
    expect(service.user()).toBeNull();
  });

  it('updates user signal when auth state changes to a user', () => {
    const mockUser = { uid: 'user123', email: 'test@example.com' };
    authStateCallback(mockUser);
    expect(service.user()).toEqual(mockUser);
  });

  it('sets user to null when auth state changes to null', () => {
    authStateCallback({ uid: 'user123', email: 'test@example.com' });
    authStateCallback(null);
    expect(service.user()).toBeNull();
  });

  it('calls signInWithPopup with a GoogleAuthProvider on signInWithGoogle', async () => {
    await service.signInWithGoogle();
    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
  });

  it('clears signInError on a successful sign-in', async () => {
    await service.signInWithGoogle();
    expect(service.signInError()).toBeNull();
  });

  it('sets signInError message on popup failure', async () => {
    mockSignInWithPopup.mockRejectedValue(new Error('popup closed'));
    await service.signInWithGoogle();
    expect(service.signInError()).toBe('Sign in failed, please try again');
  });

  it('calls Firebase signOut on signOut()', async () => {
    await service.signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — `AuthService` does not exist yet.

- [ ] **Step 3: Implement AuthService**

Create `src/app/services/auth.service.ts`:

```typescript
import { Injectable, inject, signal } from '@angular/core';
import { User, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly _user = signal<User | null>(null);
  private readonly _signInError = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly signInError = this._signInError.asReadonly();

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this._user.set(user);
    });
  }

  async signInWithGoogle(): Promise<void> {
    this._signInError.set(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
    } catch {
      this._signInError.set('Sign in failed, please try again');
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npm test
```

Expected: all AuthService tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/auth.service.ts src/app/services/auth.service.spec.ts
git commit -m "feat: add AuthService with Google sign-in and user signal"
```

---

## Task 3: StorageService (TDD)

**Files:**
- Create: `src/app/services/storage.service.spec.ts`
- Create: `src/app/services/storage.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/services/storage.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { FIREBASE_FIRESTORE } from '../firebase';
import { AuthService } from './auth.service';
import { YearState } from '../models/app.model';

const { mockGetDoc, mockSetDoc, mockDoc } = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockDoc: vi.fn().mockReturnValue('mock-doc-ref'),
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
}));

import { StorageService } from './storage.service';

const CURRENT_YEAR = new Date().getFullYear();

const mockYearState: YearState = {
  months: Array.from({ length: 12 }, () => ({
    days: [{ score: 1, comment: 'test' }],
  })),
};

describe('StorageService', () => {
  let service: StorageService;
  const mockUserSignal = signal<{ uid: string } | null>({ uid: 'user123' });

  const mockAuthService = {
    user: mockUserSignal.asReadonly(),
  };

  beforeEach(() => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        { provide: FIREBASE_FIRESTORE, useValue: {} },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadYear', () => {
    it('returns null when no data exists in Firestore or localStorage', async () => {
      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toBeNull();
    });

    it('returns data from Firestore when available', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockYearState,
      });

      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toEqual(mockYearState);
    });

    it('falls back to localStorage when Firestore throws', async () => {
      mockGetDoc.mockRejectedValue(new Error('network error'));
      localStorage.setItem(`day-ranker:user123:${CURRENT_YEAR}`, JSON.stringify(mockYearState));

      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toEqual(mockYearState);
    });

    it('returns null when Firestore throws and localStorage is empty', async () => {
      mockGetDoc.mockRejectedValue(new Error('network error'));

      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toBeNull();
    });

    it('returns null when user is not logged in', async () => {
      mockUserSignal.set(null);
      const result = await service.loadYear(CURRENT_YEAR);
      expect(result).toBeNull();
      mockUserSignal.set({ uid: 'user123' });
    });
  });

  describe('saveYear', () => {
    it('writes to localStorage synchronously with the correct key', async () => {
      await service.saveYear(CURRENT_YEAR, mockYearState);

      const stored = localStorage.getItem(`day-ranker:user123:${CURRENT_YEAR}`);
      expect(JSON.parse(stored!)).toEqual(mockYearState);
    });

    it('calls setDoc with the correct Firestore path', async () => {
      await service.saveYear(CURRENT_YEAR, mockYearState);

      expect(mockDoc).toHaveBeenCalledWith({}, `users/user123/years/${CURRENT_YEAR}`);
      expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', mockYearState);
    });

    it('does nothing when user is not logged in', async () => {
      mockUserSignal.set(null);
      await service.saveYear(CURRENT_YEAR, mockYearState);
      expect(mockSetDoc).not.toHaveBeenCalled();
      mockUserSignal.set({ uid: 'user123' });
    });
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — `StorageService` does not exist yet.

- [ ] **Step 3: Implement StorageService**

Create `src/app/services/storage.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../firebase';
import { AuthService } from './auth.service';
import { YearState } from '../models/app.model';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);
  private readonly authService = inject(AuthService);

  private localKey(uid: string, year: number): string {
    return `day-ranker:${uid}:${year}`;
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
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npm test
```

Expected: all StorageService tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/storage.service.ts src/app/services/storage.service.spec.ts
git commit -m "feat: add StorageService with write-through localStorage and Firestore"
```

---

## Task 4: Update CalendarStore (TDD)

Add `hydrate()` and `reset()` methods, inject `StorageService`, and call `saveYear()` in `updateDay()`. Then move the store to root-level provision and update all affected tests.

**Files:**
- Create: `src/app/calendar/calendar.store.spec.ts`
- Modify: `src/app/calendar/calendar.store.ts`
- Modify: `src/app/calendar/calendar.ts`
- Modify: `src/app/calendar/calendar.spec.ts`
- Modify: `src/app/day/day.spec.ts`
- Modify: `src/app/month/month.spec.ts`

- [ ] **Step 1: Write failing tests for hydrate(), reset(), and saveYear() call**

Create `src/app/calendar/calendar.store.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CalendarStore } from './calendar.store';
import { StorageService } from '../services/storage.service';
import { YearState } from '../models/app.model';

const CURRENT_YEAR = new Date().getFullYear();

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

describe('CalendarStore', () => {
  let store: InstanceType<typeof CalendarStore>;
  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    });
    store = TestBed.inject(CalendarStore);
  });

  describe('hydrate', () => {
    it('replaces all months with the provided state', () => {
      const state: YearState = {
        months: Array.from({ length: 12 }, () => ({
          days: [{ score: 2, comment: 'loaded' }],
        })),
      };

      store.hydrate(state);

      expect(store.months()[0].days[0].score).toBe(2);
      expect(store.months()[0].days[0].comment).toBe('loaded');
    });
  });

  describe('reset', () => {
    it('restores all day scores to 0 and comments to empty string', () => {
      store.updateDay(0, 0, { score: 3, comment: 'test' });
      store.reset();

      expect(store.months()[0].days[0].score).toBe(0);
      expect(store.months()[0].days[0].comment).toBe('');
    });

    it('restores the correct number of days per month', () => {
      store.reset();

      store.months().forEach((month, monthIdx) => {
        expect(month.days.length).toBe(getDaysInMonth(CURRENT_YEAR, monthIdx));
      });
    });
  });

  describe('updateDay', () => {
    it('calls storageService.saveYear with the correct year after updating a day', () => {
      store.updateDay(0, 0, { score: 2 });

      expect(mockStorageService.saveYear).toHaveBeenCalledOnce();
      const [year] = mockStorageService.saveYear.mock.calls[0];
      expect(year).toBe(CURRENT_YEAR);
    });

    it('calls storageService.saveYear with the updated state', () => {
      store.updateDay(1, 2, { score: -1, comment: 'bad day' });

      const [year, state] = mockStorageService.saveYear.mock.calls[0];
      expect(year).toBe(CURRENT_YEAR);
      expect(state.months[1].days[2].score).toBe(-1);
      expect(state.months[1].days[2].comment).toBe('bad day');
    });
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — `hydrate`, `reset` methods don't exist; `saveYear` is not called.

- [ ] **Step 3: Update CalendarStore**

Replace `src/app/calendar/calendar.store.ts`:

```typescript
import { computed, inject } from '@angular/core';
import { signalStore, withMethods, withState, patchState, withComputed } from '@ngrx/signals';
import { DayState, Score, YearState } from '../models/app.model';
import { StorageService } from '../services/storage.service';

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function defaultYearState(): YearState {
  const year = new Date().getFullYear();
  return {
    months: Array.from({ length: 12 }, (_, monthIdx) => ({
      days: Array.from(
        { length: getDaysInMonth(year, monthIdx) },
        () => ({ score: 0 as Score, comment: '' })
      ),
    })),
  };
}

export const CalendarStore = signalStore(
  { providedIn: 'root' },
  withState<YearState>(defaultYearState),
  withComputed(({ months }) => ({
    monthStats: computed(() =>
      months().map(month => {
        const total = month.days.reduce((sum, day) => sum + day.score, 0);
        const average = month.days.length > 0 ? total / month.days.length : 0;
        return { total, average };
      })
    ),
  })),
  withMethods(store => {
    const storageService = inject(StorageService);
    const currentYear = new Date().getFullYear();
    return {
      updateDay(monthIdx: number, dayIdx: number, update: Partial<DayState>) {
        const months = store.months().map((month, mIdx) => {
          if (mIdx === monthIdx) {
            const days = month.days.map((day, dIdx) =>
              dIdx === dayIdx ? { ...day, ...update } : day
            );
            return { ...month, days };
          }
          return month;
        });
        patchState(store, { months });
        storageService.saveYear(currentYear, { months });
      },
      getDay(monthIdx: number, dayIdx: number) {
        return computed(() => store.months()[monthIdx].days[dayIdx]);
      },
      hydrate(state: YearState) {
        patchState(store, { months: state.months });
      },
      reset() {
        patchState(store, defaultYearState());
      },
    };
  })
);
```

Note: `{ providedIn: 'root' }` is added so the store is a singleton across the app.

- [ ] **Step 4: Remove CalendarStore from Calendar component's providers**

In `src/app/calendar/calendar.ts`, remove `providers: [CalendarStore]`:

```typescript
import { Component } from '@angular/core';
import { Month } from '../month/month';

@Component({
  selector: 'app-calendar',
  imports: [Month],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  currentYear = new Date().getFullYear();
}
```

- [ ] **Step 5: Update calendar.spec.ts to provide CalendarStore and mock StorageService**

Replace `src/app/calendar/calendar.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Calendar } from './calendar';
import { Month } from '../month/month';
import { CalendarStore } from './calendar.store';
import { StorageService } from '../services/storage.service';

describe('Calendar', () => {
  let component: Calendar;
  let fixture: ComponentFixture<Calendar>;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Calendar, Month],
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Calendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 12 months', () => {
    expect(component.months).toHaveLength(12);
  });

  it('should have correct month names', () => {
    const expectedMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    expect(component.months).toEqual(expectedMonths);
  });

  it('should set currentYear to the current year', () => {
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  it('should render calendar container', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.calendar-container')).toBeTruthy();
  });

  it('should display the current year in the heading', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const heading = el.querySelector('h2') as HTMLElement;
    expect(heading.textContent).toContain(`Year: ${component.currentYear}`);
  });

  it('should render 12 month components', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-month')).toHaveLength(12);
  });
});
```

- [ ] **Step 6: Update day.spec.ts to provide mock StorageService**

In `src/app/day/day.spec.ts`, add the mock StorageService import and provider. Replace the `beforeEach` block:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Day } from './day';
import { CalendarStore } from '../calendar/calendar.store';
import { StorageService } from '../services/storage.service';

describe('Day', () => {
  let component: Day;
  let fixture: ComponentFixture<Day>;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Day],
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Day);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default inputs', () => {
    expect(component.dayNumber()).toBe(1);
    expect(component.monthIndex()).toBe(0);
    expect(component.dayIndex()).toBe(0);
  });

  it('should have dayState with default score of 0', () => {
    expect(component.dayState().score).toBe(0);
    expect(component.dayState().comment).toBe('');
  });

  it('should return correct scoreClass for score 0', () => {
    expect(component.scoreClass()).toBe('');
  });

  it('should return correct scoreClass for positive scores', () => {
    component.calendarStore.updateDay(0, 0, { score: 1 });
    expect(component.scoreClass()).toBe('score-plus1');

    component.calendarStore.updateDay(0, 0, { score: 2 });
    expect(component.scoreClass()).toBe('score-plus2');

    component.calendarStore.updateDay(0, 0, { score: 3 });
    expect(component.scoreClass()).toBe('score-plus3');
  });

  it('should return correct scoreClass for negative scores', () => {
    component.calendarStore.updateDay(0, 0, { score: -1 });
    expect(component.scoreClass()).toBe('score-minus1');

    component.calendarStore.updateDay(0, 0, { score: -2 });
    expect(component.scoreClass()).toBe('score-minus2');

    component.calendarStore.updateDay(0, 0, { score: -3 });
    expect(component.scoreClass()).toBe('score-minus3');
  });

  it('should update day score via setScore', () => {
    component.setScore({ target: { value: '2' } });
    expect(component.dayState().score).toBe(2);
  });

  it('should update day comment via setComment', () => {
    component.setComment({ target: { value: 'Test comment' } });
    expect(component.dayState().comment).toBe('Test comment');
  });

  it('should not update score if value is out of range', () => {
    component.setScore({ target: { value: '5' } });
    expect(component.dayState().score).toBe(0);
  });
});
```

- [ ] **Step 7: Update month.spec.ts to provide mock StorageService**

Replace `src/app/month/month.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Month } from './month';
import { CalendarStore } from '../calendar/calendar.store';
import { StorageService } from '../services/storage.service';

describe('Month', () => {
  let component: Month;
  let fixture: ComponentFixture<Month>;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Month],
      providers: [
        CalendarStore,
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Month);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

- [ ] **Step 8: Run all tests and confirm they pass**

```bash
npm test
```

Expected: all tests PASS including the new CalendarStore spec.

- [ ] **Step 9: Commit**

```bash
git add src/app/calendar/calendar.store.ts src/app/calendar/calendar.store.spec.ts \
        src/app/calendar/calendar.ts src/app/calendar/calendar.spec.ts \
        src/app/day/day.spec.ts src/app/month/month.spec.ts
git commit -m "feat: add hydrate/reset to CalendarStore and wire StorageService"
```

---

## Task 5: SyncService (TDD)

**Files:**
- Create: `src/app/services/sync.service.spec.ts`
- Create: `src/app/services/sync.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/services/sync.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { CalendarStore } from '../calendar/calendar.store';
import { SyncService } from './sync.service';
import { YearState } from '../models/app.model';

const CURRENT_YEAR = new Date().getFullYear();

const mockYearState: YearState = {
  months: Array.from({ length: 12 }, () => ({
    days: [{ score: 1, comment: 'loaded' }],
  })),
};

describe('SyncService', () => {
  let service: SyncService;

  const mockStorageService = {
    loadYear: vi.fn().mockResolvedValue(null),
    saveYear: vi.fn().mockResolvedValue(undefined),
  };

  const mockCalendarStore = {
    hydrate: vi.fn(),
    reset: vi.fn(),
  };

  const mockAuthService = {
    user: vi.fn().mockReturnValue(null),
  };

  beforeEach(() => {
    mockStorageService.loadYear.mockResolvedValue(null);

    TestBed.configureTestingModule({
      providers: [
        SyncService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: CalendarStore, useValue: mockCalendarStore },
      ],
    });

    service = TestBed.inject(SyncService);
    // Clear calls that happened in the constructor (effect fires with null user → onLogout)
    vi.clearAllMocks();
    mockStorageService.loadYear.mockResolvedValue(null);
  });

  it('calls storageService.loadYear with current year on onLogin', async () => {
    await service.onLogin();
    expect(mockStorageService.loadYear).toHaveBeenCalledWith(CURRENT_YEAR);
  });

  it('calls calendarStore.hydrate when loadYear returns data', async () => {
    mockStorageService.loadYear.mockResolvedValue(mockYearState);
    await service.onLogin();
    expect(mockCalendarStore.hydrate).toHaveBeenCalledWith(mockYearState);
  });

  it('does not call calendarStore.hydrate when loadYear returns null', async () => {
    await service.onLogin();
    expect(mockCalendarStore.hydrate).not.toHaveBeenCalled();
  });

  it('calls calendarStore.reset on onLogout', () => {
    service.onLogout();
    expect(mockCalendarStore.reset).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — `SyncService` does not exist yet.

- [ ] **Step 3: Implement SyncService**

Create `src/app/services/sync.service.ts`:

```typescript
import { Injectable, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { CalendarStore } from '../calendar/calendar.store';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly authService = inject(AuthService);
  private readonly storageService = inject(StorageService);
  private readonly calendarStore = inject(CalendarStore);

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.onLogin();
      } else {
        this.onLogout();
      }
    });
  }

  async onLogin(): Promise<void> {
    const year = new Date().getFullYear();
    const state = await this.storageService.loadYear(year);
    if (state) {
      this.calendarStore.hydrate(state);
    }
  }

  onLogout(): void {
    this.calendarStore.reset();
  }
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npm test
```

Expected: all SyncService tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/sync.service.ts src/app/services/sync.service.spec.ts
git commit -m "feat: add SyncService to hydrate/reset store on auth state change"
```

---

## Task 6: Login Component

**Files:**
- Create: `src/app/login/login.ts`
- Create: `src/app/login/login.html`
- Create: `src/app/login/login.scss`

- [ ] **Step 1: Create the login component**

```bash
mkdir -p src/app/login
```

Create `src/app/login/login.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  protected readonly authService = inject(AuthService);

  async signIn(): Promise<void> {
    await this.authService.signInWithGoogle();
  }
}
```

- [ ] **Step 2: Create the login template**

Create `src/app/login/login.html`:

```html
<div class="login-container">
  <h1>Day Ranker</h1>
  <p>Track your days, one score at a time.</p>
  <button class="sign-in-btn" (click)="signIn()">Sign in with Google</button>
  @if (authService.signInError()) {
    <p class="error">{{ authService.signInError() }}</p>
  }
</div>
```

- [ ] **Step 3: Create the login styles**

Create `src/app/login/login.scss`:

```scss
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;

  h1 {
    font-size: 2rem;
    margin: 0;
  }

  p {
    color: #666;
    margin: 0;
  }

  .sign-in-btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;

    &:hover {
      background: #f5f5f5;
    }
  }

  .error {
    color: red;
    font-size: 0.875rem;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/login/
git commit -m "feat: add Login component with Google sign-in button"
```

---

## Task 7: Wire Up App Component and Config

**Files:**
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Update app.config.ts to provide CalendarStore**

Since `CalendarStore` is now `providedIn: 'root'` via the `{ providedIn: 'root' }` option in `signalStore()`, no explicit provider entry is needed in `appConfig`. However, `SyncService` must be eagerly instantiated at app startup — we do this by injecting it in the App component constructor.

Verify `src/app/app.config.ts` looks like this (no changes needed if CalendarStore has `providedIn: 'root'`):

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ],
};
```

- [ ] **Step 2: Update the App component**

Replace `src/app/app.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Calendar } from './calendar/calendar';
import { Login } from './login/login';
import { AuthService } from './services/auth.service';
import { SyncService } from './services/sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Calendar, Login],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly authService = inject(AuthService);

  constructor() {
    inject(SyncService);
  }
}
```

- [ ] **Step 3: Update the app template**

Replace `src/app/app.html` with:

```html
@if (authService.user()) {
  <app-calendar />
} @else {
  <app-login />
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Start the dev server and verify end-to-end**

```bash
npm start
```

Open `http://localhost:4200`. Verify:
1. Login screen appears with "Sign in with Google" button
2. Clicking the button opens a Google OAuth popup
3. After signing in, the calendar renders
4. Changing a day score persists after page refresh
5. Signing out returns to the login screen

> **Note:** Google sign-in popup requires the app to be served from an authorized domain. Add `localhost` to Firebase Console → Authentication → Settings → Authorized domains if the popup is blocked.

- [ ] **Step 6: Commit**

```bash
git add src/app/app.ts src/app/app.html src/app/app.config.ts
git commit -m "feat: wire up auth gate — show login or calendar based on auth state"
```
