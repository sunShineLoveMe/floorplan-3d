// Optional baseline timing comparison. Set BASELINE_DIR to the extracted full working-tree backup.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {spawn}=require('node:child_process');const fs=require('fs');
(async()=>{if(!process.env.BASELINE_DIR)throw new Error('Set BASELINE_DIR to the extracted working-tree backup.');const server=spawn('python3',['-u','-c',`from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import os
os.chdir(os.environ['BASELINE_DIR'])
s=ThreadingHTTPServer(('127.0.0.1',0),SimpleHTTPRequestHandler)
print(s.server_port,flush=True)
s.serve_forever()`]);const port=await new Promise(r=>server.stdout.once('data',d=>r(Number(d.toString().trim()))));const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});const results=[];
try{for(const [name,url] of [['baseline',`http://127.0.0.1:${port}`],['modular','http://127.0.0.1:8086']]){
 const c=await browser.newContext({viewport:{width:1440,height:1000}}),p=await c.newPage();let start=Date.now();await p.goto(url);await p.locator('#gFurn [data-fid]').nth(45).waitFor();const initial2D=Date.now()-start;await p.waitForTimeout(2000);const row={name,initial2D};
 for(const fixture of ['sample','custom']){
 if(fixture==='custom'){await p.setInputFiles('#fileIn',process.cwd()+'/tests/fixtures/custom-project.json');await p.waitForFunction(()=>document.querySelectorAll('#gRooms polygon').length===1);}
 start=Date.now();await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&!document.body.classList.contains('busy'));row[fixture+'First3D']=Date.now()-start;
 if(fixture==='custom'){await p.mouse.click(690,460);row.bedPick=await p.locator('#fW').count();}
 start=Date.now();await p.locator('[data-view="2d"]').click();await p.waitForFunction(()=>!document.body.classList.contains('m3d')&&!document.body.classList.contains('busy'));row[fixture+'Exit3D']=Date.now()-start;
 start=Date.now();await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&!document.body.classList.contains('busy'));row[fixture+'Warm3D']=Date.now()-start;
 await p.locator('[data-view="2d"]').click();await p.waitForFunction(()=>!document.body.classList.contains('m3d')&&!document.body.classList.contains('busy'));
 const coords=fixture==='custom'?{x:1524,y:1700}:{x:8300,y:1000};const pos=await p.evaluate(({x,y})=>{const svg=document.querySelector('#plan'),pt=svg.createSVGPoint();pt.x=x;pt.y=y;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},coords);
 await p.mouse.move(pos.x,pos.y);await p.mouse.down();start=Date.now();await p.mouse.move(pos.x+30,pos.y+20,{steps:20});await p.mouse.up();row[fixture+'Drag20Steps']=Date.now()-start;
 }
 results.push(row);await c.close();console.log(row)
}fs.writeFileSync('docs/verification/T01.1/comparison-results.json',JSON.stringify({browser:browser.version(),results,notes:'One run each, same device/viewport. Includes browser automation and network latency. Baseline served from complete original working-tree backup, not HEAD.'},null,2));}finally{server.kill();await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
