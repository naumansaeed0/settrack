import {test,expect} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';
test('dashboard workout history progress and data have no serious accessibility violations',async({page})=>{
 for(const route of ['dashboard','workout','history','progress','data']){
  await page.goto('./#dashboard');await page.getByRole('heading',{name:'Training log'}).waitFor();
  if(route==='workout')await page.getByRole('button',{name:/Start workout|Resume workout/,exact:true}).first().click();else if(route!=='dashboard')await page.goto(`./#${route}`);
  await page.locator('h1').waitFor();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>({id:v.id,description:v.description,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
 }
});
