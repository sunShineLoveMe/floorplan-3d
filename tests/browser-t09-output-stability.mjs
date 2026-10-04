import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {uploadProject} from './helpers/project-protection.mjs';
import {createRectangleProject} from '../src/data/project-data.js';
const pw=createRequire(import.meta.url)('/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const engine=process.env.TEST_ENGINE||'chromium',out=process.env.T09_TEST_OUT||'docs/verification/T09-output-stability/attempt-01',url=process.env.TEST_URL||'http://127.0.0.1:8095/';
if(fs.existsSync(out))throw Error('Use a new directory');fs.mkdirSync(out,{recursive:true});
const browser=await pw[engine].launch(engine==='chromium'?{channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{headless:true});const checks=[],failures=[],diagnostics=[];let p,build;
async function scenario(name,fn,setup){const c=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});if(setup)await c.addInitScript(setup);await c.addInitScript(()=>{const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{...src,set(value){if(value.startsWith('data:image/svg+xml'))window.t09SvgOutput=decodeURIComponent(value.slice(value.indexOf(',')+1));src.set.call(this,value);}});});p=await c.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>diagnostics.push({name,unexpected:true,text:e.stack}));p.on('console',m=>{if(['warning','error'].includes(m.type()))diagnostics.push({name,type:m.type(),text:m.text()});});p.on('requestfailed',r=>diagnostics.push({name,url:r.url(),failure:r.failure()}));try{await p.goto(url);await p.locator('#lib .item').first().waitFor();build=await p.locator('html').getAttribute('data-build');await fn(c);checks.push(name);console.log('PASS '+name);}catch(e){failures.push({name,error:e.stack});await p.screenshot({path:out+'/failure-'+failures.length+'.png'});console.log('FAIL '+name+' '+e.message);}finally{await c.close();}}
async function menu(){if(!await p.locator('details.menu').evaluate(e=>e.open))await p.locator('details.menu summary').click();}
async function image(mode,edge,name){await menu();await p.locator('#exportView').selectOption(mode);await p.locator('#exportResolution').selectOption(String(edge));const pending=p.waitForEvent('download');await p.locator('#exportPng').click();const d=await pending;await d.saveAs(out+'/'+name+'.png');assert.equal(await d.failure(),null);if(mode==='2d')fs.writeFileSync(out+'/'+name+'.svg',await p.evaluate(()=>window.t09SvgOutput));await p.waitForFunction(()=>!document.querySelector('#exportPng').disabled);assert.match(await p.locator('#toast').innerText(),/Image generated/);await p.keyboard.press('Escape');}
async function three(){await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>!document.body.classList.contains('busy'));assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('m3d')),true);}
const model=()=>p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('floorplan-project-v2'));delete d.updatedAt;delete d.view.mode;return d;});
try{
for(const name of ['jacobsen','cmu','plan-f'])await scenario(name+' complete 2D / labelled 3D download and repeated switching',async()=>{
 await uploadProject(p,`docs/verification/T06-use-zones/${name}/complete-project.json`);const before=await model();
 const remote=[];p.on('request',r=>{if(!r.url().startsWith(url)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))remote.push(r.url());});
 await p.route('https://**/*',r=>r.abort());
 await image('2d',4800,name+'-2d');
 for(let i=0;i<3;i++){await three();if(i===0){await p.screenshot({path:out+'/'+name+'-3d-screen.png'});await image('3d',3200,name+'-3d');const labels=await p.locator('#view3d .rlabel').evaluateAll(els=>els.filter(e=>getComputedStyle(e).visibility==='visible'&&getComputedStyle(e).display!=='none').map(e=>({text:e.textContent,x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));assert.ok(labels.length);fs.writeFileSync(out+'/'+name+'-labels.json',JSON.stringify(labels,null,2));assert.equal(await p.locator('#view3d canvas').count(),1);}
 await p.locator('[data-view="2d"]').click();await p.waitForFunction(()=>!document.body.classList.contains('busy'));}
 assert.deepEqual(await model(),before);assert.deepEqual(remote,[]);await p.reload();await p.locator('#lib .item').first().waitFor();assert.deepEqual(await model(),before);
});
await scenario('portrait complete image, extreme ratio and outside measurement / furniture bounds',async()=>{
 const project=createRectangleProject({name:'Tall room',width:1800,depth:60000,height:2600});project.furniture=[{id:'outside',type:'chair',name:'outside chair',cx:-5000,cy:2000,w:450,d:480,rot:15,color:'#d4b78e'}];project.measures=[{id:'measure-outer',a:{x:-6500,y:-3200},b:{x:1800,y:-3200}}];
 fs.writeFileSync(out+'/tall-project.json',JSON.stringify(project));await uploadProject(p,out+'/tall-project.json');await image('2d',4800,'tall-2d');
 const src=await p.evaluate(async()=>{const map=JSON.parse(document.querySelector('script[type=importmap]').textContent).imports;const {createDownloads}=await import(map['./src/services/downloads.js']);const d=createDownloads({store:{getProject:()=>JSON.parse(localStorage.getItem('floorplan-project-v2'))},ui:{layers:{grid:false}},svg:document.querySelector('#plan')});const text=d.planSVG();d.dispose();return text;});fs.writeFileSync(out+'/print-original-bounds.svg',src);
 // Read source scene glyph bounds independently from the output layout helper.
 const content=await p.locator('#plan').evaluate(svg=>[...svg.children].filter(e=>e.tagName.toLowerCase()==='g'&&!['gGrid','gSel'].includes(e.id)&&getComputedStyle(e).display!=='none').map(e=>{const b=e.getBBox();return {id:e.id,x:b.x,y:b.y,w:b.width,h:b.height};}));fs.writeFileSync(out+'/tall-content-bounds.json',JSON.stringify(content,null,2));
});
await scenario('3D exports visible CSS labels and honors hidden labels',async()=>{
 await p.locator('#lib .item').first().click();await three();await image('3d',3200,'label-on');
 await p.locator('details.view-settings summary').click();await p.locator('[data-t="labels"]').click();await p.keyboard.press('Escape');await image('3d',3200,'label-off');assert.notDeepEqual(fs.readFileSync(out+'/label-on.png'),fs.readFileSync(out+'/label-off.png'));
});
await scenario('WebGL constructor failure leaves 2D usable and Retry 3D recreates one canvas',async()=>{
 await p.locator('#lib .item').first().click();const before=await model();await p.locator('[data-view="3d"]').click();await p.locator('#viewError').waitFor({state:'visible'});assert.match(await p.locator('#viewErrorMessage').innerText(),/WebGL could not start/);assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('busy')||e.classList.contains('m3d')),false);assert.equal(await p.locator('#view3d canvas').count(),0);
 await p.screenshot({path:out+'/webgl-failure.png'});await p.locator('#lib .item').first().click();assert.ok(await p.locator('#fW').count());await p.locator('#retry3d').click();await p.waitForFunction(()=>!document.body.classList.contains('busy'));assert.equal(await p.locator('#view3d canvas').count(),1);assert.equal(await p.locator('#viewError').isVisible(),false);assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('m3d')),true);assert.equal((await model()).geometry.height,before.geometry.height);
},()=>{const original=HTMLCanvasElement.prototype.getContext;window.t09AllowGL=false;HTMLCanvasElement.prototype.getContext=function(type,...rest){if(['webgl2','webgl','experimental-webgl'].includes(type)&&!window.t09AllowGL){setTimeout(()=>window.t09AllowGL=true,0);return null;}return original.call(this,type,...rest);};});
await scenario('WebGL context loss returns to 2D, retains model and retries',async()=>{
 await p.locator('#lib .item').first().click();const before=await model();await three();await p.locator('#view3d canvas').evaluate(cv=>{const gl=cv.getContext('webgl2')||cv.getContext('webgl');gl.getExtension('WEBGL_lose_context').loseContext();});await p.locator('#viewError').waitFor({state:'visible'});assert.match(await p.locator('#viewErrorMessage').innerText(),/context was lost/);assert.deepEqual(await model(),before);await image('2d',3200,'context-loss-2d');await p.locator('#retry3d').click();await p.waitForFunction(()=>!document.body.classList.contains('busy'));assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('m3d')),true);assert.deepEqual(await model(),before);
});
await scenario('3D module request timeout leaves 2D and allows retry after delayed response',async()=>{
 let release;const gate=new Promise(r=>release=r);await p.route('**/viewer3d/viewer.js*',async r=>{await gate;await r.continue();});await p.locator('[data-view="3d"]').click();await p.locator('#viewError').waitFor({state:'visible',timeout:20000});assert.match(await p.locator('#viewErrorMessage').innerText(),/timed out/);assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('busy')),false);release();await p.unrouteAll({behavior:'wait'});await p.locator('#retry3d').click();await p.waitForFunction(()=>!document.body.classList.contains('busy'));assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('m3d')),true);
});
await scenario('failed PNG encoding reports failure, restores renderer and allows retry',async()=>{
 await p.locator('#lib .item').first().click();await three();const dimensions=await p.locator('#view3d canvas').evaluate(e=>[e.width,e.height]);
 await p.evaluate(()=>{window.t09ToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback){callback(null);};});
 for(const mode of ['3d','2d']){await menu();await p.locator('#exportView').selectOption(mode);await p.locator('#exportPng').click();await p.waitForFunction(()=>!document.querySelector('#exportPng').disabled);assert.match(await p.locator('#toast').innerText(),/Image export failed/);await p.keyboard.press('Escape');}
 assert.deepEqual(await p.locator('#view3d canvas').evaluate(e=>[e.width,e.height]),dimensions);await p.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.t09ToBlob;});await image('3d',3200,'encoding-retry');
});
await scenario('small touch viewport exports image and preserves dimensions',async()=>{
 await p.setViewportSize({width:390,height:844});await image('2d',3200,'mobile-2d');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
});
}finally{fs.writeFileSync(out+'/browser-results.json',JSON.stringify({passed:!failures.length&&!diagnostics.some(d=>d.unexpected),engine,browser:browser.version(),build,checks,failures,diagnostics,limitations:['Fault injection covers request timeout, constructor failure and WEBGL_lose_context','Chromium uses SwiftShader; automated WebKit is separate from installed Safari; physical mobile/Edge remain separate']},null,2));await browser.close();}
assert.deepEqual(failures,[]);assert.equal(diagnostics.some(d=>d.unexpected),false);
