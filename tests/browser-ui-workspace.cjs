const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='docs/verification/UI-020';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[],metrics=[];
 page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));
 const rect=()=>page.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height}};return {width:innerWidth,header:r('header'),stage:r('#stage'),left:r('aside.lib'),right:r('aside.right'),overflow:document.documentElement.scrollWidth>innerWidth}});
 const shot=async name=>page.screenshot({path:`${out}/${name}.png`});
 try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8086');await page.locator('#lib .item').first().waitFor();
 await page.setInputFiles('#fileIn','docs/verification/UI-000/baseline-project.json');await page.locator('#gFurn [data-fid="ui-bed"]').waitFor();
 await page.evaluate(()=>{window.workspaceNodes={svg:document.querySelector('#plan'),stage:document.querySelector('#stage')}});
 const initial=await state();
 for(const [width,height] of [[1440,900],[1280,800]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(100);
 const m=await rect();assert.equal(m.header.h,64);assert.equal(m.left.w,280);assert.equal(m.right.w,304);assert.equal(m.stage.w,width-584);assert.equal(m.overflow,false);metrics.push(m);
 await page.locator('#gFurn [data-fid="ui-bed"]').click();await page.locator('#fName').waitFor();assert.equal(await page.locator('#fName').inputValue(),'Bed');
 assert.equal((await rect()).stage.w,m.stage.w);await shot(`selected-${width}`);
 await page.locator('#plan').click({position:{x:10,y:200}});assert.equal((await rect()).stage.w,m.stage.w);
 }
 checks.push('1440/1280: 64px header, 280/304 panes, stable canvas through select/deselect and actual SVG hits');
 await page.locator('#tgLib').click();await page.waitForTimeout(100);assert.equal((await rect()).stage.w,976);
 await page.locator('#tgLib').click();await page.waitForTimeout(100);await page.locator('#gFurn [data-fid="ui-bed"]').click();assert.equal(await page.locator('#fName').inputValue(),'Bed');
 const vb=await page.locator('#plan').getAttribute('viewBox');await page.locator('aside.lib').hover();await page.mouse.wheel(0,500);await page.waitForTimeout(100);assert.equal(await page.locator('#plan').getAttribute('viewBox'),vb);assert.ok(await page.locator('aside.lib').evaluate(el=>el.scrollTop)>0);
 checks.push('pane collapse preserves hit coordinates; library scroll stays independent from canvas zoom');
 await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(100);const m=await rect();assert.equal(m.stage.w,744);await page.locator('#tgPanel').click();assert.equal((await rect()).stage.w,744);assert.equal(await page.locator('#fName').inputValue(),'Bed');await shot('drawer-1024');await page.locator('[data-close-pane=panel]').click();assert.equal(await page.locator('#tgPanel').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('aside.right').evaluate(e=>e.inert),true);metrics.push(m);
 checks.push('1024: library docked, property overlay opens/closes without canvas resize; hidden fields inert');
 for(const [width,height] of [[390,844],[1280,480]]){await page.setViewportSize({width,height});await page.waitForTimeout(100);const m=await rect();assert.equal(m.overflow,false);assert.ok(m.stage.h>=height-160);metrics.push(m);if(await page.locator('#tgPanel').getAttribute('aria-expanded')==='false')await page.locator('#tgPanel').click();await page.locator('#fW').scrollIntoViewIfNeeded();assert.ok(await page.locator('#fW').isVisible());await shot(`reachable-${width}-${height}`);await page.locator('#tgPanel').click();}
 checks.push('390px and low height: reachable pane controls, no page overflow, usable canvas height');
 await page.setViewportSize({width:1440,height:900});await page.locator('#tgPanel').click(); // reopen docked property pane
 await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>!document.body.classList.contains('busy')&&document.body.classList.contains('m3d'),null,{timeout:45000});await page.locator('#view3d canvas').waitFor();
 await page.evaluate(()=>window.workspaceNodes.canvas=document.querySelector('#view3d canvas'));
 await page.locator('#tgLib').click();await page.waitForTimeout(200);
 const size=await page.locator('#view3d canvas').evaluate(c=>({w:c.clientWidth,h:c.clientHeight,stageW:document.querySelector('#stage').clientWidth,stageH:document.querySelector('#stage').clientHeight}));assert.equal(size.w,size.stageW);assert.equal(size.h,size.stageH);await shot('3d-expanded-canvas');
 assert.ok(await page.evaluate(()=>window.workspaceNodes.svg===document.querySelector('#plan')&&window.workspaceNodes.stage===document.querySelector('#stage')&&window.workspaceNodes.canvas===document.querySelector('#view3d canvas')));
 const final=await state();assert.deepEqual({...final,view:initial.view,updatedAt:initial.updatedAt},initial);assert.deepEqual(errors,[]);checks.push('real WebGL resized to host, persistent SVG/stage/canvas identity and exact project preservation');
 fs.writeFileSync(`${out}/workspace-results.json`,JSON.stringify({date:new Date().toISOString(),checks,metrics,size,errors},null,2));console.log(checks);
 }catch(e){await shot('failure');throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
