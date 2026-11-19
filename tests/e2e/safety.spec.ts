import {test,expect} from '@playwright/test';
const empty={app:'settrack',version:2,journal:{routines:[],history:[],draft:null}};
test('finishing warns about invalid completed sets and moving a demo draft preserves it',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'Start workout',exact:true}).click();
 const bench=page.getByRole('region',{name:'Bench Press',exact:true});
 await bench.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'}).fill('60');await bench.getByRole('button',{name:'Bench Press set 1 complete',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Stored on this device');
 await page.getByRole('button',{name:'Finish workout',exact:true}).click();await expect(page.getByRole('dialog')).toContainText("11 sets are incomplete and won't be saved");
 await page.getByRole('button',{name:'Go back and fix',exact:true}).click();await expect(bench.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'})).toHaveValue('60');
 await page.getByRole('button',{name:'Finish workout',exact:true}).click();await page.getByRole('button',{name:'Switch to My journal',exact:true}).click();
 await expect(page.getByRole('button',{name:/^My journal/})).toBeVisible();await page.getByRole('button',{name:'Workout',exact:true}).click();await expect(bench.getByRole('spinbutton',{name:'Bench Press set 1 weight in kg'})).toHaveValue('60');
});
test('restoring takes a pre-import snapshot and undo restores the whole journal',async({page})=>{
 await page.goto('./');await page.getByRole('heading',{name:'Training log'}).waitFor();
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
