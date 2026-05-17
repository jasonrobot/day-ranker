# Data Migration & CSV Import Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the CSV import service to correctly parse quoted fields and initialize unset days as null, then run a one-time migration script to clean up bad data already in Firebase.

**Architecture:** Two independent changes — first fix the CSV import service (TypeScript, with tests), then write and run a standalone Node.js migration script using the Firebase Admin SDK. The migration script is a one-off tool and does not need to be wired into the Angular app.

**Tech Stack:** Angular 21 / TypeScript, Vitest, Firebase Admin SDK (Node.js)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/app/services/csv-import.service.ts` | Modify | Strip quotes from comment, default unset days to `null` |
| `src/app/services/csv-import.service.spec.ts` | Modify | Update 3 tests expecting `score: 0`; add 2 new tests for quote stripping |
| `scripts/migrate-2026.js` | Create | One-off Node.js script to clean Firebase data |
| `package.json` | Modify | Add `firebase-admin` as dev dependency |

---

## Task 1: Update CSV import tests

**Files:**
- Modify: `src/app/services/csv-import.service.spec.ts`

These tests currently expect `score: 0` for unset days. They need to expect `score: null` before the implementation is changed, so they fail for the right reason.

- [ ] **Step 1: Update the three tests that assert `score: 0` for unset days**

In `src/app/services/csv-import.service.spec.ts`, make these exact changes:

Test `'excludes rows whose year does not match the detected year'` — change line 39:
```typescript
// Before:
expect(result!.state.months[5].days[14].score).toBe(0);
// After:
expect(result!.state.months[5].days[14].score).toBeNull();
```

Test `'skips rows with a non-numeric score without throwing'` — change line 54:
```typescript
// Before:
expect(result!.state.months[3].days[4].score).toBe(0);
// After:
expect(result!.state.months[3].days[4].score).toBeNull();
```

Test `'initializes unset days to score 0 and empty comment'` — update the whole test:
```typescript
it('initializes unset days to score null and empty comment', () => {
  const csv = '2025-07-04,1,holiday';
  const result = service.parse(csv);

  expect(result!.state.months[0].days[0].score).toBeNull();
  expect(result!.state.months[0].days[0].comment).toBe('');
});
```

- [ ] **Step 2: Add tests for quote stripping**

Add these two tests at the end of the `describe` block (before the closing `}`):

```typescript
it('strips surrounding double-quotes from comment', () => {
  const csv = '2025-05-10,2,"Great day"';
  const result = service.parse(csv);

  expect(result!.state.months[4].days[9].comment).toBe('Great day');
});

it('strips surrounding quotes from a comment that contains commas', () => {
  const csv = '2025-04-18,2,"Tidied up the room, went to the sounders game, had a nice day overall"';
  const result = service.parse(csv);

  expect(result!.state.months[3].days[17].comment).toBe(
    'Tidied up the room, went to the sounders game, had a nice day overall'
  );
});
```

- [ ] **Step 3: Run tests and confirm new/updated tests fail**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "FAIL\|csv-import" /tmp/test-output.txt
```

Expected: failures in `csv-import.service.spec.ts` for the updated and new tests.

---

## Task 2: Fix the CSV import service

**Files:**
- Modify: `src/app/services/csv-import.service.ts`

- [ ] **Step 1: Strip surrounding quotes from the comment field**

In `src/app/services/csv-import.service.ts`, after extracting `comment` on line 19, add a strip step. Replace lines 17–44 with:

```typescript
      const datePart = line.substring(0, firstComma);
      const scorePart = line.substring(firstComma + 1, secondComma);
      let comment = line.substring(secondComma + 1);

      if (comment.startsWith('"') && comment.endsWith('"')) {
        comment = comment.slice(1, -1);
      }

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
```

- [ ] **Step 2: Initialize unset days to `score: null`**

In `buildEmptyYearState`, change the day initializer from `{ score: 0 as Score, comment: '' }` to `{ score: null, comment: '' }`:

```typescript
  private buildEmptyYearState(year: number): YearState {
    return {
      months: Array.from({ length: 12 }, (_, monthIdx) => ({
        days: Array.from(
          { length: new Date(year, monthIdx + 1, 0).getDate() },
          () => ({ score: null, comment: '' })
        ),
      })),
    };
  }
```

