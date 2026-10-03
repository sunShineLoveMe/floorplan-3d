import {createRequire} from 'node:module';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {auditFurnitureLabels} from './helpers/svg-label-audit.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),out=process.env.COMPOSITION_TEST_OUT||'docs/verification/NA-apartment-composition',observe=process.argv.includes('--observe');fs.mkdirSync(out,{recursive:true});
const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'floorplan-labels-')),{headless:true,channel:'chrome',viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8095/');await page.waitForSelector('#lib .item');await page.waitForFunction(()=>!document.body.classList.contains('busy'));await page.locator('#fileIn').setInputFiles('docs/verification/NA-fixed-obstacles/bedroom-two-project.json');await page.waitForTimeout(200);await page.locator('#fit').click();
 const rows=await auditFurnitureLabels(page);if(!observe)assert.ok(rows.every(r=>r.withinFootprint));else assert.ok(rows.some(r=>!r.withinFootprint));
 let rotations=[];
 if(!observe){
  const first=rows[0],original=await page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));
  await page.locator(`#gFurn [data-fid="${first.id}"]`).click();
  for(const rot of [0,45,90])for(const name of [first.name,'W'.repeat(500),'中文家具名称和尺寸验证'.repeat(20)]){
   for(const [id,value]of Object.entries({fName:name,fR:String(rot)})){await page.locator('#'+id).fill(value);await page.locator('#'+id).press('Tab');}
   const current=await auditFurnitureLabels(page);assert.ok(current.every(r=>r.withinFootprint));const text=await page.locator(`#gFurn [data-fid="${first.id}"] title`).textContent();assert.equal(text,name);
   assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('floorplan-project-v2')).furniture.find(f=>f.id===id).name,first.id),name);rotations.push({rotation:rot,nameLength:name.length,withinFootprint:true,fullNamePreserved:true});
  }
  await page.locator('#fName').fill(first.name);await page.locator('#fName').press('Tab');await page.locator('#fR').fill('0');await page.locator('#fR').press('Tab');
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));assert.deepEqual(restored.geometry,original.geometry);assert.deepEqual(restored.furniture,original.furniture);
  if(await page.locator('#fab [data-a=done]').count())await page.locator('#fab [data-a=done]').click();
  if(!await page.locator('#printPaper').isVisible())await page.locator('header details.menu summary').click();await page.locator('#printPaper').selectOption('letter');await page.locator('#printScale').selectOption('fit');const popup=context.waitForEvent('page');await page.locator('#printPlan').evaluate(b=>b.click());const print=await popup;await print.waitForLoadState();await print.emulateMedia({media:'print'});await print.pdf({path:out+'/compact-bedroom-print.pdf',preferCSSPageSize:true,printBackground:true});await print.close();
 }
 await page.screenshot({path:out+'/'+(observe?'label-before':'label-after')+'.png'});
 fs.writeFileSync(out+'/'+(observe?'label-before':'label-after')+'.json',JSON.stringify({build:await page.locator('html').getAttribute('data-build'),observedOverflow:rows.some(r=>!r.withinFootprint),labels:rows,rotations,errors,timestamp:new Date().toISOString()},null,2)+'\n');assert.deepEqual(errors,[]);console.log(observe?'Overflow reproduced':'Rendered label bounds fit furniture');
}catch(e){await page.screenshot({path:out+'/label-failure.png'});throw e;}finally{await context.close();}
