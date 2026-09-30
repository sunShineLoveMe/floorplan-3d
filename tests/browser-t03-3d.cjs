/* Actual browser door picking: derive screen points from the documented camera pose,
   then verify changed pixels and unchanged project bytes. No production test bridge. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const OUT=path.resolve(process.env.TEST_OUT||'docs/verification/T03/doors-imperial');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-project-v2')));
 const canvas=()=>page.locator('#view3d canvas').evaluate(c=>c.toDataURL());
 const shot=name=>page.screenshot({path:path.join(OUT,name+'.png')});
 const diff=(a,b)=>page.evaluate(async([a,b])=>{const imgs=await Promise.all([a,b].map(src=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.src=src})));const c=document.createElement('canvas');c.width=imgs[0].width;c.height=imgs[0].height;const ctx=c.getContext('2d');const ds=imgs.map(im=>{ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data});let pixels=0;for(let i=0;i<ds[0].length;i+=4)if(Math.max(...[0,1,2].map(j=>Math.abs(ds[0][i+j]-ds[1][i+j])))>8)pixels++;return pixels},[a,b]);
 const screenPoint=async open=>page.evaluate(async open=>{
   const THREE=await import('three'),p=JSON.parse(localStorage.getItem('floorplan-project-v2')),d=p.geometry.doors[0],g=p.geometry;
   const cv=document.querySelector('#view3d canvas').getBoundingClientRect(),vb=document.querySelector('#plan').getAttribute('viewBox').split(' ').map(Number);
   const target=new THREE.Vector3((vb[0]+vb[2]/2-g.origin[0])/1000,0,(vb[1]+vb[3]/2-g.origin[1])/1000);
   const distance=Math.max(vb[3]/1000/2/Math.tan(Math.PI/8),g.height/1000*3.8,5),camera=new THREE.PerspectiveCamera(45,cv.width/cv.height,.05,300);
   camera.position.copy(target).addScaledVector(new THREE.Vector3(.3,.82,.49).normalize(),distance);camera.lookAt(target);camera.updateMatrixWorld();
   const v=open?d.o:d.c,point=new THREE.Vector3((d.h[0]+v[0]*d.len*.65-g.origin[0])/1000,d.height/1000*.5,(d.h[1]+v[1]*d.len*.65-g.origin[1])/1000).project(camera);
   return{x:cv.x+(point.x+1)*cv.width/2,y:cv.y+(1-point.y)*cv.height/2};
 },open);
 const settledCanvas=async()=>{let last=await canvas();for(let i=0;i<30;i++){await page.waitForTimeout(300);const next=await canvas();if(next===last)return next;last=next;}throw new Error('Door animation did not settle');};
 const toggle=async(label)=>{
   await page.waitForTimeout(1200);const bytes=JSON.stringify(await saved()),before=await canvas();await shot(label+'-open');
   let q=await screenPoint(true);await page.mouse.click(q.x,q.y);await page.waitForTimeout(2200);const closed=await settledCanvas();await shot(label+'-closed');
   await page.locator('#projectUnits').selectOption('metric');await page.waitForTimeout(200);
   assert.ok((await canvas())===closed,'Unit switch preserves closed door, camera and rendered resources');
   await page.locator('#projectUnits').selectOption('imperial');await page.waitForTimeout(200);assert.ok((await canvas())===closed);
   const changed=await diff(before,closed);assert.ok(changed>100,`${label}: visible leaf must close (${changed} pixels)`);
   q=await screenPoint(false);await page.mouse.click(q.x,q.y);await page.waitForTimeout(2200);const reopened=await canvas();await shot(label+'-reopened');
   const residual=await diff(before,reopened);assert.ok(residual<changed*.1,`${label}: reopening restores leaf (${residual}/${changed} pixels)`);
   const after=await saved(),original=JSON.parse(bytes);after.updatedAt=original.updatedAt;assert.deepEqual(after,original);checks.push({label,changedPixels:changed,reopenedResidualPixels:residual,door:(await saved()).roomEditor.openings[0]});console.log('PASS',label,changed,residual);
 };
 try{
   await page.goto(process.env.TEST_URL||'http://127.0.0.1:8086');await page.locator('#gFurn [data-fid]').first().waitFor();await page.setInputFiles('#fileIn','tests/fixtures/rectangle-project-v2.json');await page.locator('[data-edit="opening-door-1"]').waitFor();
   await page.locator('#projectUnits').selectOption('imperial');
   await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>document.body.classList.contains('m3d')&&!document.body.classList.contains('busy'));
   await page.locator('[data-t="labels"]').click();await toggle('900-top-start-inward');
   await page.locator('[data-edit="opening-door-1"]').click();
   for(const [k,v]of Object.entries({wallId:'bottom',hinge:'end',swing:'outward'}))await page.locator(`#roomDialog [name="${k}"]`).selectOption(v);
   await page.locator('#roomDialog [name="width"]').fill('1200 mm');await page.locator('#roomDialog [type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('#roomDialog').open);
   await toggle('1200-bottom-end-outward');
   assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({browser:browser.version(),checks,errors,limitations:['Two representative door configurations tested in Chromium; 16 configurations are covered by numeric/SVG regression, not by this 3D picking test.']},null,2));
 }catch(e){await shot('failure');fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify({error:e.stack,checks,errors},null,2));throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
