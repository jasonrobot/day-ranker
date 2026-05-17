# Data Migration & CSV Import Fix

## Overview

Two related fixes to address problems introduced by the initial CSV data import:
1. A one-time Node.js migration script to clean up bad Firebase data
2. Fixes to the CSV import service to prevent the same problems from recurring

---

## Migration Script

**File:** `scripts/migrate-2026.js`

**Usage:**
```bash
node scripts/migrate-2026.js path/to/service-account.json
```

**Dependencies:** `firebase-admin` added as a dev dependency.

**Hard-coded values:**
- Year: `2026`
- User UID: `YOUR_UID_HERE` (replace before running)

**Logic:**

1. Initialize Firebase Admin SDK using the service account JSON passed as a CLI argument
2. Fetch Firestore document `users/{uid}/years/2026`
3. Walk all 12 months × all days. For each day:
   - If the day is **after today** (month/day compared at runtime) AND `score === 0` → set `score` to `null`
   - If `comment` starts and ends with `"` → strip the surrounding double-quotes
4. Write the modified document back to Firestore
5. Log a summary: number of days score-nulled, number of comments unquoted

**Notes:**
- "After today" is determined at script runtime, not hard-coded
- The script is safe to re-run (stripping already-stripped quotes is a no-op; nulling already-null scores is a no-op)
- The service account JSON should not be committed to the repo

---

## CSV Import Fix

**File:** `src/app/services/csv-import.service.ts`

**Change 1 — Strip surrounding quotes from comment field:**

After splitting the row on the first two commas, if the comment starts and ends with `"`, strip those characters. This handles standard quoted-CSV fields (where a field containing commas is wrapped in double-quotes by the exporter).

**Change 2 — Initialize unset days with `score: null`:**

Change the default day initializer from `{ score: 0 as Score, comment: '' }` to `{ score: null, comment: '' }`. This aligns with how the store initializes days and prevents future imports from reintroducing zero-scores for unscored days.

---

## Test Changes

**File:** `src/app/services/csv-import.service.spec.ts`

- Update existing tests that expect `score: 0` for unset days to expect `score: null`
- Add a new test for quote-stripping: a comment wrapped in double-quotes should be stored without them
- Add a test for a comment with internal commas wrapped in quotes (the real-world case that triggered this bug)
