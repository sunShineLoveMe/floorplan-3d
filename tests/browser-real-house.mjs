import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='docs/verification/NA-real-house';
const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'floorplan-real-house-')),{headless:true,channel:'chrome',viewport:{width:1440,height:1000},acceptDownloads:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
const project=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));
const pass=name=>{checks.push(name);console.log('PASS '+name);};
const form=async fields=>{for(const [name,value]of Object.entries(fields))await page.locator(`#roomDialog [name="${name}"]`).fill(String(value));await page.locator('#roomDialog [type=submit]').click();if(await page.locator('#roomDialog').isVisible())throw Error(await page.locator('#roomDialog [role=alert]').innerText());};
const download=async (id,name)=>{const event=page.waitForEvent('download',{timeout:60000});await page.locator('#'+id).evaluate(b=>b.click());const d=await event;await d.saveAs(out+'/'+name);assert.equal(await d.failure(),null);return d.suggestedFilename();};
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8095/');await page.waitForSelector('#lib .item');
 await page.locator('#drawingIn').setInputFiles(out+'/san-diego-plan-b.pdf');await page.waitForFunction(()=>document.querySelector('#referencePage')?.options.length===14);await page.locator('#referencePage').selectOption('5');await page.waitForFunction(()=>document.querySelector('#referenceDialog canvas')?.width===2400&&document.querySelector('#referenceDialog [data-apply]').disabled===false);
 // A1 outer top-left/right corners under the labelled 54 ft dimension.
 const canvas=page.locator('#referenceDialog canvas'),box=await canvas.boundingBox();
 for(const x of [199,1378])await canvas.click({position:{x:box.width*x/1978,y:box.height*194/1279}});
 await page.locator('#referenceDistance').fill('54 ft');await page.locator('#referenceDialog [data-apply]').click();await page.waitForSelector('#referenceDialog',{state:'hidden'});
 let p=await project();assert.equal(p.referencePlan.pixelWidth,2400);assert.match(p.referencePlan.name,/5$/);assert.ok(Math.abs(p.referencePlan.mmPerPixel-11.5)<.1);pass('14-page rotated architectural PDF: page 5 and 54 ft calibration');
 // Major zones traced from A1. Labelled net dimensions retained; positions are a simplified manual trace.
 const base={height:'8 ft','wall-top':'6.5 in','wall-right':'4.5 in','wall-bottom':'0','wall-left':'6.5 in'};
 await page.locator('#newRoom').evaluate(b=>b.click());await form({...base,name:'Dining',width:'10 ft 8 in',depth:'9 ft 6 in'});
 await page.locator('#editRoom').click();await page.locator('[data-room-edit]').click();await form({x:'165.1 mm',y:'165.1 mm'});
 const dining=(await project()).roomEditor.rooms[0].id,ids={Dining:dining};
 const zones=[
  {name:'Kitchen',x:3530.6,y:165.1,width:'10 ft',depth:'10 ft 8 in',left:114.3,right:114.3,top:165.1,bottom:0},
  {name:'Bath',x:6692.9,y:165.1,width:'6 ft',depth:'10 ft 8 in',left:114.3,right:114.3,top:165.1,bottom:114.3},
  {name:'Bedroom 1',x:8636,y:165.1,width:'9 ft 8 in',depth:'10 ft 8 in',left:114.3,right:114.3,top:165.1,bottom:114.3},
  {name:'Bedroom 2',x:12828,y:165.1,width:'10 ft 10 in',depth:'15 ft',left:114.3,right:165.1,top:165.1,bottom:165.1},
  {name:'Entry',x:165.1,y:3060.7,width:'10 ft 8 in',depth:'1689.1 mm',left:165.1,right:0,top:0,bottom:0},
  {name:'Hall west',x:3530.6,y:3416.3,width:'3162.3 mm',depth:'1333.5 mm',left:0,right:0,top:0,bottom:0},
  {name:'Hall east',x:6692.9,y:3530.6,width:'6020.8 mm',depth:'1206.5 mm',left:0,right:114.3,top:0,bottom:165.1},
  {name:'Living',x:165.1,y:4749.8,width:'20 ft',depth:'16 ft',left:165.1,right:165.1,top:0,bottom:165.1}
 ];
 for(const z of zones){await page.locator('[data-room-add]').click();await form({name:z.name,x:z.x+' mm',y:z.y+' mm',width:z.width,depth:z.depth,'wall-left':z.left+' mm','wall-right':z.right+' mm','wall-top':z.top+' mm','wall-bottom':z.bottom+' mm'});p=await project();ids[z.name]=p.roomEditor.rooms.at(-1).id;}
 p=await project();assert.equal(p.roomEditor.rooms.length,9);assert.ok(p.referencePlan);assert.equal(p.geometry.height,2438.4);
 assert.ok(!p.geometry.walls.some(w=>w[0]<3400&&w[2]>200&&w[1]<3061&&w[3]>3060),'dining/entry open boundary blocked');
 assert.ok(!p.geometry.walls.some(w=>w[0]<6200&&w[2]>200&&w[1]<4750&&w[3]>4749),'living open boundary blocked');pass('nine traced zones: 6 labelled rooms plus entry/hall, open L-shaped circulation, mixed wall widths');
 // Both sides of the bedroom shared wall must be cut by its one owned door.
 await page.locator('#activeRoom').selectOption(ids['Bedroom 1']);await page.locator('#parentWall').selectOption('bottom');await page.locator('[data-add=door]').click();await form({offset:'1 mm',width:'3 ft',height:'6 ft 8 in'});
 p=await project();const door=p.geometry.doors[0];assert.equal(door.len,914.4);assert.ok(!p.geometry.walls.some(w=>Math.min(w[2],door.rect[2])-Math.max(w[0],door.rect[0])>1e-6&&Math.min(w[3],door.rect[3])-Math.max(w[1],door.rect[1])>1e-6));
 await page.locator('#parentWall').selectOption('top');await page.locator('[data-add=window]').click();await form({offset:'2 ft',width:'6 ft',height:'4 ft',sill:'3 ft'});pass('Bedroom 1 shared-wall 36 in door and 72×48 in exterior window');
 // Changing a wall with an existing opening to open must be rejected without mutation.
 await page.locator('[data-room-edit]').click();const before=JSON.stringify(await project());await page.locator('#roomDialog [name=wall-top]').fill('0');await page.locator('#roomDialog [type=submit]').click();assert.match(await page.locator('#roomDialog [role=alert]').innerText(),/open boundary/);assert.equal(JSON.stringify(await project()),before);await page.locator('#roomDialog [data-cancel]').click();pass('invalid open boundary preserves the complete project');
 await page.locator('#activeRoom').selectOption(ids.Entry);await page.locator('#parentWall').selectOption('bottom');assert.ok(await page.locator('[data-add=door]').isDisabled());pass('open edge disables door/window insertion');
 await page.locator('#furnitureSearch').fill('queen');await page.locator('#lib .item').click();await page.locator('#fX').fill('32 ft');await page.locator('#fX').press('Tab');await page.locator('#fY').fill('7 ft');await page.locator('#fY').press('Tab');
 p=await project();assert.equal(p.furniture[0].w,1524);assert.equal(p.furniture[0].d,2032);assert.ok(await page.locator('#stage').innerText().then(t=>t.includes('1 potential door conflicts')));await page.locator('#fY').fill('5 ft');await page.locator('#fY').press('Tab');assert.ok(!(await page.locator('#stage').innerText()).includes('1 potential door conflicts'));pass('Queen size/position, blocked door warning, and warning clears after moving');
 await page.locator('#fileName').evaluate(e=>{e.value='San Diego Plan B - manual reference';e.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('#fit').click();
 await page.screenshot({path:out+'/house-2d.png'});
 const saved=await project();const jsonName=await download('exportJson','house-project.json');await page.reload();await page.waitForSelector('#gReference image');assert.deepEqual((await project()).roomEditor,saved.roomEditor);
 await page.locator('#fileIn').setInputFiles(out+'/house-project.json');await page.waitForTimeout(150);p=await project();for(const key of ['roomEditor','geometry','referencePlan','rooms','furniture'])assert.deepEqual(p[key],saved[key]);pass('JSON download/import and refresh preserve all rooms, wall widths, openings, furniture and drawing');
 await page.locator('#editRoom').click();await page.locator('#activeRoom').selectOption(ids.Living);await page.locator('[data-room-edit]').click();await form({'wall-right':'7 in'});const revised=(await project()).geometry;assert.notDeepEqual(revised,saved.geometry);await page.locator('#undo').click();assert.deepEqual((await project()).geometry,saved.geometry);await page.locator('#redo').click();assert.deepEqual((await project()).geometry,revised);await page.locator('#undo').click();pass('wall edit undo/redo restores exact geometry');
 await download('exportPng','house-2d-export.png');pass('2D PNG downloaded');
 await page.locator('header details.menu summary').click();await page.locator('#exportView').selectOption('3d');await download('exportPng','house-3d-export.png');await page.screenshot({path:out+'/house-3d.png'});pass('3D initialization and PNG downloaded');
 await page.locator('[data-view="2d"]').click();await page.waitForFunction(()=>!document.body.classList.contains('busy'));await page.setViewportSize({width:390,height:844});await page.locator('#tgPanel').click();await page.locator('#activeRoom').selectOption(ids['Bedroom 1']);await page.locator('[data-room-edit]').click();await page.locator('#roomDialog [name=wall-bottom]').scrollIntoViewIfNeeded();assert.ok(await page.locator('#roomDialog [name=wall-bottom]').isVisible());await page.screenshot({path:out+'/mobile-wall-fields.png'});await page.locator('#roomDialog [data-cancel]').click();pass('390px wall fields are reachable');
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-results.json',JSON.stringify({passed:true,build:await page.locator('html').getAttribute('data-build'),checks,errors,jsonName,timestamp:new Date().toISOString()},null,2));
}catch(e){console.error(e);await page.screenshot({path:out+'/failure.png'});fs.writeFileSync(out+'/browser-failure.json',JSON.stringify({error:e.message,errors,checks},null,2));throw e;}finally{await context.close();}
