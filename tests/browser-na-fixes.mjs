const output=file=>(process.env.NA_TEST_OUT||'docs/verification/NA-fixes')+'/'+file;
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseURL=process.env.TEST_URL||'http://127.0.0.1:8086/';
import fs from 'node:fs';
fs.mkdirSync(output(''),{recursive:true});
const context=await chromium.launchPersistentContext(process.env.NA_TEST_PROFILE||fs.mkdtempSync(path.join(os.tmpdir(),'floorplan-na-fixes-')),{headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{channel:'chrome'}),viewport:{width:1440,height:1000},acceptDownloads:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(10000);await page.goto(baseURL);try{await page.waitForSelector('#lib .item');}catch(e){console.log(errors);await context.close();throw e;}
const assert=(v,m)=>{if(!v)throw Error(m);};
const project=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));
try{
 for(const task of process.argv[2]?[process.argv[2]]:['NA-001','NA-002','NA-004','NA-003','NA-005','NA-006','NA-007','NA-008','NA-009','NA-010','NA-012','NA-011']){
 await page.waitForSelector('#lib .item');
 if(task==='NA-001'){
  await page.locator('#importDrawing').evaluate(b=>b.click());await page.locator('#drawingIn').setInputFiles('docs/verification/NA-flow-audit/detached-house-fixture.pdf');
  await page.waitForFunction(()=>document.querySelector('#referenceDialog canvas')?.width>500);
  const canvas=page.locator('#referenceDialog canvas'),box=await canvas.boundingBox();await canvas.click({position:{x:box.width*.2,y:box.height*.3}});await canvas.click({position:{x:box.width*.6,y:box.height*.3}});
  await page.locator('#referenceDistance').fill('10 ft');await page.locator('[data-apply]').click();await page.waitForSelector('#gReference image');
  const p=await project();assert(p.referencePlan.mmPerPixel>0,'calibration missing');await page.reload();await page.waitForSelector('#gReference image');assert((await project()).referencePlan.src===p.referencePlan.src,'reload reference lost');
  await page.screenshot({path:output('NA-001.png')});
  await page.locator('#importDrawing').evaluate(b=>b.click());await page.locator('#drawingIn').setInputFiles({name:'drawing.dwg',mimeType:'application/octet-stream',buffer:Buffer.from('fixture')});await page.waitForFunction(()=>document.querySelector('#referenceDialog [role=alert]').textContent.includes('DWG'));await page.locator('#referenceDialog [data-cancel]').click();
 }
 else await (await import(new URL('./na-fixes/'+task+'.mjs',import.meta.url))).run({page,context,assert,project,fs,baseURL});
 assert(!errors.length,errors.join('\n'));fs.writeFileSync(output('')+task+'.json',JSON.stringify({task,passed:true,errors,timestamp:new Date().toISOString()},null,2));console.log(task+' browser PASS');}
}catch(error){console.log('Original failure:',error);if(!page.isClosed()){console.log(await page.locator('#roomDialog').innerText().catch(()=>''));console.log(await page.locator('#structurePanel').innerText());console.log(errors);await page.screenshot({path:output('failure.png')});}throw error;}finally{await context.close();}
