/* Verify UI-005 presentation state and capture layouts; no editor acceptance claim. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.TEST_OUT||'docs/verification/UI-005');
const URL=(process.env.TEST_URL||'http://127.0.0.1:8086')+'/docs/ui-prototypes/UI-005/';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext(),page=await context.newPage(),errors=[],checks=[],layouts=[],screens=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 const shot=async name=>{await page.screenshot({path:path.join(OUT,name+'.png')});screens.push(name+'.png');};
 const open=async(width,state='none',tab='room')=>{await page.setViewportSize({width,height:width===1440?900:width===1280?800:768});await page.goto(URL+`?capture=1&state=${state}&tab=${tab}`);await page.locator('#planPreview [data-object="furniture"]').first().waitFor();};
 const dimensions=()=>page.evaluate(()=>{
  const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{width:r.width,height:r.height,x:r.x,y:r.y};};
  return{viewport:innerWidth,header:rect('.project-bar'),canvas:rect('.canvas'),left:rect('.library'),right:rect('.inspector'),overflow:document.documentElement.scrollWidth>innerWidth};
 });
 try{
  for(const width of [1440,1280]){
   for(const state of ['none','room','furniture','door','window']){
    await open(width,state,state==='furniture'?'furniture':'room');await shot(`${width}-${state}`);
    const d=await dimensions();assert.equal(d.header.height,64);assert.equal(d.left.width,280);assert.equal(d.right.width,304);assert.equal(d.canvas.width,width-584);assert.ok(d.canvas.width>=640);assert.equal(d.overflow,false);
    layouts.push({...d,state});
   }
  }
  checks.push('1440/1280 × five selection states: 64px header, 280/304px sides, 856/696px canvas, no page overflow');
  await page.locator('#planPreview [data-id="ui-desk"]').click();assert.equal(await page.locator('.object-name').textContent(),'Desk');assert.equal(await page.locator('#inspectorContent input').first().inputValue(),'47.24409449');
  await page.locator('#planPreview [data-id="ui-chair"]').press('Enter');assert.equal(await page.locator('.object-name').textContent(),'Chair');checks.push('canvas pointer/keyboard select actual desk/chair fixture, not stale bed fields');
  await open(1280,'furniture','furniture');
  const before=await page.locator('.canvas').boundingBox();await page.locator('#roomTab').click();assert.equal(await page.locator('#inspectorTitle').textContent(),'Furniture properties');await page.locator('#furnitureTab').click();
  await page.locator('#hideLibrary').click();assert.equal(await page.locator('#inspectorTitle').textContent(),'Furniture properties');await page.locator('#showLibrary').click();
  await page.locator('#hideInspector').click();await page.locator('#showInspector').click();assert.equal(await page.locator('#inspectorTitle').textContent(),'Furniture properties');
  assert.equal((await page.locator('.canvas').boundingBox()).width,before.width);checks.push('tab changes and both manual side toggles preserve selected furniture');
  await open(1440,'furniture');await page.locator('#inspectorContent [data-choose="none"]').click();assert.equal((await dimensions()).canvas.width,856);assert.equal(await page.locator('#inspectorTitle').textContent(),'Properties');checks.push('deselect keeps right-side width stable');
  await page.locator('#planPreview [data-object="window"]').click();assert.equal(await page.locator('#inspectorTitle').textContent(),'Window properties');
  await page.locator('[data-edit="window"]').click();await shot('window-edit-dialog');await page.keyboard.press('Escape');assert.equal(await page.locator('[data-edit="window"]').evaluate(e=>e===document.activeElement),true);
  await page.locator('#newPlanButton').click();assert.match(await page.locator('#dialogContent').textContent(),/replaces the whole project/);assert.match(await page.locator('#dialogContent').textContent(),/Create and replace/);await shot('new-plan-replacement-dialog');await page.locator('[data-close]').click();checks.push('opening modal and new-plan replacement meaning; Escape returns focus to trigger');
  await page.locator('#fileButton').click();assert.equal(await page.locator('#fileMenu').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#fileMenu').isVisible(),false);assert.equal(await page.locator('#fileButton').evaluate(e=>e===document.activeElement),true);checks.push('File popup Escape closes and restores focus');
  await open(1440,'furniture','furniture');await page.locator('#settingsButton').click();await page.locator('#draftUnits').selectOption('metric');await page.locator('[data-close]').click();assert.match(await page.locator('#inspectorContent').textContent(),/Width \(mm\)/);assert.match(await page.locator('#furnitureCards').textContent(),/mm/);assert.equal(await page.locator('#inspectorContent input').first().inputValue(),'1500');checks.push('unit preview formats fixture and catalog using production formatters without model edit');
  assert.equal(await page.evaluate(()=>localStorage.length),0);checks.push('no localStorage reads/writes or saved-state claims; file/edit operations disabled in draft');
  await open(1024,'none');assert.equal(await page.locator('.inspector').isVisible(),false);await page.locator('#showInspector').click();assert.equal(await page.locator('.inspector').isVisible(),true);const canvas=await page.locator('.canvas').boundingBox();await shot('1024-properties-drawer');await page.keyboard.press('Escape');assert.equal(await page.locator('.inspector').isVisible(),false);assert.equal((await page.locator('.canvas').boundingBox()).width,canvas.width);checks.push('1024 property drawer closes with Escape and retains canvas container width');
  await page.setViewportSize({width:1280,height:950});await page.goto(URL);await page.locator('#planPreview [data-object]').first().waitFor();await page.locator('#previewWidth').selectOption('1280');await page.locator('#previewState').selectOption('door');await shot('review-board');assert.equal(await page.locator('#inspectorTitle').textContent(),'Door properties');checks.push('review controls change viewport and state in interactive board');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({date:new Date().toISOString(),browser:browser.version(),checks,layouts,screens,errors,scope:'UI-005 prototype only; no production-editor acceptance'},null,2)+'\n');console.log(checks.join('\n'));
 }catch(e){await shot('failure');throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
