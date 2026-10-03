import {uploadProject} from './helpers/project-protection.mjs';
import {createRequire} from 'node:module';import fs from 'node:fs';import assert from 'node:assert/strict';
import {createRectangleProject,updateRectangleProject} from '../src/data/project-data.js';import {asHouse} from '../src/data/house-editor.js';import {passageSpace} from '../src/core/spatial-clearance.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),out=process.env.WALK_TEST_OUT||'docs/verification/T06-use-zones/walk',baseline=process.env.WALK_BASELINE==='1';fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),checks=[],results=[],errors=[];
function model(kind){if(kind==='floor-open')return JSON.parse(fs.readFileSync('docs/verification/T06-use-zones/walk-open-edge-before.json'));const base=createRectangleProject({width:4000,depth:4000}),e=asHouse(base.roomEditor);if(kind==='fixed')e.rooms[0].obstacles=[{id:'thin',name:'Thin test column',x:0,y:1500,width:4000,depth:1,height:2800}];if(kind==='diagonal')e.rooms[0].notch={corner:'top-right',shape:'diagonal',width:2000,depth:3000,wallThickness:120};let p=updateRectangleProject(base,e);if(!['fixed','diagonal'].includes(kind)){p.roomEditor=null;p.geometry.walkStart={position:[1000,2000],target:[3500,2000]};}
 if(kind==='furniture')p.furniture=[{id:'test-blocker',type:'desk',name:'Rotated blocker',cx:2500,cy:2000,w:500,d:1400,rot:45,color:'#ddd6c8'}];
 if(kind==='wall'){p.roomEditor=null;p.geometry.walls.push([2500,0,2501,4000,'n']);}
 if(kind==='sliding'||kind==='bifold'){p.roomEditor=null;p.geometry.slides=[{id:'test-slide',name:'Slide',rect:[2500,500,2620,3500],v:true,height:2100,style:kind,wallId:'test--right',swing:'inward'}];if(kind==='bifold')p.geometry.walkStart={position:[1000,800],target:[3500,800]};}
 if(kind==='swing'){p.roomEditor=null;p.geometry.doors=[{id:'test-swing',name:'Swing',rect:[2500,500,2620,3500],h:[2500,500],c:[1,0],o:[0,1],len:3000,height:2100}];}
 return p;}
try{
 for(const input of ['keyboard','joystick']){
  const c=await b.newContext({viewport:{width:1200,height:900},hasTouch:input==='joystick',isMobile:input==='joystick'}),page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.TEST_URL||'http://127.0.0.1:8095/');await page.locator('#lib .item').first().waitFor();
  for(const kind of baseline?['sliding']:['floor','floor-open','wall','furniture','fixed','diagonal','swing','sliding','bifold']){
   const p=model(kind),file=out+'/'+kind+'-input.json';fs.writeFileSync(file,JSON.stringify(p,null,2));await uploadProject(page,file);await page.waitForFunction(()=>!document.querySelector('#importJson').disabled);await page.waitForFunction(()=>!document.body.classList.contains('busy'));await page.locator('[data-view="3d"]').evaluate(e=>e.click());await page.waitForFunction(()=>!document.body.classList.contains('busy'));await page.locator('[data-mode="walk"]').evaluate(e=>e.click());await page.locator('#walkOverlay').click();
   const get=async()=>JSON.parse(await page.locator('#walkPositionStatus').getAttribute('data-position')),start=await get(),trace=[start],space=passageSpace(p,{includeDoors:false});
   if(input==='keyboard'){await page.waitForFunction(()=>!!document.pointerLockElement);await page.keyboard.down('w');await page.keyboard.down('Shift');}
   else{const r=await page.locator('#joy').boundingBox();assert.ok(r);await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-50,{steps:5});}
   for(let i=0;i<30;i++){await page.waitForTimeout(100);trace.push(await get());}
   if(input==='keyboard'){await page.keyboard.up('w');await page.keyboard.up('Shift');await page.keyboard.press('Escape');}else await page.mouse.up();await page.waitForTimeout(250);const stop=await get();
   const actualMoved=Math.hypot(trace.at(-1)[0]-start[0],trace.at(-1)[1]-start[1]),endStable=Math.hypot(trace.at(-1)[0]-trace.at(-4)[0],trace.at(-1)[1]-trace.at(-4)[1])<2,expectedMax=kind==='floor'?3780:kind==='floor-open'?2780:kind==='diagonal'?3050:kind==='bifold'?2450:kind==='sliding'?2301:kind==='furniture'?2300:2281;
   const passed=actualMoved>100&&endStable&&(['fixed','diagonal'].includes(kind)?!space.free(trace.at(-1),370):trace.at(-1)[0]<=expectedMax)&&Math.hypot(stop[0]-trace.at(-1)[0],stop[1]-trace.at(-1)[1])<2&&trace.every(p=>space.free(p,219.99));
   await page.screenshot({path:out+'/'+kind+'-'+input+'.png'});results.push({kind,input,build:await page.locator('html').getAttribute('data-build'),start,trace,stop,actualMoved,endStable,expectedMax,passed,nativePointerLock:input==='keyboard'});console.log((passed?'PASS ':'FAIL ')+kind+' '+input+' end='+trace.at(-1));if(!baseline)assert.ok(passed,kind+' '+input+' failed movement/block/release');
   checks.push(kind+': native '+input+' sustained motion, collision and release');await page.locator('[data-mode="orbit"]').evaluate(e=>e.click());await page.locator('[data-view="2d"]').evaluate(e=>e.click());await page.waitForFunction(()=>!document.body.classList.contains('busy'));
  }
  await c.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/walk-results.json',JSON.stringify({passed:results.every(r=>r.passed),baseline,checks,results,errors,browser:b.version()},null,2));
}catch(e){fs.writeFileSync(out+'/walk-failure.json',JSON.stringify({error:e.stack,checks,results,errors},null,2));throw e;}finally{await b.close();}
