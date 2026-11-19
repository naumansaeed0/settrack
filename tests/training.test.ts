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


test('unit conversions preserve canonical kilograms and empty entry fields', async () => {
  const { displayWeight, storedWeight } = await import('../src/training.ts');
  assert.equal(displayWeight(60, 'lb'), 132.28);
  assert.ok(Math.abs(Number(storedWeight('132.28', 'lb')) - 60) < 0.005);
  assert.equal(storedWeight('', 'lb'), '');
  assert.equal(storedWeight('62.5', 'kg'), '62.5');
});

test('repeating a workout creates independent unchecked sets and a fresh rest clock', async () => {
  const { repeatWorkout } = await import('../src/training.ts');
  const original = demoJournal().history[0];
  const before = structuredClone(original);
  const draft = repeatWorkout(original, 1234);
  assert.equal(draft.startedAt, 1234);
  assert.equal(draft.restUntil, null);
  assert.notEqual(draft.id, original.id);
  assert.equal(finishWorkout(draft), null);
  assert.notEqual(draft.lifts[0].sets[0].id, original.lifts[0].sets[0].id);
  assert.equal(draft.lifts[0].sets[0].weight, original.lifts[0].sets[0].weight);
  draft.lifts[0].sets[0].weight = '99';
  assert.deepEqual(original, before);
});

test('history search combines name, exercise and date filters without mutating history', async () => {
  const { filterWorkouts } = await import('../src/training.ts');
  const now = Date.parse('2026-11-19T20:00:00Z');
  const { history } = demoJournal(now);
  const before = structuredClone(history);
  assert.equal(filterWorkouts(history, '  upper BENCH ', 'bench', 7, now).length, 2);
  assert.equal(filterWorkouts(history, '', 'squat', 7, now).length, 1);
  assert.equal(filterWorkouts(history, 'no match').length, 0);
  assert.equal(filterWorkouts(history, 'upper', 'squat').length, 0);
  assert.deepEqual(history, before);
});
