import {test} from 'node:test';import assert from 'node:assert/strict';
import {exportCsv,importCsv} from '../src/csv.ts';import {demoJournal} from '../src/training.ts';
test('CSV round-trips quoted names and multiline cells, skips stable IDs and rejects row errors',()=>{
 const {history}=demoJournal();history[0].name='=SUM(1,2) "quoted"\nworkout';
 const csv=exportCsv(history);assert.ok(csv.startsWith('\uFEFF'));const result=importCsv(csv,[]);assert.deepEqual(result.errors,[]);assert.equal(result.workouts.length,9);assert.equal(result.sets,108);assert.equal(result.workouts[0].name,history[0].name);
 assert.equal(importCsv(csv,history).duplicates,9);assert.equal(importCsv(csv,history).workouts.length,0);
 const bad=importCsv(csv.replace(',kg,',',stones,'),[]);assert.ok(bad.errors[0].startsWith('Row '));assert.equal(bad.workouts.length,0);
});
