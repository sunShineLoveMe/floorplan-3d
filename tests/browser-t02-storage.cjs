const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.TEST_OUT||'docs/verification/T02'),URL=process.env.TEST_URL||'http://127.0.0.1:8086';
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})}),checks=[];
const v1=fs.readFileSync('tests/fixtures/custom-project.json','utf8');
const test=async(name,fn)=>{const c=await browser.newContext();try{await fn(c);checks.push(name);console.log('PASS',name)}finally{await c.close()}};
try{
await test('v1 key migrates and persists editable snapshot copy without changing source',async c=>{
 const p=await c.newPage();await p.goto(URL);await p.evaluate(raw=>localStorage.setItem('floorplan-project-v1',raw),v1);await p.reload();await p.locator('#gRooms .room').waitFor();
 const values=await p.evaluate(()=>({source:localStorage.getItem('floorplan-project-v1'),copy:JSON.parse(localStorage.getItem('floorplan-project-v2'))}));assert.equal(values.source,v1);assert.equal(values.copy.version,2);assert.equal(values.copy.roomEditor,null);assert.equal(values.copy.id,JSON.parse(v1).id);await p.reload();assert.match(await p.locator('#subtitle').textContent(),/11.15/);
});
await test('migration write failure keeps loaded project and v1 source with visible error',async c=>{
 const p=await c.newPage();await p.goto(URL);await p.evaluate(raw=>localStorage.setItem('floorplan-project-v1',raw),v1);
 await c.addInitScript(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='floorplan-project-v2')throw Error('test quota');return write.call(this,k,v)}});
 await p.reload();await p.locator('#gRooms .room').waitFor();assert.match(await p.locator('#subtitle').textContent(),/11.15/);assert.match(await p.locator('#toast').textContent(),/v2 保存失败/);assert.equal(await p.evaluate(()=>localStorage.getItem('floorplan-project-v1')),v1);assert.equal(await p.evaluate(()=>localStorage.getItem('floorplan-project-v2')),null);
});
await test('corrupt v2 never falls back to v1 and failed recovery blocks overwrite',async c=>{
 const p=await c.newPage();await p.goto(URL);await p.evaluate(raw=>{localStorage.setItem('floorplan-project-v1',raw);localStorage.setItem('floorplan-project-v2','broken-v2');},v1);
 await c.addInitScript(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.includes('-recovery-'))throw Error('test recovery failed');return write.call(this,k,v)}});
 p.once('dialog',d=>d.accept());await p.reload();await p.locator('#gRooms .room').nth(12).waitFor();await p.locator('#lib .item').first().click();assert.match(await p.locator('#toast').textContent(),/保存失败/);assert.equal(await p.evaluate(()=>localStorage.getItem('floorplan-project-v2')),'broken-v2');assert.equal(await p.evaluate(()=>localStorage.getItem('floorplan-project-v1')),v1);
});
await test('late file reads cannot overwrite a project edited during reading',async c=>{
 const p=await c.newPage();await p.goto(URL);await p.evaluate(()=>{const read=File.prototype.text;File.prototype.text=function(){return new Promise(resolve=>{window.releaseTestRead=async()=>resolve(await read.call(this))})}});
 await p.setInputFiles('#fileIn','tests/fixtures/custom-project.json');await p.locator('#newRoom').click();await p.locator('#roomDialog [type=submit]').click();const current=await p.evaluate(()=>localStorage.getItem('floorplan-project-v2'));await p.evaluate(()=>window.releaseTestRead());await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('迟到'));assert.equal(await p.evaluate(()=>localStorage.getItem('floorplan-project-v2')),current);
});
fs.writeFileSync(path.join(OUT,'storage-browser-results.json'),JSON.stringify({browser:browser.version(),checks},null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
