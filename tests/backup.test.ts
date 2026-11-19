import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportBackup, importBackup, migrateBackup } from '../src/backup.ts';
import { demoJournal, migrateJournal } from '../src/training.ts';

test('migrates a version 1 snapshot without losing workouts, routines or draft', () => {
  const journal = demoJournal();
  journal.draft = { id: 'draft', name: 'In progress', startedAt: 10, restUntil: null, lifts: [] };
  const old = { app: 'settrack', version: 1, data: journal };
  assert.deepEqual(migrateBackup(old), { app: 'settrack', version: 3, journal: migrateJournal(journal) });
  assert.deepEqual(importBackup(exportBackup(journal)), migrateJournal(journal));
});
test('rejects malformed JSON, unknown versions, invalid exercises and invalid completed sets', () => {
  assert.throws(() => importBackup('{'), /valid SetTrack backup/);
  assert.throws(() => migrateBackup({ app: 'settrack', version: 99 }), /version/);
  const journal = demoJournal();
  journal.history[0].lifts[0].sets[0].reps = '-2';
  assert.throws(() => importBackup(exportBackup(journal)), /Invalid journal/);
  assert.throws(() => migrateBackup({ app: 'settrack', version: 2, journal: { routines: [], history: [{ lifts: [] }], draft: null } }), /Invalid/);
});