- [ ] **Step 3: Run tests and confirm they all pass**

```bash
NO_COLOR=1 npm test -- --reporter=verbose > /tmp/test-output.txt 2>&1
grep -n "Tests\|Test Files\|FAIL" /tmp/test-output.txt
```

Expected: all tests pass, no FAIL lines.

- [ ] **Step 4: Commit**

```bash
git add src/app/services/csv-import.service.ts src/app/services/csv-import.service.spec.ts
git commit -m "fix: strip quoted comments and default unset days to null in CSV import"
```

---

## Task 3: Write the migration script

**Files:**
- Modify: `package.json`
- Create: `scripts/migrate-2026.js`

- [ ] **Step 1: Install `firebase-admin` as a dev dependency**

```bash
npm install --save-dev firebase-admin
```

- [ ] **Step 2: Create the scripts directory and migration file**

```bash
mkdir -p scripts
```

Create `scripts/migrate-2026.js` with this content:

```js
#!/usr/bin/env node
// One-time migration: for year 2026, null out zero scores after today and
// strip surrounding double-quotes from all comments.

const admin = require('firebase-admin');
const serviceAccount = require(require('path').resolve(process.argv[2]));

const UID = 'YOUR_UID_HERE'; // Replace with your Firebase UID before running
const YEAR = 2026;

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  const docRef = db.doc(`users/${UID}/years/${YEAR}`);
  const snap = await docRef.get();

  if (!snap.exists) {
    console.log('No document found for user/year. Nothing to migrate.');
    process.exit(0);
  }

  const data = snap.data();
  const today = new Date();
  const todayMonth = today.getMonth(); // 0-indexed
  const todayDay = today.getDate() - 1; // 0-indexed

  let nulledCount = 0;
  let unquotedCount = 0;

  for (let mIdx = 0; mIdx < data.months.length; mIdx++) {
    const month = data.months[mIdx];
    for (let dIdx = 0; dIdx < month.days.length; dIdx++) {
      const day = month.days[dIdx];
      const isAfterToday =
        mIdx > todayMonth || (mIdx === todayMonth && dIdx > todayDay);

      if (isAfterToday && day.score === 0) {
        day.score = null;
        nulledCount++;
      }

      if (
        typeof day.comment === 'string' &&
        day.comment.startsWith('"') &&
        day.comment.endsWith('"')
      ) {
        day.comment = day.comment.slice(1, -1);
        unquotedCount++;
      }
    }
  }

  await docRef.set(data);

  console.log(`Migration complete.`);
  console.log(`  Days score-nulled: ${nulledCount}`);
  console.log(`  Comments unquoted: ${unquotedCount}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Fill in your UID**

Edit `scripts/migrate-2026.js` and replace `YOUR_UID_HERE` with your actual Firebase UID.

- [ ] **Step 4: Add scripts/ and service account to .gitignore**

Check `.gitignore` — make sure service account JSON files are excluded. Add if needed:

```bash
echo "scripts/service-account*.json" >> .gitignore
```

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-2026.js package.json package-lock.json .gitignore
git commit -m "feat: add one-time Firebase data migration script for 2026"
```

---

## Task 4: Run the migration

**Prerequisites:** Download a Firebase service account key from the Firebase console → Project Settings → Service Accounts → Generate new private key. Save it somewhere outside the repo (e.g., `~/service-account.json`).

- [ ] **Step 1: Do a dry-run check — inspect the document before migrating**

```bash
node -e "
const admin = require('firebase-admin');
const sa = require(require('path').resolve(process.argv[1]));
admin.initializeApp({ credential: admin.credential.cert(sa) });
admin.firestore().doc('users/YOUR_UID_HERE/years/2026').get()
  .then(s => { console.log(JSON.stringify(s.data(), null, 2)); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
" ~/service-account.json | head -60
```

Confirm the document exists and the data looks as expected (scores of 0 for future days, quoted comments visible).

- [ ] **Step 2: Run the migration**

```bash
node scripts/migrate-2026.js ~/service-account.json
```

Expected output:
```
Migration complete.
  Days score-nulled: <some number>
  Comments unquoted: <some number>
```

- [ ] **Step 3: Verify in Firebase console**

Open the Firebase console and inspect a few future days (after today) — they should now have `score: null`. Check a day with a previously quoted comment — the surrounding quotes should be gone.
