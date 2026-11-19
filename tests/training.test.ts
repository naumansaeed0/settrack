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

test('filling previous weights keeps completed sets and user edits unchanged', async () => {
  const { fillPreviousWeights } = await import('../src/training.ts');
  const previous = demoJournal().history[0].lifts[0].sets;
  const draft = startWorkout(demoJournal().routines[0]);
  const lift = draft.lifts[0];
  Object.assign(lift.sets[0], { weight: '62.5', done: true });
  Object.assign(lift.sets[1], { weight: '55', reps: '12' });
  const result = fillPreviousWeights(lift, previous);
  assert.equal(result.sets[0].done, true);
  assert.equal(result.sets[0].weight, '62.5');
  assert.equal(result.sets[1].weight, '55');
  assert.equal(result.sets[1].reps, '12');
  assert.equal(result.sets[2].weight, '60');
  assert.equal(result.sets[2].done, false);
  assert.equal(lift.sets[2].weight, '');
});

test('adding a set reuses valid entries but never copies completion or set identity', async () => {
  const { appendSet } = await import('../src/training.ts');
  const lift = demoJournal().history[0].lifts[0];
  const next = appendSet(lift);
  assert.equal(lift.sets.length, 3);
  assert.equal(next.sets.length, 4);
  assert.deepEqual({ weight: next.sets[3].weight, reps: next.sets[3].reps, done: next.sets[3].done }, { weight: '60', reps: '8', done: false });
  assert.notEqual(next.sets[3].id, lift.sets[2].id);
});

test('finish explicitly reports unchecked and invalid completed sets', async () => {
  const { incompleteSets } = await import('../src/training.ts');
  const draft = startWorkout(demoJournal().routines[0]);
  Object.assign(draft.lifts[0].sets[0], { weight: '', reps: '0', done: true });
  assert.equal(incompleteSets(draft).length, 12);
  Object.assign(draft.lifts[0].sets[1], { weight: '60', reps: '8', done: true });
  assert.equal(incompleteSets(draft).length, 11);
  assert.equal(finishWorkout(draft)!.lifts[0].sets.length, 1);
});

test('pounds round trips and the canonical weight boundary are consistent', async () => {
  const {storedWeight,displayWeight,localDayStart}=await import('../src/training.ts');
  assert.equal(displayWeight(Number(storedWeight('135','lb')),'lb'),135);
  assert.equal(validSet({id:'x',weight:storedWeight('2204.62','lb'),reps:'1',done:true}),true);
  assert.equal(validSet({id:'x',weight:storedWeight('2204.63','lb'),reps:'1',done:true}),false);
  const now=+new Date(2026,10,19,0,1);assert.equal(localDayStart(now,6),+new Date(2026,10,13,0,0));
});

test('rolling day filters include local midnight across a DST boundary',async()=>{
 const {filterWorkouts}=await import('../src/training.ts');const original=process.env.TZ;process.env.TZ='America/New_York';
 try{const now=+new Date(2026,10,5,0,1);const source=demoJournal(now).history[0];const first={...source,id:'included',startedAt:+new Date(2026,9,30,0,0)-1000,finishedAt:+new Date(2026,9,30,0,0)};const older={...source,id:'excluded',startedAt:+new Date(2026,9,29,23,59)-1000,finishedAt:+new Date(2026,9,29,23,59)};assert.deepEqual(filterWorkouts([older,first],'','',7,now).map(w=>w.id),['included']);}finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});

test('current bests recompute when the PR workout is deleted',async()=>{
 const {currentRecords,trainingSummary}=await import('../src/training.ts');const journal=demoJournal();const draft=startWorkout(journal.routines[0]);Object.assign(draft.lifts[0].sets[0],{weight:'100',reps:'5',done:true});const record=finishWorkout(draft)!;
 assert.equal(currentRecords([record,...journal.history]).find(r=>r.exerciseId==='bench')!.value,100);assert.equal(currentRecords(journal.history).find(r=>r.exerciseId==='bench')!.value,60);assert.ok(trainingSummary(journal.history).streak>=1);
});

test('steppers clamp canonical weight and rep/duration ranges',async()=>{
 const {stepSet}=await import('../src/training.ts');const set={id:'s',weight:'1000',reps:'200',seconds:'86400',done:true};assert.equal(stepSet(set,'weight',5,'lb').weight,'1000');assert.equal(stepSet(set,'reps',1).reps,'200');assert.equal(stepSet(set,'seconds',5).seconds,'86400');assert.equal(stepSet({...set,weight:'0'},'weight',-5).weight,'0');
});
