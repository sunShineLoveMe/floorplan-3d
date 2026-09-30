/* Optional: run with PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE pointing at an existing installation.
   No browser dependency or download is added to the application. Uses a fresh, isolated browser context. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const OUT=path.resolve('docs/verification/T01.1'),URL=process.env.TEST_URL || 'http://127.0.0.1:8086';
const custom=JSON.parse(fs.readFileSync('tests/fixtures/custom-project.json'));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page=await context.newPage(),errors=[],checks=[],timings={};
 page.on('pageerror',e=>errors.push(e.message));
 const check=(name,data={})=>{checks.push({name,...data});console.log('PASS',name)};
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v1')));
 const menu=async id=>{await page.locator('details.menu summary').click();await page.locator('#'+id).click()};
 const download=async(id,name)=>{const pending=page.waitForEvent('download');await menu(id);const d=await pending;const p=path.join(OUT,name);await d.saveAs(p);return p;};
 const screen=async name=>page.screenshot({path:path.join(OUT,name+'.png')});
 const mode=async m=>{const start=Date.now();await page.locator(`[data-view="${m}"]`).click();await page.waitForFunction(m=>!document.body.classList.contains('busy') && document.body.classList.contains('m3d')===(m==='3d'),m,{timeout:30000});return Date.now()-start};
 const input=async(id,v)=>{await page.locator('#'+id).fill(String(v));await page.locator('#'+id).press('Tab')};
 const point=async(x,y)=>page.evaluate(({x,y})=>{const svg=document.querySelector('#plan'),p=svg.createSVGPoint();p.x=x;p.y=y;const t=p.matrixTransform(svg.getScreenCTM());return {x:t.x,y:t.y}}, {x,y});
 const mmclick=async(x,y)=>{const p=await point(x,y);await page.mouse.click(p.x,p.y)};
 const importCustom=async()=>{await page.setInputFiles('#fileIn','tests/fixtures/custom-project.json');await page.waitForFunction(()=>document.querySelectorAll('#gRooms polygon.room').length===1);};
 try{
 let start=Date.now();await page.goto(URL);await page.locator('#gFurn [data-fid]').nth(45).waitFor();timings.initial2D=Date.now()-start;
 assert.equal(await page.locator('#gRooms polygon.room').count(),13);assert.match(await page.locator('#subtitle').textContent(),/87.18/);
 const baseline=JSON.parse(fs.readFileSync(path.join(OUT,'baseline-project.json'))),sample=JSON.parse(fs.readFileSync(await download('exportJson','sample-export.json')));
 assert.deepEqual(sample.geometry,baseline.geometry);assert.deepEqual(sample.furniture.map(({id,...f})=>f),baseline.furniture.map(({id,...f})=>f));await screen('sample-2d');check('sample geometry, 46 furniture and area match baseline');
 timings.sampleEnter3D=await mode('3d');await screen('sample-3d');assert.equal(await page.locator('#view3d canvas').count(),1);timings.sampleExit3D=await mode('2d');check('sample 2D / 3D transition');
 await page.locator('#lib .item').first().click();assert.equal((await saved()).furniture.length,47);check('library click adds one item');
 await input('fW',1234);await input('fD',654);await input('fX',7500.25);await input('fY',9000.5);await input('fR',30);const id=(await saved()).furniture.at(-1).id;
 let f=(await saved()).furniture.find(x=>x.id===id);assert.equal(f.w,1234);assert.equal(f.cx,7500.25);await page.locator('#aRot').click();assert.equal((await saved()).furniture.find(x=>x.id===id).rot,120);
 await page.locator('#aDup').click();assert.equal((await saved()).furniture.length,48);await page.locator('#aDel').click();assert.equal((await saved()).furniture.length,47);check('dimensions, decimal position, rotation, duplicate and delete');
 // Use the independent room for unobstructed pointer movement and exact field checks.
 await importCustom();assert.match(await page.locator('#subtitle').textContent(),/11.15/);assert.equal(await page.locator('#gWalls [data-wall]').count(),6);assert.equal(await page.locator('#gLabels text').count(),2);await screen('custom-2d');
 await page.locator('#undo').click();assert.equal(await page.locator('#gRooms polygon.room').count(),13);await page.locator('#redo').click();assert.equal(await page.locator('#gRooms polygon.room').count(),1);check('custom import clears original geometry; undo and redo');
 const cf=custom.furniture[0];await mmclick(cf.cx,cf.cy);await page.locator('#fW').waitFor();
 let before=await saved();let p=await point(cf.cx,cf.cy);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+35,p.y+25,{steps:8});await page.mouse.up();let moved=await saved();assert.notDeepEqual(moved.furniture,before.furniture);
 await page.locator('#undo').click();assert.deepEqual((await saved()).furniture,before.furniture);await page.locator('#redo').click();assert.deepEqual((await saved()).furniture,moved.furniture);check('real pointer drag creates one undo / redo step');
 f=moved.furniture[0];p=await point(f.cx,f.cy);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+35,p.y+15,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual((await saved()).furniture,moved.furniture);assert.equal(Number(await page.locator('#fX').inputValue()),Math.round(f.cx));check('Escape cancels a drag without saving its preview');
 await page.locator('#fName').focus();await page.keyboard.press('r');await page.keyboard.press('ArrowLeft');assert.deepEqual((await saved()).furniture,moved.furniture);await page.keyboard.press('Escape');await page.locator('#langBtn').click();assert.equal(await page.locator('#fW').count(),1);await page.locator('#langBtn').click();assert.equal(await page.locator('#fW').count(),1);check('input focus protects shortcuts and language preserves selection');
 await page.locator('[data-layer="wallSnap"]').click();assert.equal((await saved()).view.layers.wallSnap,false);await page.locator('[data-layer="wallSnap"]').click();
 for(const layer of ['dims','labels','furn','grid','bearing']){await page.locator(`[data-layer="${layer}"]`).click();await page.locator(`[data-layer="${layer}"]`).click();}check('layer and snap controls');
 const oldVB=await page.locator('#plan').getAttribute('viewBox');await page.locator('#zoomIn').click();assert.notEqual(await page.locator('#plan').getAttribute('viewBox'),oldVB);await page.locator('#fit').click();
 p=await point(2800,3400);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x-25,p.y-20,{steps:5});await page.mouse.up();assert.notEqual(await page.locator('#plan').getAttribute('viewBox'),oldVB);await page.locator('#fit').click();check('zoom, fit and pan');
 await page.locator('[data-tool="measure"]').click();await mmclick(2200,2600);await mmclick(2800,2600);assert.equal((await saved()).measures.length,1);await page.locator('[data-tool="select"]').click();check('measurement');
 await mmclick(2800,3300);await page.locator('#rName').waitFor();await input('rName','My custom room');await page.locator('[data-mat="walnut"]').click();await page.locator('#langBtn').click();assert.equal(await page.locator('#rName').inputValue(),'My custom room');await page.locator('#langBtn').click();assert.equal((await saved()).rooms[custom.geometry.rooms[0].id].mat,'walnut');check('room name, material and language preserve custom names');
 await download('exportPng','custom-export-2d.png');check('2D PNG downloaded');
 // Reimport exact fixture before round-trip comparison.
 await importCustom();timings.customEnter3D=await mode('3d');await screen('custom-3d');
 await page.locator('[data-cut="1.2"]').click();await page.locator('[data-t="night"]').click();await page.locator('#sun').fill('16');await page.locator('#sun').dispatchEvent('input');assert.equal(await page.locator('#sunT').textContent(),'16:00');await screen('custom-night');await page.locator('[data-t="night"]').click();await page.locator('[data-cut]').first().click();await page.locator('#roomList [data-room]').first().click();await page.waitForTimeout(1000);await page.locator('#vTop').click();await page.waitForTimeout(1000);check('3D room views, cut/full walls, sun and night');
 await page.locator('[data-mode="walk"]').click();await page.locator('#walkOverlay').waitFor({state:'visible'});await page.locator('#walkOverlay').click();await page.waitForTimeout(300);await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');await page.keyboard.press('e');await page.keyboard.press('Escape');await page.locator('[data-mode="orbit"]').click();await page.waitForTimeout(1000);check('walk enters, moves and exits (door key exercised; visual door check separate)');
 await download('exportPng','custom-export-3d.png');const exportPath=await download('exportJson','custom-export.json');const exported=JSON.parse(fs.readFileSync(exportPath));for(const key of ['geometry','furniture','rooms','units','layout','id','createdAt'])assert.deepEqual(exported[key],custom[key]);assert.equal(exported.view.mode,'3d');check('3D PNG and JSON downloaded; fixture fields preserved');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&!document.body.classList.contains('busy'));assert.equal((await saved()).view.mode,'3d');assert.equal((await saved()).id,custom.id);check('refresh restores custom geometry and 3D mode');
 await mode('2d');const unchanged=await saved();let dialogMessage='';page.once('dialog',async d=>{dialogMessage=d.message();await d.accept()});await page.setInputFiles('#fileIn','tests/fixtures/future-project.json');await page.waitForTimeout(150);assert.match(dialogMessage,/版本/);assert.deepEqual(await saved(),unchanged);
 page.once('dialog',d=>d.accept());await page.setInputFiles('#fileIn',{name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{')});await page.waitForTimeout(150);assert.deepEqual(await saved(),unchanged);
 page.once('dialog',d=>d.dismiss());await page.setInputFiles('#fileIn',path.join(OUT,'legacy-project.json'));await page.waitForTimeout(150);assert.deepEqual(await saved(),unchanged);check('future/broken files and cancelled legacy migration preserve saved project');
 const backupPending=page.waitForEvent('download');page.once('dialog',d=>d.accept());await page.setInputFiles('#fileIn',path.join(OUT,'legacy-project.json'));const backup=await backupPending;await backup.saveAs(path.join(OUT,'legacy-backup-downloaded.json'));assert.equal(fs.readFileSync(path.join(OUT,'legacy-backup-downloaded.json'),'utf8'),fs.readFileSync(path.join(OUT,'legacy-project.json'),'utf8'));assert.equal((await saved()).geometry.rooms.length,13);check('legacy confirmation downloads original bytes before migration');
 // Remount through the module API, with no production window bridge.
 await page.evaluate(async()=>{const m=await import('/src/main.js');m.application.dispose();const a=m.createApplication();a.dispose();const b=m.createApplication();b.dispose();m.createApplication();});
 assert.equal(await page.locator('#view3d canvas').count(),0);await page.locator('#lib .item').first().click();assert.equal((await saved()).furniture.length,47);await mode('3d');assert.equal(await page.locator('#view3d canvas').count(),1);await mode('2d');check('dispose / repeated mount removes canvas and duplicate listeners');
 await page.setViewportSize({width:390,height:844});await page.locator('#tgLib').click();await page.waitForFunction(()=>document.querySelector('aside.lib').classList.contains('open'));await page.waitForTimeout(350);await page.locator('#lib .item').first().click();await page.locator('#fab').waitFor({state:'visible'});await page.locator('#fab [data-a="prop"]').click();await page.waitForFunction(()=>document.querySelector('aside.right').classList.contains('open')&&!document.querySelector('aside.lib').classList.contains('open'));await page.waitForTimeout(350);await screen('narrow-390');check('narrow viewport drawers and floating toolbar');
 assert.deepEqual(errors,[]);check('no uncaught page errors');
 fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({browser:browser.version(),viewport:{width:1440,height:1000},checks,timings,errors},null,2));
 }catch(error){await screen('failure');fs.writeFileSync(path.join(OUT,'browser-failure.json'),JSON.stringify({error:error.stack,errors,checks,timings},null,2));throw error;}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
