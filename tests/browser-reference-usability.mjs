import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {doorConflicts} from '../src/core/door-clearance.js';
import {area} from '../src/core/geometry.js';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.REFERENCE_TEST_OUT||'docs/verification/NA-reference-usability';
fs.mkdirSync(out,{recursive:true});
const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'floorplan-reference-')),{headless:true,channel:'chrome',viewport:{width:1440,height:1000},acceptDownloads:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
const project=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));
const open=async file=>{
 await page.locator('header details.menu summary').click();await page.locator('#importDrawing').click();
 await page.locator('#drawingIn').setInputFiles(file);
 await page.waitForFunction(()=>document.querySelector('#referenceDialog canvas')?.width>300&&document.querySelector('#referenceDialog canvas')?.height>100);
 await page.waitForTimeout(150);
};
const studio='tests/fixtures/floorplans/originals/cmu-fairfax-studio/original.pdf';
const pass=name=>{checks.push(name);console.log('PASS '+name);};
const clickSource=async(x,y)=>{
 const canvas=page.locator('#referenceDialog canvas'),preview=page.locator('[data-preview]');
 const size=await canvas.evaluate(c=>({width:c.width,height:c.height})),initial=await canvas.boundingBox(),frame=await preview.boundingBox();
 await preview.evaluate((el,p)=>{el.scrollLeft=Math.max(0,p.x-el.clientWidth/2);el.scrollTop=Math.max(0,p.y-el.clientHeight/2);},{x:x*initial.width/size.width,y:y*initial.height/size.height});
 const b=await canvas.boundingBox();assert.ok(b.x+x*b.width/size.width>=frame.x&&b.x+x*b.width/size.width<=frame.x+frame.width);
 await page.mouse.click(b.x+x*b.width/size.width,b.y+y*b.height/size.height);
};
const form=async fields=>{for(const [name,value]of Object.entries(fields))await page.locator(`#roomDialog [name="${name}"]`).fill(String(value));await page.locator('#roomDialog [type=submit]').click();if(await page.locator('#roomDialog').isVisible())throw Error(await page.locator('#roomDialog [role=alert]').innerText());};
const download=async(id,name)=>{const wait=page.waitForEvent('download');await page.locator('#'+id).evaluate(b=>b.click());const d=await wait;await d.saveAs(out+'/'+name);assert.equal(await d.failure(),null);};
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8095/');await page.waitForSelector('#lib .item');await page.waitForFunction(()=>!document.body.classList.contains('busy'));
 const before=await project();await open(studio);
 if(process.argv.includes('--observe')){
  const metrics=await page.locator('#referenceDialog').evaluate(d=>({dialogWidth:d.clientWidth,scrollWidth:d.scrollWidth,canvasWidth:d.querySelector('canvas').getBoundingClientRect().width,initialDistance:d.querySelector('#referenceDistance').value}));
  await page.locator('#referenceDialog').screenshot({path:out+'/before-desktop.png'});
  const canvas=page.locator('#referenceDialog canvas');await canvas.click({position:{x:20,y:100}});await canvas.click({position:{x:120,y:100}});
  await page.locator('#referenceDialog [data-apply]').click();
  const after=await project();
  fs.writeFileSync(out+'/before-results.json',JSON.stringify({build:await page.locator('html').getAttribute('data-build'),metrics,calibratedWithoutEnteringDistance:!!after.referencePlan&&!before?.referencePlan,appliedScale:after.referencePlan?.mmPerPixel,errors,timestamp:new Date().toISOString()},null,2)+'\n');
  console.log('Baseline:',metrics,'calibrated without entering distance:',!!after.referencePlan&&!before?.referencePlan);
 }else{
  assert.equal(await page.locator('#referenceDistance').inputValue(),'');
  assert.ok(await page.locator('#referenceDialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
  await clickSource(194,354);await clickSource(725,354);
  for(const value of ['', '644 sq ft','0 ft','-3 ft']){
   await page.locator('#referenceDistance').fill(value);await page.locator('#referenceDialog [data-apply]').click();
   assert.ok(await page.locator('#referenceDialog').isVisible());assert.match(await page.locator('#referenceDialog [role=alert]').innerText(),/valid distance/);assert.deepEqual(await project(),before);
  }
  await page.locator('#referenceDialog').screenshot({path:out+'/distance-rejected.png'});
  pass('P0: blank, floor-area, zero and negative distance rejected without project changes');
  await page.locator('#referenceDialog [data-cancel]').click();assert.deepEqual(await project(),before);await open(studio);
  const fitWidth=await page.locator('#referenceDialog canvas').evaluate(c=>c.getBoundingClientRect().width);
  for(let i=0;i<4;i++)await page.locator('[data-zoom-in]').click();
  assert.ok(await page.locator('[data-zoom-in]').isDisabled());assert.ok(Math.abs(await page.locator('#referenceDialog canvas').evaluate(c=>c.getBoundingClientRect().width)-fitWidth*4)<1);
  await clickSource(194,354);await clickSource(725,354);
  assert.equal(await page.locator('[data-points]').innerText(),'Selected 2/2 points');
  await page.locator('#referenceDistance').fill(`19' 9"`);await page.locator('#referenceDialog').screenshot({path:out+'/studio-zoom-calibration.png'});
  await page.locator('#referenceDialog [data-apply]').click();await page.waitForSelector('#referenceDialog',{state:'hidden'});
  const calibrated=await project(),ref=calibrated.referencePlan;
  assert.ok(Math.abs(ref.mmPerPixel-6019.8/531)<.03);assert.ok(Math.abs(ref.x+194*ref.mmPerPixel)<25&&Math.abs(ref.y+354*ref.mmPerPixel)<25);
  assert.equal(ref.pixelWidth,900);assert.equal(ref.pixelHeight,1132);
  pass('P1: 4x preview, scrolling, source-pixel endpoints and labelled 19 ft 9 in calibration passed');
  // Missing-dimension drawings never imply a scale; cancelling/reloading preserves an existing reference.
  for(const file of ['tests/fixtures/floorplans/originals/hillside-studio-a1/original.pdf','tests/fixtures/floorplans/originals/imprint-a1/original.pdf','tests/fixtures/floorplans/originals/hillside-corner-b5/original.jpg','tests/fixtures/floorplans/originals/zag-b4-image/original.png']){
   await open(file);assert.equal(await page.locator('#referenceDistance').inputValue(),'');
   assert.match(await page.locator('.reference-guidance').innerText(),/Floor area and pictured furniture do not establish scale/);
   await clickSource(100,100);await clickSource(250,100);await page.locator('#referenceDialog [data-apply]').click();assert.deepEqual(await project(),calibrated);
   await page.locator('#referenceDialog [data-cancel]').click();assert.deepEqual(await project(),calibrated);
  }
  pass('P0: four undimensioned PDF/JPG/PNG imports require a length; cancellation retains calibrated project');
  await open('tests/fixtures/floorplans/originals/san-diego-plan-b/original.pdf');
  await page.locator('[data-zoom-in]').click();await clickSource(100,100);await page.locator('#referenceDistance').fill('10 ft');
  await page.locator('#referencePage').selectOption('5');await page.waitForFunction(()=>document.querySelector('#referenceDialog canvas')?.width===2400&&!document.querySelector('#referenceDialog [data-apply]').disabled);
  assert.equal(await page.locator('#referenceDistance').inputValue(),'');assert.equal(await page.locator('[data-points]').innerText(),'Selected 0/2 points');assert.equal(await page.locator('[data-zoom-status]').innerText(),'Preview zoom: 100%');
  await page.locator('#referenceDialog [data-cancel]').click();assert.deepEqual(await project(),calibrated);
  pass('P0: PDF page change clears old distance and endpoints and resets preview zoom');
  await page.setViewportSize({width:390,height:844});await open(studio);
  await page.locator('[data-zoom-in]').click();await page.locator('[data-zoom-in]').click();await clickSource(194,354);await clickSource(725,354);
  assert.ok(await page.locator('#referenceDialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[data-zoom-fit]').click();assert.equal(await page.locator('[data-zoom-status]').innerText(),'Preview zoom: 100%');
  assert.equal(await page.locator('[data-points]').innerText(),'Selected 2/2 points');
  await page.locator('#referenceDialog [data-cancel]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mobile-preview.png'});
  await page.locator('#referenceDistance').fill(`19' 9"`);await page.locator('#referenceDialog [data-apply]').click();await page.waitForSelector('#referenceDialog',{state:'hidden'});
  assert.ok(Math.abs((await project()).referencePlan.mmPerPixel-ref.mmPerPixel)<.1);
  await page.setViewportSize({width:1440,height:1000});await page.locator('#undo').click();assert.deepEqual((await project()).referencePlan,ref);
  pass('P1: 390px preview zoom/scroll/fit and actual calibration preserve source coordinates without outer overflow');
  // One labelled Studio room only. Source pillars, other rooms, door sizes and height are not certified.
  await page.locator('header details.menu summary').click();await page.locator('#newRoom').click();await form({name:'CMU Studio - labelled rectangle test only',width:`19' 9"`,depth:`11' 8"`,height:'8 ft','wall-top':'4 in','wall-right':'4 in','wall-bottom':'4 in','wall-left':'4 in'});
  const room=await project();assert.ok(Math.abs(room.roomEditor.rooms[0].width-6019.8)<1e-8);assert.ok(Math.abs(room.roomEditor.rooms[0].depth-3556)<1e-8);assert.deepEqual(room.referencePlan,ref);
  await page.locator('#editRoom').click();await page.locator('#parentWall').selectOption('top');await page.locator('[data-add=door]').click();
  await form({offset:'7 ft 6 in',width:'2 ft 6 in',height:'6 ft 8 in'});
  await page.locator('#furnitureTab').click();await page.locator('#furnitureSearch').fill('queen');await page.locator('#lib .item').click();
  for(const [id,value]of Object.entries({fX:'8 ft 9 in',fY:'3 ft 5 in'})){await page.locator('#'+id).fill(value);await page.locator('#'+id).press('Tab');}
  assert.equal(doorConflicts(await project()).length,1);
  for(const [id,value]of Object.entries({fX:'14 ft',fY:'7 ft'})){await page.locator('#'+id).fill(value);await page.locator('#'+id).press('Tab');}
  assert.equal(doorConflicts(await project()).length,0);
  for(const item of [{search:'wardrobe',name:'Test wardrobe',width:'4 ft',depth:'2 ft',x:'3 ft',y:'5 ft'},{search:'desk',name:'Test desk',width:'4 ft',depth:'2 ft',x:'7 ft',y:'9 ft 6 in'}]){
   await page.locator('#furnitureSearch').fill(item.search);await page.locator('#lib .item').first().click();
   for(const [id,value]of Object.entries({fName:item.name,fW:item.width,fD:item.depth,fX:item.x,fY:item.y})){await page.locator('#'+id).fill(value);await page.locator('#'+id).press('Tab');}
  }
  const saved=await project();assert.equal(doorConflicts(saved).length,0);assert.equal(saved.furniture.length,3);
  const r=saved.roomEditor.rooms[0];for(const f of saved.furniture){assert.ok(f.cx-f.w/2>=0&&f.cy-f.d/2>=0&&f.cx+f.w/2<=r.width&&f.cy+f.d/2<=r.depth);}
  for(let i=0;i<saved.furniture.length;i++)for(let j=i+1;j<saved.furniture.length;j++){const a=saved.furniture[i],b=saved.furniture[j];assert.ok(Math.abs(a.cx-b.cx)>=(a.w+b.w)/2||Math.abs(a.cy-b.cy)>=(a.d+b.d)/2);}
  pass('Studio labelled rectangle: Queen footprint, door conflict/clearance and three non-overlapping interior objects passed');
  await page.locator('#toggleReference').evaluate(b=>b.click());await page.locator('#fit').click();await download('exportJson','studio-room-project.json');await download('exportPng','studio-room-2d.png');
  const exported=await project();await page.reload();await page.waitForSelector('#lib .item');for(const key of ['geometry','roomEditor','referencePlan','furniture'])assert.deepEqual((await project())[key],exported[key]);
  await page.locator('#fileIn').setInputFiles(out+'/studio-room-project.json');await page.waitForTimeout(200);for(const key of ['geometry','roomEditor','referencePlan','furniture'])assert.deepEqual((await project())[key],exported[key]);
  await page.locator('#editRoom').click();await page.locator('[data-room-edit]').click();await form({width:'20 ft'});await page.locator('#undo').click();assert.deepEqual((await project()).geometry,exported.geometry);await page.locator('#redo').click();assert.notDeepEqual((await project()).geometry,exported.geometry);await page.locator('#undo').click();
  await page.screenshot({path:out+'/studio-room-2d-screen.png'});pass('Studio rectangle actual JSON/2D downloads, reload/import and exact edit undo/redo passed');
  await page.locator('header details.menu summary').click();await page.locator('#exportView').selectOption('3d');await download('exportPng','studio-room-3d.png');
  await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>document.body.classList.contains('m3d')&&!document.body.classList.contains('busy'));await page.waitForTimeout(600);await page.screenshot({path:out+'/studio-room-3d-screen.png'});
  await page.locator('[data-view="2d"]').click();if(!await page.locator('#printPaper').isVisible())await page.locator('header details.menu summary').click();
  await page.locator('#printPaper').selectOption('letter');await page.locator('#printScale').selectOption('fit');const popup=context.waitForEvent('page');await page.locator('#printPlan').evaluate(b=>b.click());const print=await popup;await print.waitForLoadState();await print.emulateMedia({media:'print'});await print.pdf({path:out+'/studio-room-print.pdf',preferCSSPageSize:true,printBackground:true});await print.close();
  pass('Studio rectangle 3D PNG and actual US Letter print-preview PDF exported');
  assert.deepEqual(errors,[]);
  const netSqFt=area(exported.geometry.rooms[0].poly)/.3048**2;assert.ok(Math.abs(netSqFt-19.75*(11+8/12))<1e-8);
  fs.writeFileSync(out+'/browser-results.json',JSON.stringify({passed:true,build:await page.locator('html').getAttribute('data-build'),checks,errors,calibration:{label:'19 ft 9 in',mm:6019.8,sourcePixels:[900,1132],sourceEndpoints:[[194,354],[725,354]],mmPerPixel:ref.mmPerPixel,otherLabel:'11 ft 8 in',approximateVerticalSpanPixels:321,inferredVerticalMm:321*ref.mmPerPixel},room:{scope:'Labelled Studio rectangle only; source apartment is NOT fully accepted',netSqFt,furniture:3,doorDimensionsAssumed:true,heightAndWallThicknessAssumed:true,pillarsExcludedFromModel:true},timestamp:new Date().toISOString()},null,2)+'\n');
 }
}catch(error){await page.screenshot({path:out+'/failure.png'});fs.writeFileSync(out+'/failure-results.json',JSON.stringify({passed:false,error:error.message,checks,errors},null,2)+'\n');throw error;}finally{await context.close();}
