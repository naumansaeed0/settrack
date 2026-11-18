import assert from 'node:assert/strict';
import test from 'node:test';
import { demoJournal, emptyJournal, finishWorkout, progressFor, recordsFor, secondsLeft, startWorkout, validSet, workoutStats } from '../src/training.ts';

test('a finished workout contains only valid, completed sets and keeps the original routine', () => {
  const { routines } = demoJournal();
  const draft = startWorkout(routines[0], 1000);
  Object.assign(draft.lifts[0].sets[0], { weight: '62.5', reps: '8', done: true });
  Object.assign(draft.lifts[0].sets[1], { weight: '65', reps: '8', done: false });
  Object.assign(draft.lifts[0].sets[2], { weight: '', reps: '8', done: true });
  const result = finishWorkout(draft, 3000);
  assert.ok(result);
  routines[0].name = 'Changed name';
  draft.lifts[0].sets[0].reps = '11';
  assert.equal(result.name, 'Upper Body A');
  assert.equal(result.startedAt, 1000);
  assert.equal(result.finishedAt, 3000);
  assert.deepEqual(workoutStats(result), { sets: 1, volume: 500 });
});

test('a new record requires a previous mark and a strictly greater completed weight', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const journal = demoJournal(now);
  const draft = startWorkout(journal.routines[0], now);
  const set = draft.lifts[0].sets[0];
  Object.assign(set, { weight: '60', reps: '8', done: true });
  assert.deepEqual(recordsFor(finishWorkout(draft, now + 1000)!, journal.history), []);
  set.weight = '62.5';
  const workout = finishWorkout(draft, now + 1000)!;
  assert.deepEqual(recordsFor(workout, [workout, ...journal.history]), [{ exerciseId: 'bench', weight: 62.5 }]);
  assert.deepEqual(recordsFor(workout, emptyJournal().history), []);
  assert.equal(progressFor([workout, ...journal.history], 'bench').at(-1)?.weight, 62.5);
});

test('bodyweight sets are valid, and an empty draft cannot be finished', () => {
  const set = { id: 'set', weight: '0', reps: '8', done: true };
  assert.equal(validSet(set), true);
  for (const weight of ['', '-1', 'Infinity', '1001']) assert.equal(validSet({ ...set, weight }), false);
  for (const reps of ['', '0', '8.5', '201']) assert.equal(validSet({ ...set, reps }), false);
  assert.equal(finishWorkout(startWorkout()), null);
});

test('rest is derived from its deadline and stays at zero after expiry', () => {
  assert.equal(secondsLeft(90_000, 29_500), 61);
  assert.equal(secondsLeft(90_000, 110_000), 0);
  assert.equal(secondsLeft(null, 110_000), 0);
});
