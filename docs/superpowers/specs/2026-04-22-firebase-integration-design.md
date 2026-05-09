# Firebase Integration Design

**Date**: 2026-04-22  
**Status**: Approved

## Goal

Add Firebase Auth (Google sign-in) and Firestore persistence to day-ranker, with localStorage as a write-through cache and offline fallback. The app should support multiple users with per-user data, though only one user is expected initially.

## Architecture

Three new services alongside the existing `CalendarStore`:

- **`AuthService`** — wraps Firebase Auth; handles Google sign-in/sign-out; exposes current user as a signal
- **`StorageService`** — handles all reads/writes; writes to localStorage synchronously, then Firestore async; falls back to localStorage on Firestore read failure
- **`SyncService`** — coordinates auth and storage; subscribes to `AuthService` auth state; on login, loads the current calendar year's data and hydrates `CalendarStore`; on logout, clears in-memory store state

`CalendarStore` gains a `StorageService` dependency. After each `updateDay()`, it calls `StorageService.saveYear()`. The store does not know or care whether the write goes to Firestore or localStorage.

The `App` component conditionally renders either a login screen or `Calendar` based on the auth signal from `AuthService`.

## Data Structure

**Firestore**: `users/{uid}/years/{year}` → `{ months: [...] }` (full `YearState` JSON)

`{year}` is the 4-digit calendar year (e.g. `"2026"`). The app only loads and syncs the current year. One document per user per year. One read on login, one write per `updateDay()` call. Well within Firestore's 1MB document limit.

**localStorage**: key `day-ranker:{uid}:{year}` → same JSON shape as Firestore.

On write: localStorage is written first (synchronous), then Firestore (async, fire-and-forget).  
On read: Firestore is source of truth; fall back to localStorage if Firestore fails.

## Auth Flow

1. App loads → `AuthService` checks Firebase for an existing session (Firebase persists auth across refreshes automatically)
2. If authenticated: `SyncService` loads year data from Firestore (fallback: localStorage) → hydrates `CalendarStore`
3. If not authenticated: show login screen with "Sign in with Google" button
4. On sign-out: clear in-memory store state, show login screen

**First-time login** (no data in Firestore or localStorage): `SyncService` receives null from Firestore and does nothing — `CalendarStore` initializes with its existing defaults (all zeros), which is correct.

## Error Handling

| Scenario | Behavior |
|---|---|
| Firestore write failure | Silent log; localStorage always written first, so no data loss |
| Firestore read failure on login | Fall back to localStorage |
| localStorage empty + Firestore down (fresh device, offline) | Initialize with defaults (same as first-time login) |
| Auth failure | Show error message on login screen: "Sign in failed, please try again" |

No explicit Firestore offline persistence (too complex for this scope). The write-through pattern handles typical offline scenarios: localStorage always has latest state, Firestore catches up on reconnect.

## Testing

All tests use Vitest with jsdom. New services are tested with mocked Firebase SDK — no real Firebase connection in tests.

- **`AuthService`**: mock `signInWithPopup`, `signOut`, `onAuthStateChanged`
- **`StorageService`**: mock Firestore calls and `localStorage`; verify write-through behavior and fallback logic
- **`SyncService`**: verify store hydration on login and state clear on logout
- **`CalendarStore`**: add coverage for persistence calls triggered by `updateDay()`

## Files to Create/Modify

**New files:**
- `src/app/services/auth.service.ts`
- `src/app/services/auth.service.spec.ts`
- `src/app/services/storage.service.ts`
- `src/app/services/storage.service.spec.ts`
- `src/app/services/sync.service.ts`
- `src/app/services/sync.service.spec.ts`
- `src/app/login/login.ts`
- `src/app/login/login.html`
- `src/app/login/login.scss`
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

**Modified files:**
- `src/app/calendar/calendar.store.ts` — inject `StorageService`, call `saveYear()` in `updateDay()`
- `src/app/calendar/calendar.spec.ts` — add persistence call coverage
- `src/app/app.ts` — conditionally render login or calendar based on auth state
- `src/app/app.config.ts` — provide Firebase app and services
- `package.json` — add `firebase` dependency
