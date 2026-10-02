import {createRequire} from 'node:module';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {fixture,FT,SIDES} from './helpers/house-fixture.js';import {auditHouse} from './helpers/audit-house.js';import {LIB} from '../src/data/catalogs.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const spec=fixture(process.argv[2]||'plan-b'),out='docs/verification/NA-complete-houses/'+spec.id;
const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'floorplan-complete-')),{headless:true,channel:'chrome',viewport:{width:1440,height:1000},acceptDownloads:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await context.newPage(),errors=[],checks=[],ids={},openingIds={};page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
const project=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2'))),pass=t=>{checks.push(t);console.log('PASS '+t);},mm=n=>n*FT+' mm';
const apply=async()=>{await page.locator('#roomDialog [type=submit]').click();if(await page.locator('#roomDialog').isVisible())throw Error(await page.locator('#roomDialog [role=alert]').innerText());};
const form=async(fields,selects={})=>{for(const [n,v]of Object.entries(selects))await page.locator(`#roomDialog [name="${n}"]`).selectOption(v);for(const [n,v]of Object.entries(fields))await page.locator(`#roomDialog [name="${n}"]`).fill(String(v));await apply();};
const download=async(id,name)=>{const event=page.waitForEvent('download',{timeout:60000});await page.locator('#'+id).evaluate(b=>b.click());const d=await event;await d.saveAs(out+'/'+name);assert.equal(await d.failure(),null);};
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8095/');await page.waitForSelector('#lib .item');if(await page.locator('html').getAttribute('lang')!=='en')await page.locator('#langBtn').click();await page.locator('#projectUnits').selectOption('imperial');
 await page.locator('#drawingIn').setInputFiles(out+'/source-a1.pdf');await page.waitForFunction(()=>document.querySelector('#referenceDialog canvas')?.width===2400&&document.querySelector('#referenceDialog [data-apply]').disabled===false);
 const canvas=page.locator('#referenceDialog canvas'),b=await canvas.boundingBox(),[x,y]=spec.originPdf,width=Math.max(...spec.footprint.map(p=>p[0]));
 for(const xx of [x,x+width*spec.pdfPointsPerFoot])await canvas.click({position:{x:b.width*xx/1224,y:b.height*y/792}});
 await page.locator('#referenceDistance').fill(width+' ft');await page.locator('#referenceDialog [data-apply]').click();await page.waitForSelector('#referenceDialog',{state:'hidden'});pass('source A1 PDF rendered and calibrated using dimensioned exterior corners');
 for(const [i,r]of spec.rooms.entries()){
  const fields={name:r.name,width:mm(r.width),depth:mm(r.depth),height:'8 ft',...Object.fromEntries(SIDES.map((s,j)=>['wall-'+s,(r.segments?.[s]?0:r.walls[j])+' in']))};
  if(r.notch){fields['notch-width']=mm(r.notch.width);fields['notch-depth']=mm(r.notch.depth);}const roomSelects=r.notch?{'notch-corner':r.notch.corner}:{};
  if(!i){await page.locator('#newRoom').evaluate(b=>b.click());await form(fields,roomSelects);await page.locator('#editRoom').click();await page.locator('[data-room-edit]').click();await form({x:mm(r.x),y:mm(r.y)});}else{await page.locator('#editRoom').click();await page.locator('[data-room-add]').click();await form({...fields,x:mm(r.x),y:mm(r.y)},roomSelects);}
  let p=await project();ids[r.id]=p.roomEditor.rooms.find(rr=>p.rooms[rr.id].name===r.name).id;
  for(const [side,rows]of Object.entries(r.segments||{})){
   await page.locator('#activeRoom').selectOption(ids[r.id]);await page.locator('#parentWall').selectOption(side);await page.locator('[data-wall-edit]').click();await page.locator('#roomDialog [name=thickness]').fill(r.walls[SIDES.indexOf(side)]+' in');await page.locator('[data-segment-clear]').click();
   for(const [offset,length,height]of rows){await page.locator('[data-segment-add]').click();const row=page.locator('[data-segment]').last();for(const [k,v]of Object.entries({offset,length,height}))await row.locator(`[name$="-${k}"]`).fill(mm(v));}await apply();
  }
  console.log('ROOM '+r.name);
 }
 pass('every source room, closet, laundry and circulation zone created through room forms');
 for(const o of spec.openings){
  await page.locator('#activeRoom').selectOption(ids[o.room]);await page.locator('#parentWall').selectOption(o.side);await page.locator(`[data-add=${o.type}]`).click();
  const fields={offset:mm(o.offset),width:mm(o.width),height:mm(o.height??(6+8/12))},selects={wallId:o.side};
  if(o.type==='door'){selects.mode=o.mode||'swing';if(!o.mode)selects.hinge=o.hinge;if(o.pairedWith)selects.pairedWith=openingIds[o.pairedWith];if(!o.mode||o.mode==='bifold')selects.swing=o.swing;}else fields.sill=mm(6+8/12-o.height);
  await form(fields,selects);openingIds[o.id]=(await project()).roomEditor.openings.at(-1).id;console.log('OPENING '+o.id);
 }
 pass('all scheduled swing/sliding/bifold doors and windows created through opening forms');
 for(const f of spec.furniture){
  await page.locator('#furnitureTab').click();await page.locator('#clearFurnitureSearch').click();const ci=LIB.findIndex(c=>c.items.some(it=>it[0]===f.type)),ii=LIB[ci].items.findIndex(it=>it[0]===f.type);await page.locator(`#lib [data-key="${ci}:${ii}"]`).click();
  for(const [id,v]of Object.entries({fName:f.name,fW:mm(f.w),fD:mm(f.d),fX:mm(f.x),fY:mm(f.y)})){await page.locator('#'+id).fill(v);await page.locator('#'+id).press('Tab');}if(f.rot){await page.locator('#fR').fill(String(f.rot));await page.locator('#fR').press('Tab');}
 }
 await page.locator('#fileName').evaluate((e,name)=>{e.value=name;e.dispatchEvent(new Event('change',{bubbles:true}));},spec.name);
 let p=await project();const audit=auditHouse(p,spec);assert.equal(p.furniture.length,spec.furniture.length);pass('independent source outline, net areas, full opening inventory and walkable connection of every space passed');
 // Change an actual sliding door to an open passage, verify editable symbol and exact undo/redo.
 const advanced=spec.openings.find(o=>o.mode==='sliding');await page.locator('#editRoom').click();await page.locator('#activeRoom').selectOption(ids[advanced.room]);const opening=p.roomEditor.openings.find(o=>o.roomId===ids[advanced.room]&&o.mode==='sliding');
 await page.locator(`[data-edit="${opening.id}"]`).click();assert.equal(await page.locator('#roomDialog [name=hinge]').isVisible(),false);await page.locator('#roomDialog [name=mode]').selectOption('passage');await apply();const changed=(await project()).geometry;assert.ok(changed.lintels.some(l=>l.id===opening.id&&l.passage));assert.ok(await page.locator(`#gOpen [data-opening="${opening.id}"]`).count());
 await page.locator('#undo').click();assert.deepEqual((await project()).geometry,p.geometry);await page.locator('#redo').click();assert.deepEqual((await project()).geometry,changed);await page.locator('#undo').click();pass('door mode edit, passage symbol, conditional fields and exact undo/redo passed');
 await page.locator('#toggleReference').evaluate(b=>b.click());await page.locator('#fit').click();await page.screenshot({path:out+'/complete-2d-screen.png'});
 await download('exportJson','complete-project.json');await download('exportPng','complete-2d.png');const saved=await project();
 await page.reload();await page.waitForSelector('#lib .item');assert.deepEqual((await project()).geometry,saved.geometry);await page.locator('#fileIn').setInputFiles(out+'/complete-project.json');await page.waitForTimeout(250);for(const key of ['roomEditor','geometry','rooms','furniture','referencePlan'])assert.deepEqual((await project())[key],saved[key]);pass('actual JSON download, refresh and import preserve full geometry, fixtures and calibrated reference');
 await page.locator('header details.menu summary').click();await page.locator('#exportView').selectOption('3d');await download('exportPng','complete-3d.png');await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>document.body.classList.contains('m3d')&&document.querySelector('#view3d canvas')?.getClientRects().length>0);await page.screenshot({path:out+'/complete-3d-screen.png'});pass('full house WebGL and 3D PNG export passed');
 await page.locator('details.view-settings summary').click();await page.locator('[data-cut="1.2"]').click();await page.screenshot({path:out+'/complete-3d-cutaway.png'});await page.locator('[data-en="Full-height display"]').click();await page.locator('[data-view="2d"]').click();
 if(!await page.locator('#printPaper').isVisible())await page.locator('header details.menu summary').click();await page.locator('#printPaper').selectOption('a3');await page.locator('#printScale').selectOption('fit');const popupEvent=context.waitForEvent('page');await page.locator('#printPlan').evaluate(b=>b.click());const print=await popupEvent;await print.waitForLoadState();await print.emulateMedia({media:'print'});await print.pdf({path:out+'/complete-print.pdf',preferCSSPageSize:true,printBackground:true});await print.screenshot({path:out+'/print-preview.png'});await print.close();pass('real print-preview page and PDF generated with net and footprint area');
 await page.waitForFunction(()=>!document.body.classList.contains('busy'));await page.setViewportSize({width:390,height:844});await page.locator('#tgPanel').click();await page.locator('#editRoom').evaluate(b=>b.click());await page.locator('#activeRoom').selectOption(ids[advanced.room]);await page.locator(`[data-edit="${opening.id}"]`).click();await page.locator('#roomDialog [name=mode]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mobile-opening.png'});assert.ok(await page.locator('#roomDialog [name=mode]').isVisible());assert.ok(await page.locator('#roomDialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.locator('[data-cancel]').click();pass('390px mobile opening controls reachable without dialog overflow');
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-results.json',JSON.stringify({passed:true,build:await page.locator('html').getAttribute('data-build'),audit,checks,errors,timestamp:new Date().toISOString()},null,2));
}catch(e){await page.screenshot({path:out+'/failure.png'});fs.writeFileSync(out+'/browser-failure.json',JSON.stringify({error:e.stack,checks,errors},null,2));throw e;}finally{await context.close();}
