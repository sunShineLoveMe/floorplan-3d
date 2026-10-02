import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8095/';
const corpus='tests/fixtures/floorplans',out='docs/verification/NA-floorplan-corpus';
const manifest=JSON.parse(fs.readFileSync(corpus+'/manifest.json','utf8'));
fs.mkdirSync(out,{recursive:true});
const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'floorplan-corpus-')),{headless:true,channel:'chrome',viewport:{width:1440,height:1000},args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));
try{
 await page.goto(base);await page.waitForSelector('#lib .item');await page.waitForFunction(()=>!document.body.classList.contains('busy'));
 const original=await snapshot();
 for(const sample of manifest.samples){
  await page.locator('header details.menu summary').click();await page.locator('#importDrawing').click();
  await page.locator('#drawingIn').setInputFiles(corpus+'/'+sample.original);
  await page.waitForFunction(()=>document.querySelector('#referenceDialog canvas')?.width>300&&document.querySelector('#referenceDialog canvas')?.height>100);
  assert.equal(await page.locator('#referenceDialog [role=alert]').innerText(),'');
  const number=sample.previewPages[0];
  if(sample.original.endsWith('.pdf')){
   assert.equal(await page.locator('#referencePage option').count(),sample.pageCount);
   if(number!==1){await page.locator('#referencePage').selectOption(String(number));await page.waitForFunction(()=>!document.querySelector('#referenceDialog [data-apply]').disabled);}
  }
  await page.waitForFunction(()=>{
   const c=document.querySelector('#referenceDialog canvas'),d=c?.getContext('2d').getImageData(0,0,c.width,c.height).data;
   if(!d)return false;let visible=0;for(let i=0;i<d.length;i+=400)if(d[i+3]>0&&(d[i]<245||d[i+1]<245||d[i+2]<245))visible++;
   return visible>10;
  });
  await page.waitForTimeout(150);
  const dimensions=await page.locator('#referenceDialog canvas').evaluate(c=>({width:c.width,height:c.height}));
  assert.ok(dimensions.width<=2400&&dimensions.height<=2400);
  await page.locator('#referenceDialog').screenshot({path:out+'/'+sample.id+'.png'});
  await page.locator('#referenceDialog [data-cancel]').click();
  assert.deepEqual(await snapshot(),original,'Loading/cancelling a source must preserve the project');
  results.push({id:sample.id,passed:true,page:number,pageCount:sample.pageCount,dimensions,scope:'Selected original page decoded in actual reference-import dialog; cancelled without calibration or geometry changes'});
  console.log(sample.id+' reference read PASS');
 }
 const gallery=await context.newPage();gallery.on('pageerror',e=>errors.push(e.message));
 await gallery.goto(new URL(corpus+'/gallery.html',base).href);
 assert.equal(await gallery.locator('article').count(),manifest.samples.length);
 for(let i=0;i<manifest.samples.length;i++){
  const card=gallery.locator('article').nth(i);await card.scrollIntoViewIfNeeded();
  await card.locator('img').evaluate(img=>img.decode());
  assert.ok(await card.locator('img').evaluate(img=>img.naturalWidth>0));
 }
 await gallery.locator('#state').selectOption('accepted');assert.equal(await gallery.locator('article:visible').count(),4);
 await gallery.locator('#state').selectOption('collected');assert.equal(await gallery.locator('article:visible').count(),manifest.samples.length-4);
 await gallery.locator('#state').selectOption('');await gallery.locator('#search').fill('metric');assert.equal(await gallery.locator('article:visible').count(),1);
 await gallery.locator('#search').fill('');await gallery.evaluate(()=>scrollTo(0,0));await gallery.screenshot({path:out+'/gallery-desktop.png'});
 await gallery.evaluate(()=>scrollTo(0,1050));await gallery.screenshot({path:out+'/gallery-middle.png'});
 await gallery.evaluate(()=>scrollTo(0,document.body.scrollHeight));await gallery.screenshot({path:out+'/gallery-bottom.png'});
 await gallery.setViewportSize({width:390,height:844});await gallery.evaluate(()=>scrollTo(0,0));
 assert.ok(await gallery.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await gallery.screenshot({path:out+'/gallery-mobile.png'});
 assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/browser-results.json',JSON.stringify({passed:true,build:await page.locator('html').getAttribute('data-build'),samples:results,gallery:{passed:true,count:manifest.samples.length,accepted:4,collected:manifest.samples.length-4,search:true,mobileNoOverflow:true},errors,timestamp:new Date().toISOString()},null,2)+'\n');
}catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}finally{await context.close();}
