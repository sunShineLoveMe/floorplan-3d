const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const OUT=path.resolve(process.env.TEST_OUT||'docs/verification/T02'),URL=process.env.TEST_URL||'http://127.0.0.1:8086';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
let page=await context.newPage();const errors=[],checks=[];
const watch=p=>{p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));};watch(page);
const check=name=>{checks.push(name);console.log('PASS',name)};
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));
const bytes=()=>page.evaluate(()=>localStorage.getItem('floorplan-project-v2'));
const field=(k)=>page.locator(`#roomDialog [name="${k}"]`);
const fill=async fields=>{for(const [k,v]of Object.entries(fields)){const f=field(k);if(await f.evaluate(e=>e.tagName)==='SELECT')await f.selectOption(String(v));else await f.fill(String(v));}};
const apply=async()=>{await page.locator('#roomDialog [type=submit]').click();await page.waitForFunction(()=>!document.querySelector('#roomDialog').open)};
const cancel=()=>page.locator('#roomDialog [data-cancel]').click();
const screen=name=>page.screenshot({path:path.join(OUT,name+'.png')});
const editRoom=()=>page.locator('[data-room-edit]').click();
const mode=async m=>{await page.locator(`[data-view="${m}"]`).click();await page.waitForFunction(m=>!document.body.classList.contains('busy')&&document.body.classList.contains('m3d')===(m==='3d'),m,{timeout:40000});};
const download=async(id,name)=>{const pending=page.waitForEvent('download');await page.locator('details.menu summary').click();await page.locator('#'+id).click();const file=path.join(OUT,name);await(await pending).saveAs(file);return file;};
const same=async previous=>assert.equal(await bytes(),previous);
const pointer=async(x,y)=>page.evaluate(({x,y})=>{const svg=document.querySelector('#plan'),p=svg.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}}, {x,y});
try{
await page.goto(URL);await page.locator('#gFurn [data-fid]').nth(45).waitFor();
await page.locator('#newRoom').click();await fill({width:6000});await page.keyboard.press('Escape');assert.equal(await page.locator('#gFurn [data-fid]').count(),46);assert.equal(await bytes(),null);
await page.locator('#newRoom').click();await fill({name:'T02 bedroom'});await apply();
let p=await saved();assert.equal(p.version,2);assert.equal(p.roomEditor.width,4000);assert.equal(p.furniture.length,0);assert.equal(p.roomEditor.openings.length,0);assert.match(await page.locator('#subtitle').textContent(),/12.00/);
const roomId=p.id;await page.locator('#undo').click();assert.equal(await page.locator('#gRooms .room').count(),13);await page.locator('#redo').click();assert.equal((await saved()).id,roomId);await screen('room-empty');check('new room draft Escape, empty rectangle, area and full project undo/redo');
const before=await bytes();await editRoom();await fill({width:''});await page.locator('#roomDialog [type=submit]').click();assert.ok(await page.locator('.room-error').textContent());await same(before);await cancel();
await editRoom();await apply();await same(before);check('blank input rejected and unchanged submission does not update timestamp/storage');
// Select top wall on the actual SVG, then add the door.
await page.locator('#gWalls [data-wall="top"]').first().click();
await page.locator('[data-add=door]').click();await fill({offset:500,width:900,height:2100});await apply();
p=await saved();const doorId=p.roomEditor.openings[0].id;assert.equal(p.geometry.doors[0].id,doorId);
await page.locator('#parentWall').selectOption('right');await page.locator('[data-add=window]').click();await fill({offset:900,width:1200,sill:900,height:1200});await apply();
p=await saved();const windowId=p.roomEditor.openings[1].id;assert.equal(p.geometry.windows[0].head,2100);assert.equal(p.geometry.windows[0].wallId,'right');
await page.locator(`#gOpen [data-opening="${windowId}"]`).first().click();assert.equal(await page.locator('#parentWall').inputValue(),'right');assert.match(await page.locator('#gSel').textContent(),/→/);await screen('room-door-window');check('SVG wall selection, parent wall, door/window numeric entry and opening selection');
await page.locator('#lib .item').first().click();p=await saved();const furniture=p.furniture;
await editRoom();await fill({width:4500,depth:3200,height:3000});await apply();p=await saved();assert.deepEqual(p.furniture,furniture);assert.equal(p.geometry.height,3000);assert.deepEqual(p.geometry.origin,[2250,1600]);assert.match(await page.locator('#subtitle').textContent(),/14.40/);
await page.locator('#undo').click();assert.equal((await saved()).roomEditor.width,4000);await page.locator('#redo').click();assert.equal((await saved()).roomEditor.width,4500);check('resize keeps furniture, updates area/origin/height and complete undo/redo');
let stable=await bytes();await page.locator(`[data-edit="${windowId}"]`).click();await fill({offset:3000});await page.locator('#roomDialog [type=submit]').click();await same(stable);assert.match(await page.locator('.room-error').textContent(),new RegExp(windowId));await screen('invalid-window');await cancel();
await page.locator('#parentWall').selectOption('top');await page.locator('[data-add=window]').click();await fill({offset:700});await page.locator('#roomDialog [type=submit]').click();await same(stable);assert.match(await page.locator('.room-error').textContent(),/overlap|重叠/);await cancel();
await editRoom();await fill({height:2000});await page.locator('#roomDialog [type=submit]').click();await same(stable);assert.match(await page.locator('.room-error').textContent(),/opening|洞口|门|窗/);await cancel();
await page.locator('#undo').click();assert.equal((await saved()).roomEditor.width,4000);await page.locator('#redo').click();assert.equal((await saved()).roomEditor.width,4500);check('out-of-wall, overlapping and too-high opening reject without saving or adding undo');
// Verify all 16 directions through real form submissions and SVG output.
for(const wallId of ['top','right','bottom','left'])for(const hinge of ['start','end'])for(const swing of ['inward','outward']){
 await page.locator(`[data-edit="${doorId}"]`).click();await fill({wallId,offset:50,width:700,hinge,swing});await apply();p=await saved();const d=p.geometry.doors[0];assert.equal(d.wallId,wallId);assert.equal(d.len,700);assert.equal(p.roomEditor.openings[0].hinge,hinge);assert.equal(p.roomEditor.openings[0].swing,swing);assert.equal(await page.locator(`#gOpen [data-opening="${doorId}"]`).count()>0,true);
}
await page.locator(`[data-delete="${doorId}"]`).click();assert.equal((await saved()).geometry.doors.length,0);await page.locator('#undo').click();assert.equal((await saved()).geometry.doors[0].id,doorId);check('16 door wall/hinge/swing combinations, deletion and stable-ID undo through UI');
await page.locator(`[data-edit="${doorId}"]`).click();await fill({wallId:'top',offset:500,width:900,hinge:'start',swing:'inward'});await apply();
await mode('3d');assert.equal(await page.locator('#view3d canvas').count(),1);await page.waitForTimeout(400);await screen('room-3d');
await editRoom();await fill({width:4700,height:3100});await apply();await page.waitForTimeout(250);await screen('resized-3d');assert.deepEqual((await saved()).furniture,furniture);await page.locator('#undo').click();assert.equal((await saved()).geometry.height,3000);await mode('2d');check('real WebGL preview, live room resize in 3D, undo and 2D return');
// Opening editing while focused must not delete furniture or undo the project.
stable=await bytes();await page.locator(`[data-edit="${doorId}"]`).click();await field('width').focus();await page.keyboard.press('Control+z');await page.keyboard.press('Backspace');await same(stable);await page.keyboard.press('Escape');await same(stable);check('form focus and Escape isolate canvas keyboard actions');
await page.locator('#langBtn').click();await page.locator('#newRoom').click();assert.match(await page.locator('#roomDialog h2').textContent(),/New rectangular room/);await cancel();await page.locator('#langBtn').click();
await page.locator('#panel tr[data-room]').first().click();await page.locator('#rName').fill('T02 bedroom');await page.locator('#rName').press('Tab');await page.locator('#panel [data-mat="walnut"]').click();p=await saved();assert.equal(p.geometry.rooms[0].name,p.rooms[p.roomEditor.roomId].name);assert.equal(p.geometry.rooms[0].mat,'walnut');stable=await bytes();await editRoom();await apply();await same(stable);check('room name/material regenerate geometry and reopening the same room form is a no-op');
const exported=await download('exportJson','rectangle-export.json');const original=JSON.parse(fs.readFileSync(exported));assert.equal(original.version,2);assert.equal(original.templateId,undefined);
await download('exportPng','rectangle-2d.png');
const context2=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});page=await context2.newPage();watch(page);await page.goto(URL);await page.setInputFiles('#fileIn',exported);await page.waitForFunction(()=>document.querySelector('#subtitle').textContent.includes('14.40'));assert.deepEqual((await saved()).roomEditor,original.roomEditor);await page.reload();await page.locator('[data-room-edit]').waitFor();assert.deepEqual((await saved()).geometry,original.geometry);
await page.locator(`[data-edit="${windowId}"]`).click();await fill({sill:800.5});await apply();assert.equal((await saved()).geometry.windows[0].sill,800.5);check('real JSON/PNG downloads, new-context file upload, refresh and continued decimal editing');
// Tampered geometry must leave storage intact.
stable=await bytes();const invalid=structuredClone(original);invalid.geometry.origin[0]+=10;page.once('dialog',d=>d.accept());await page.setInputFiles('#fileIn',{name:'tampered.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});await page.waitForTimeout(100);await same(stable);check('mismatched v2 parameter/snapshot import rejected without replacing the project');
await page.setViewportSize({width:390,height:844});await page.locator('#editRoom').click();await page.locator(`[data-edit="${windowId}"]`).click();await fill({offset:99999});await page.locator('#roomDialog [type=submit]').click();await page.locator('.room-error').scrollIntoViewIfNeeded();await screen('narrow-error');await cancel();await page.locator('[data-room-edit]').click();await fill({width:4600});await apply();await screen('narrow-room');check('390x844 drawer, numeric form, error, cancel and apply are accessible');
await context2.close();assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'browser-t02-results.json'),JSON.stringify({browser:browser.version(),checks,errors},null,2));
}catch(e){console.error(e);await page.screenshot({path:path.join(OUT,'t02-failure.png')});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
