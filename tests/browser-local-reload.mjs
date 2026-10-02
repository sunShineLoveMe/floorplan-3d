import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'floorplan-reload-')),{headless:true,channel:'chrome',viewport:{width:1440,height:1000},args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await context.newPage(),errors=[];
page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push({url:r.url(),error:r.failure()});});
page.on('pageerror',e=>errors.push({error:e.message}));
try{
 for(let i=0;i<100;i++){
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8095/');
  await page.waitForSelector('#lib .item',{timeout:10000});
  assert.deepEqual(errors,[]);console.log('READY '+i);
 }
 console.log('100 navigations PASS: no failed requests or page errors');
}finally{if(errors.length)console.log(JSON.stringify(errors,null,2));await context.close();}
