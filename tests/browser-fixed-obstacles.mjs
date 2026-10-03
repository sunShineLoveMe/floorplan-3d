import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {obstacleConflicts} from '../src/core/obstacle-clearance.js';
import {roomArea} from '../src/core/geometry.js';
import {validate} from '../src/data/project-data.js';
import {CATALOGS} from '../src/data/catalogs.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.OBSTACLE_TEST_OUT||'docs/verification/NA-fixed-obstacles';fs.mkdirSync(out,{recursive:true});
const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'floorplan-obstacles-')),{headless:true,channel:'chrome',viewport:{width:1440,height:1000},acceptDownloads:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await context.newPage(),errors=[],checks=[],cases=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
const ready=()=>page.waitForFunction(()=>!document.body.classList.contains('busy'));
const project=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));
const pass=name=>{checks.push(name);console.log('PASS '+name);};
const fields=async values=>{for(const [name,value]of Object.entries(values))await page.locator(`#roomDialog [name="${name}"]`).fill(String(value));};
const submit=async(values={})=>{await fields(values);await page.locator('#roomDialog [type=submit]').click();};
const apply=async values=>{await submit(values);if(await page.locator('#roomDialog').isVisible())throw Error(await page.locator('#roomDialog [role=alert]').innerText());};
const structure=async()=>{await page.locator('#editRoom').click();};
const add=async values=>{await page.locator('[data-obstacle-add]').click();await apply(values);};
const download=async(id,name)=>{const wait=page.waitForEvent('download');await page.locator('#'+id).evaluate(b=>b.click());const d=await wait;await d.saveAs(out+'/'+name);assert.equal(await d.failure(),null);};
const snapshot=async prefix=>{
 const p=validate(await project(),CATALOGS);await page.locator('#fit').click();if(!await page.locator('#exportView').isVisible())await page.locator('header details.menu summary').click();await download('exportJson',prefix+'-project.json');
 if(!await page.locator('#exportView').isVisible())await page.locator('header details.menu summary').click();await page.locator('#exportView').selectOption('2d');await download('exportPng',prefix+'-2d.png');await page.screenshot({path:out+'/'+prefix+'-2d-screen.png'});
 if(!await page.locator('#exportView').isVisible())await page.locator('header details.menu summary').click();await page.locator('#exportView').selectOption('3d');await download('exportPng',prefix+'-3d.png');await ready();await page.waitForTimeout(400);await page.screenshot({path:out+'/'+prefix+'-3d-screen.png'});
 await page.locator('[data-view="2d"]').click();await ready();await page.waitForFunction(()=>!document.body.classList.contains('m3d'));if(!await page.locator('#printPaper').isVisible())await page.locator('header details.menu summary').click();await page.locator('#printPaper').selectOption('letter');await page.locator('#printScale').selectOption('fit');
 const popup=context.waitForEvent('page');await page.locator('#printPlan').evaluate(b=>b.click());const print=await popup;await print.waitForLoadState();
 const text=await print.locator('body').innerText();assert.match(text,new RegExp('Fixed obstacles: '+p.geometry.obstacles.length));assert.match(text,/exclude fixed footprints/);
 await print.emulateMedia({media:'print'});await print.pdf({path:out+'/'+prefix+'-print.pdf',preferCSSPageSize:true,printBackground:true});await print.close();
 cases.push({prefix,usableSqFt:roomArea(p.geometry.rooms[0])/.3048**2,obstacles:p.geometry.obstacles.length,furniture:p.furniture.length,conflicts:obstacleConflicts(p).length,scope:'Labelled room only; obstacle/door/height/wall dimensions are test assumptions, full apartment not accepted'});
 return p;
};
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8095/');await page.waitForSelector('#lib .item');await ready();
 if(await page.locator('html').getAttribute('lang')!=='en')await page.locator('#langBtn').click();
 await page.locator('#fileIn').setInputFiles('docs/verification/NA-reference-usability/studio-room-project.json');await page.waitForTimeout(250);await ready();const original=await project();await structure();
 await page.locator('[data-obstacle-add]').click();assert.equal(await page.locator('#roomDialog [name=width]').inputValue(),'');assert.equal(await page.locator('#roomDialog [name=depth]').inputValue(),'');
 await submit();assert.ok(await page.locator('#roomDialog').isVisible());assert.deepEqual(await project(),original);assert.equal(await page.locator('#roomDialog [name=width]').getAttribute('aria-invalid'),'true');
 await apply({name:'Assumed 12 in left column',width:'12 in',depth:'12 in',x:'0 ft',y:'0 ft'});
 await add({name:'Assumed 12 in right column',width:'12 in',depth:'12 in',x:'18 ft 9 in',y:'0 ft'});
 const two=await project();assert.equal(two.geometry.obstacles.length,2);assert.ok(Math.abs(roomArea(two.geometry.rooms[0])/.3048**2-(230.41666666666666-2))<1e-8);assert.equal(await page.locator('#gObstacles rect').count(),2);
 const areaText=await page.locator('#gLabels').textContent();assert.match(areaText,/228.42/);assert.match(await page.locator('#roomList').innerText(),/228.42/);
 pass('Blank dimensions reject atomically; two independently editable columns deduct exactly 2 sq ft');
 await page.locator('[data-obstacle-add]').click();for(const values of [{name:'Invalid assumption',width:'1 ft',depth:'1 ft',x:'0 ft',y:'0 ft'},{x:'19 ft 3 in',y:'2 ft'},{x:'2 ft',height:'9 ft'}]){await submit(values);assert.ok(await page.locator('#roomDialog').isVisible());assert.deepEqual(await project(),two);}
 await page.locator('#roomDialog [data-cancel]').click();
 // A smaller room cannot silently clip a column. Draft and selection remain editable.
 await structure();await page.locator('[data-room-edit]').click();await submit({width:'18 ft'});assert.ok(await page.locator('#roomDialog').isVisible());assert.deepEqual((await project()).geometry,two.geometry);await page.locator('#roomDialog [data-cancel]').click();
 pass('Overlap, outside-room, over-height and clipping resize reject without changing geometry');
 await page.locator('[data-obstacle-edit]').first().click();await apply({x:'7 ft 9 in',y:'0 ft'});const doorCollision=await project();assert.ok(obstacleConflicts(doorCollision).some(c=>c.kind==='door'));
 assert.ok(await page.locator('#clearanceStatus').isVisible());assert.ok(await page.locator('#gWarnings path').count());assert.ok(await page.locator('#gWarnings [data-obstacle-warning]').count());await page.screenshot({path:out+'/door-column-conflict.png'});
 await page.locator('#clearanceStatus').click();assert.ok(await page.locator('[data-obstacle-edit]').first().isVisible());await page.locator('[data-obstacle-edit]').first().click();await apply({x:'0 ft'});assert.equal(obstacleConflicts(await project()).length,0);
 pass('Moving a column into a swing warns and locates the room; correction clears the warning');
 const desk=(await project()).furniture.find(f=>f.type==='desk');await add({name:'Assumed desk obstruction',width:'12 in',depth:'12 in',x:(desk.cx-152.4)+' mm',y:(desk.cy-152.4)+' mm'});
 assert.ok(obstacleConflicts(await project()).some(c=>c.furnitureId===desk.id));await page.screenshot({path:out+'/furniture-column-conflict.png'});
 await page.locator('[data-obstacle-edit]').last().click();await apply({x:'0 ft',y:'5 ft',height:'4 ft'});assert.equal(obstacleConflicts(await project()).length,0);
 await page.locator('details.view-settings summary').click();await page.locator('[data-layer=furn]').click();assert.equal(await page.locator('#gFurn').getAttribute('display'),'none');assert.equal(await page.locator('#gObstacles rect').count(),3);await page.locator('[data-layer=furn]').click();await page.keyboard.press('Escape');
 pass('Fixed structures collide with furniture, remain visible with furniture hidden, and clear on correction');
 const three=await project();await page.locator('[data-obstacle-delete]').last().click();assert.equal((await project()).geometry.obstacles.length,2);await page.locator('#undo').click();assert.deepEqual((await project()).geometry,three.geometry);await page.locator('#redo').click();assert.equal((await project()).geometry.obstacles.length,2);await page.locator('#undo').click();
 page.once('dialog',d=>d.accept());await page.locator('#clearAll').evaluate(b=>b.click());assert.equal((await project()).furniture.length,0);assert.deepEqual((await project()).geometry,three.geometry);await page.locator('#undo').click();assert.deepEqual((await project()).furniture,three.furniture);
 pass('Delete undo/redo and clear-furniture undo preserve fixed structural geometry');
 const studio=await snapshot('studio');await page.reload();await page.waitForSelector('#lib .item');await ready();assert.deepEqual((await project()).geometry,studio.geometry);await page.locator('#fileIn').setInputFiles(out+'/studio-project.json');await page.waitForTimeout(200);await ready();assert.deepEqual((await project()).roomEditor,studio.roomEditor);await structure();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);if(!await page.locator('[data-obstacle-add]').isVisible())await page.locator('#tgPanel').click();await page.locator('[data-obstacle-add]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('#roomDialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));await page.locator('#roomDialog [data-cancel]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mobile-obstacle-form.png'});await page.locator('#roomDialog [data-cancel]').click();await page.setViewportSize({width:1440,height:1000});
 pass('Studio JSON/PNG/3D/Letter PDF, reload/import and 390px obstacle form passed');
 // Second real source. Room dimensions are labelled; all structural detail values below are explicitly assumed.
 await page.locator('#importDrawing').evaluate(b=>b.click());await page.locator('#drawingIn').setInputFiles('tests/fixtures/floorplans/originals/cmu-fairfax-two-bedroom/original.pdf');await page.waitForFunction(()=>document.querySelector('#referenceDialog canvas')?.width>300);await page.waitForTimeout(150);
 const canvas=page.locator('#referenceDialog canvas'),box=await canvas.boundingBox();for(const [x,y]of [[589,178],[794,178]])await page.mouse.click(box.x+x/1600*box.width,box.y+y/1036*box.height);await page.locator('#referenceDistance').fill('10 ft 10 in');await page.locator('#referenceDialog [data-apply]').click();await page.waitForSelector('#referenceDialog',{state:'hidden'});
 await page.locator('#newRoom').evaluate(b=>b.click());await apply({name:'CMU Bedroom Two - labelled room with test assumptions',width:'10 ft 10 in',depth:'8 ft 6 in',height:'8 ft','wall-top':'4 in','wall-right':'4 in','wall-bottom':'4 in','wall-left':'4 in'});await structure();
 await add({name:'Assumed left column 12 in',width:'12 in',depth:'12 in',x:'0 ft',y:'0 ft'});await add({name:'Assumed right column 12 in',width:'12 in',depth:'12 in',x:'9 ft 10 in',y:'0 ft'});
 await page.locator('[data-add=door]').click();await apply({offset:'7 ft',width:'2 ft 6 in',height:'6 ft 8 in'});
 await page.locator('#furnitureTab').click();await page.locator('#furnitureSearch').fill('twin xl');await page.locator('#lib .item').first().click();
 for(const [id,value]of Object.entries({fX:'3 ft',fY:'4 ft 6 in'})){await page.locator('#'+id).fill(value);await page.locator('#'+id).press('Tab');}
 await page.locator('#furnitureSearch').fill('wardrobe');await page.locator('#lib .item').first().click();for(const [id,value]of Object.entries({fName:'Assumed 3 ft wardrobe',fW:'3 ft',fD:'2 ft',fX:'8 ft',fY:'5 ft'})){await page.locator('#'+id).fill(value);await page.locator('#'+id).press('Tab');}
 assert.equal(obstacleConflicts(await project()).length,0);assert.ok(Math.abs(roomArea((await project()).geometry.rooms[0])/.3048**2-(10+10/12)*8.5+2)<1e-8);
 if((await project()).referencePlan.visible)await page.locator('#toggleReference').evaluate(b=>b.click());await snapshot('bedroom-two');pass('Second official PDF: labelled small bedroom, two assumed columns, Twin XL and exports passed');
 for(const id of ['plan-b','plan-a','plan-c','plan-f']){const file='docs/verification/NA-complete-houses/'+id+'/complete-project.json',old=validate(JSON.parse(fs.readFileSync(file,'utf8')),CATALOGS);await page.locator('#fileIn').setInputFiles(file);await page.waitForTimeout(200);await ready();assert.deepEqual((await project()).geometry,old.geometry);assert.equal(await page.locator('#gObstacles rect').count(),0);assert.equal(await page.locator('#gRooms .room').count(),old.geometry.rooms.length);await page.screenshot({path:out+'/legacy-'+id+'.png'});}
 pass('Four complete houses import with exact original geometry and no phantom obstacles');
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-results.json',JSON.stringify({passed:true,build:await page.locator('html').getAttribute('data-build'),checks,cases,errors,timestamp:new Date().toISOString()},null,2)+'\n');
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});fs.writeFileSync(out+'/failure-results.json',JSON.stringify({passed:false,error:error.message,checks,errors},null,2)+'\n');throw error;}finally{await context.close();}
