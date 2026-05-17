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
