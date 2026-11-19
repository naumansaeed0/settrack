import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { IDBFactory } from 'fake-indexeddb';
import { importBackup } from '../src/backup.ts';
import { demoJournal, progressFor, recordsFor, startWorkout, finishWorkout, validSet } from '../src/training.ts';

test('real legacy v1/v2 fixtures migrate to typed journals and future backups fail safely', async () => {
  for (const v of [1,2]) { const journal=importBackup(await readFile(new URL(`./fixtures/backup-v${v}.json`,import.meta.url),'utf8')); assert.equal(journal.history.length,2); assert.equal(journal.history[0].lifts[0].type,'weight'); }
  assert.throws(()=>importBackup('{"app":"settrack","version":99}'),/Unsupported/);
});
test('DB v1 upgrades in place and import safety snapshots are transactional', async () => {
  Object.assign(globalThis,{indexedDB:new IDBFactory()});
  const journal=demoJournal();
  await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('settrack',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspaces');r.onsuccess=()=>{const db=r.result;const t=db.transaction('workspaces','readwrite');t.objectStore('workspaces').put({revision:7,journal},'personal');t.oncomplete=()=>{db.close();resolve();};};r.onerror=()=>reject(r.error);});
  const {loadJournal,saveJournal,loadSafety,openJournal}=await import('../src/journal.ts');
  const saved=(await loadJournal('personal'))!;assert.equal(saved.revision,7);assert.equal(saved.journal.history[0].lifts[0].type,'weight');assert.equal((await openJournal()).version,2);
  await saveJournal('personal',{routines:[],history:[],draft:null},7,saved.journal);
  assert.deepEqual(await loadSafety('personal'),saved.journal);
  await assert.rejects(saveJournal('personal',journal,7),/workspace-conflict/);
  await saveJournal('personal',saved.journal,8,null);assert.equal(await loadSafety('personal'),undefined);
});
test('zero-weight progress and records use reps and timed sets use seconds',()=>{
  const draft=startWorkout();draft.lifts=[{exerciseId:'push-up',type:'bodyweight',sets:[{id:'a',weight:'0',reps:'10',done:true}]}];
  const a=finishWorkout(draft,100)!;draft.lifts[0].sets[0].reps='15';const b=finishWorkout(draft,200)!;
  assert.deepEqual(progressFor([a,b],'push-up').map(p=>p.weight),[10,15]);assert.equal(recordsFor(b,[a,b]).length,1);assert.equal(recordsFor(b,[b]).length,0);
  assert.equal(validSet({id:'s',weight:'0',reps:'',seconds:'60',done:true},'timed'),true);
});
