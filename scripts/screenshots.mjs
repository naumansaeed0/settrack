import {chromium,devices} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
await mkdir('docs/screenshots',{recursive:true});
const browser=await chromium.launch();
try{for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:theme});const page=await context.newPage();await page.goto('http://127.0.0.1:4173/settrack/');await page.getByRole('heading',{name:'Training overview'}).waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`docs/screenshots/${theme==='dark'?'overview':'overview-light'}.png`,fullPage:true});if(theme==='dark'){await page.getByRole('button',{name:'Progress',exact:true}).click();await page.screenshot({path:'docs/screenshots/progress.png',fullPage:true});}await context.close();
}
const context=await browser.newContext({...devices['Pixel 7'],colorScheme:'dark'});const page=await context.newPage();await page.goto('http://127.0.0.1:4173/settrack/');await page.getByRole('button',{name:'Start workout',exact:true}).click();const bench=page.getByRole('region',{name:'Bench Press',exact:true});await bench.getByRole('button',{name:'Use last weights',exact:true}).click();await bench.getByRole('button',{name:'Increase Bench Press set 1 weight',exact:true}).click();await bench.getByRole('button',{name:'Bench Press set 1 complete',exact:true}).click();await page.evaluate(()=>document.fonts.ready);await bench.scrollIntoViewIfNeeded();await page.screenshot({path:'docs/screenshots/logging-set-phone.png'});await context.close();
}finally{await browser.close();}
