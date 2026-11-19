import {test,expect} from '@playwright/test';
const empty={app:'settrack',version:2,journal:{routines:[],history:[],draft:null}};
test('finishing warns about invalid completed sets and moving a demo draft preserves it',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'Start workout',exact:true}).click();
 const bench=page.getByRole('region',{name:'Bench Press',exact:true});
 await bench.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'}).fill('60');await bench.getByRole('button',{name:'Bench Press set 1 complete',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Stored on this device');
 await page.evaluate(async()=>{await new Promise<void>((resolve,reject)=>{const request=indexedDB.open('settrack',2);request.onsuccess=()=>{const db=request.result;const tx=db.transaction('workspaces','readwrite');const store=tx.objectStore('workspaces');const read=store.get('demo');read.onsuccess=()=>{const snapshot=read.result;Object.assign(snapshot.journal.draft.lifts[0].sets[1],{weight:'',reps:'0',done:true});snapshot.revision++;store.put(snapshot,'demo');};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});});await page.reload();
 await page.getByRole('button',{name:'Finish workout',exact:true}).click();await expect(page.getByRole('dialog')).toContainText("11 sets are incomplete and won't be saved");
 await page.getByRole('button',{name:'Go back and fix',exact:true}).click();await expect(bench.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'})).toHaveValue('60');
 await page.getByRole('button',{name:'Finish workout',exact:true}).click();await page.getByRole('button',{name:'Switch to My journal',exact:true}).click();
 await expect(page.getByRole('button',{name:/^My journal/})).toBeVisible();await page.getByRole('button',{name:'Workout',exact:true}).click();await expect(bench.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'})).toHaveValue('60');
});
test('restoring takes a pre-import snapshot and undo restores the whole journal',async({page})=>{
 await page.goto('./');await page.getByRole('heading',{name:'Training overview'}).waitFor();
 await page.getByLabel('Restore from backup',{exact:true}).setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(empty))});
 await page.getByRole('button',{name:'Replace journal',exact:true}).click();await expect(page.getByRole('heading',{name:'Your first workout'})).toBeVisible();
 await page.getByRole('button',{name:'Undo import',exact:true}).click();await expect(page.getByRole('heading',{name:'Upper Body A',exact:true})).toBeVisible();
});
test('pounds retain entered precision and half-typed input through unit toggles',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'Start workout',exact:true}).click();const units=page.getByRole('combobox',{name:'Weight units'});
 await units.selectOption('lb');await page.getByRole('spinbutton',{name:'Bench Press set 1 weight in lb'}).fill('135');await units.selectOption('kg');await units.selectOption('lb');await expect(page.getByRole('spinbutton',{name:'Bench Press set 1 weight in lb'})).toHaveValue('135');
 await page.getByRole('spinbutton',{name:'Bench Press set 1 weight in lb'}).fill('1.');await units.selectOption('kg');await units.selectOption('lb');await expect(page.getByRole('spinbutton',{name:'Bench Press set 1 weight in lb'})).toHaveValue('1.');
 await page.getByRole('spinbutton',{name:'Bench Press set 1 weight in lb'}).fill('2204.63');await expect(page.getByRole('button',{name:'Bench Press set 1 complete',exact:true})).toBeDisabled();
});
test('timed exercises log seconds and show seconds-based progress',async({page})=>{
 await page.goto('./?workspace=personal');await page.getByRole('button',{name:'Blank workout',exact:true}).click();await page.getByRole('button',{name:'Add exercise',exact:true}).click();await page.getByRole('button',{name:/Plank Core/}).click();
 await page.getByRole('spinbutton',{name:'Plank set 1 seconds'}).fill('60');await page.getByRole('button',{name:'Plank set 1 complete',exact:true}).click();await page.getByRole('button',{name:'Finish workout',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('60 sec');
});

test('revision conflicts preserve the newer saved journal and allow an unsaved backup',async({page,context})=>{
 await page.goto('./');await page.getByRole('button',{name:'Start workout',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Stored on this device');const other=await context.newPage();await other.goto('http://127.0.0.1:4173/settrack/#workout');await other.getByRole('heading',{name:'Upper Body A',exact:true}).waitFor();
 await page.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'}).fill('60');await expect(page.getByRole('status')).toHaveText('Stored on this device');await other.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'}).fill('55');await expect(other.getByRole('alert')).toContainText('changed in another tab');const event=other.waitForEvent('download');await other.getByRole('button',{name:'Back up my journal',exact:true}).click();const file=await event;expect(file.suggestedFilename()).toMatch(/SetTrack-backup/);
});


test('editing a workout date re-sorts history and updates local-day filters',async({page})=>{
 await page.goto('./#history');await page.getByRole('button',{name:/Upper Body A.*12 sets/}).first().click();await page.getByRole('button',{name:'Edit workout',exact:true}).click();await page.getByLabel('Finished at',{exact:true}).fill('2001-01-01T12:00');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('.history-row').first()).toContainText('Lower Body A');await page.getByRole('combobox',{name:'Period',exact:true}).selectOption('7');await expect(page.getByText('Showing 2 of 9 workouts')).toBeVisible();
});

test('moving a demo draft never overwrites an existing personal draft',async({page})=>{
 await page.goto('./?workspace=personal');await page.getByRole('button',{name:'Blank workout',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Stored on this device');await page.getByRole('button',{name:/^My journal/}).click();await page.getByRole('dialog').getByRole('button',{name:/^Demo journal/}).click();await page.getByRole('button',{name:'Start workout',exact:true}).click();await page.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'}).fill('60');await page.getByRole('button',{name:'Bench Press set 1 complete',exact:true}).click();await page.getByRole('button',{name:'Finish workout',exact:true}).click();await page.getByRole('button',{name:'Switch to My journal',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('already has an active draft');await page.getByRole('button',{name:'Go back and fix',exact:true}).click();await expect(page.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'})).toHaveValue('60');
});
