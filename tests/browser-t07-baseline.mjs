import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='docs/verification/T07-save-recovery/baseline';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext(),page=await context.newPage(),results=[];
const url='http://127.0.0.1:8095/',key='floorplan-project-v2';
const raw=()=>page.evaluate(k=>localStorage.getItem(k),key);
const ready=p=>p.locator('#lib .item').first().waitFor();
const record=async(id,impact,extra={})=>{results.push({id,impact,...extra});await page.screenshot({path:out+'/'+id+'.png'});};
try{
 await page.goto(url);await ready(page);await page.locator('#lib .item').first().click();const saved=await raw();await page.reload();await ready(page);assert.equal(await raw(),saved);
 await record('T07-001','Persisted project reload shows generic Device storage only status',{status:await page.locator('#saveStatus').textContent()});
 await page.evaluate(()=>{window.testWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Blocked','QuotaExceededError');};});
 await page.locator('#lib .item').first().click();assert.equal(await raw(),saved);await record('T07-002','Memory remains editable on write failure; no direct retry action',{status:await page.locator('#saveStatus').textContent()});
 await page.evaluate(()=>Storage.prototype.setItem=window.testWrite);
 await page.setInputFiles('#fileIn','tests/fixtures/rectangle-project-v2.json');await page.waitForFunction(()=>!document.querySelector('#importJson').disabled);assert.equal(JSON.parse(await raw()).id,JSON.parse(fs.readFileSync('tests/fixtures/rectangle-project-v2.json')).id);
 await record('T07-003','Valid import immediately replaces the current project without backup or cancellation');
 const second=await context.newPage();await second.goto(url);await ready(second);await second.locator('#lib .item').first().click();const other=await raw();await page.locator('#lib .item').first().click();assert.notEqual(await raw(),other);await record('T07-004','Stale same-origin page silently overwrites the other page',{otherVersion:JSON.parse(other),overwrittenBy:JSON.parse(await raw())});await second.close();
 await page.evaluate(()=>{localStorage.setItem('floorplan-project-v2','{broken v2');localStorage.setItem('floorplan-project-v1',window.testV1||'{}');});page.once('dialog',d=>d.accept());await page.reload();await ready(page);assert.equal(await raw(),'{broken v2');await page.locator('#lib .item').first().click();assert.notEqual(await raw(),'{broken v2');await record('T07-005','Editing sample automatically archives and replaces corrupt v2 without an explicit recovery choice',{recovery:await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes('recovery')).map(k=>[k,localStorage.getItem(k)])))});
 fs.writeFileSync(out+'/results.json',JSON.stringify({build:await page.locator('html').getAttribute('data-build'),results},null,2));
}finally{await browser.close();}
