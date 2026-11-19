import {test,expect} from '@playwright/test';import {readFile} from 'node:fs/promises';
test('spreadsheet previews merges and skips stable duplicate IDs',async({page})=>{
 await page.goto('./#data');await page.getByRole('heading',{name:'Your data',exact:true}).waitFor();const event=page.waitForEvent('download');await page.getByRole('button',{name:'Export to spreadsheet',exact:true}).click();const bytes=await readFile((await(await event).path())!);expect(bytes.subarray(0,3)).toEqual(Buffer.from([239,187,191]));
 await page.goto('./?workspace=personal#data');await page.getByRole('heading',{name:'Your data',exact:true}).waitFor();const file={name:'journal.csv',mimeType:'text/csv',buffer:bytes};await page.getByLabel('Import from spreadsheet',{exact:true}).setInputFiles(file);await expect(page.getByRole('dialog')).toContainText('9 workouts, 108 sets will be added');await page.getByRole('button',{name:'Add workouts',exact:true}).click();await expect(page.getByText('Spreadsheet imported. Existing workouts were preserved.')).toBeVisible();
 await page.getByLabel('Import from spreadsheet',{exact:true}).setInputFiles(file);await expect(page.getByRole('dialog')).toContainText('9 existing workouts will be skipped');await expect(page.getByRole('button',{name:'Add workouts',exact:true})).toBeDisabled();
});
test('file sharing falls back from settrack to JSON and records a successful backup',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{value:({files}:{files:File[]})=>files[0].name.endsWith('.json')});Object.defineProperty(navigator,'share',{value:async({files}:{files:File[]})=>{Object.assign(window,{sharedName:files[0].name});}});});
 await page.goto('./#data');await page.getByRole('button',{name:'Back up my journal',exact:true}).click();await expect(page.getByText(/Backup shared:.*\.json/)).toBeVisible();await expect(page.getByText('Last backup: 0 days ago')).toBeVisible();expect(await page.evaluate(()=>(window as unknown as {sharedName:string}).sharedName)).toMatch(/\.json$/);
});
test('draft writes debounce and recover after closing the tab mid-input',async({page,context})=>{
 await page.addInitScript(()=>{const original=IDBObjectStore.prototype.put;Object.assign(window,{putCount:0});IDBObjectStore.prototype.put=function(...args:Parameters<typeof original>){(window as unknown as {putCount:number}).putCount++;return original.apply(this,args);};});
 await page.goto('./');await page.getByRole('button',{name:'Start workout',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Stored on this device');
 const before=await page.evaluate(()=>(window as unknown as {putCount:number}).putCount);const input=page.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'});await input.fill('1');await input.pressSequentially('35');expect(await page.evaluate(()=>(window as unknown as {putCount:number}).putCount)).toBe(before);
 await page.close();const recovered=await context.newPage();await recovered.goto('http://127.0.0.1:4173/settrack/#workout');await expect(recovered.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'})).toHaveValue('135');
});
test('unknown future backups fail without changing the journal',async({page})=>{
 await page.goto('./#data');await page.getByRole('heading',{name:'Your data',exact:true}).waitFor();await page.getByLabel('Restore from backup',{exact:true}).setInputFiles({name:'future.settrack',mimeType:'application/octet-stream',buffer:Buffer.from('{"app":"settrack","version":99}')});await expect(page.getByRole('alert')).toContainText('Unsupported backup');await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.getByText('9 completed workouts')).toBeVisible();
});
