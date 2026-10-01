/* UI-010 state and rendered UI checks, in isolated contexts. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.TEST_OUT||'docs/verification/UI-010');
const URL=process.env.TEST_URL||'http://127.0.0.1:8086';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],checks=[],metrics=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 const style=selector=>page.locator(selector).evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{height:r.height,width:r.width,bg:s.backgroundColor,color:s.color,border:s.borderColor,borderStyle:s.borderStyle,outline:s.outlineStyle,outlineColor:s.outlineColor,fontSize:s.fontSize};});
 try{
  await page.goto(URL+'/docs/ui-samples/UI-010/');await page.locator('#samplePrimary').waitFor();
  assert.equal((await style('#samplePrimary')).height,40);assert.equal((await style('#samplePrimary')).bg,'rgb(36, 92, 75)');
  await page.locator('#samplePrimary').hover();assert.equal((await style('#samplePrimary')).bg,'rgb(27, 71, 58)');
  await page.locator('#samplePrimary').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal((await style('#samplePrimary')).outline,'solid');
  assert.equal((await style('#sampleDisabled')).borderStyle,'dashed');assert.equal((await style('.ui-icon-button')).height,44);
  await page.screenshot({path:path.join(OUT,'control-states.png'),fullPage:true});checks.push('primary normal/hover, actual keyboard focus, disabled boundary and 40/44px targets');
  await page.locator('#sampleFurnitureTab').click();assert.equal(await page.locator('#sampleFurniture').isVisible(),true);
  await page.locator('#sampleLength').fill('bad');assert.equal(await page.locator('#sampleLength').getAttribute('aria-invalid'),'true');assert.equal((await style('#sampleLength')).border,'rgb(180, 35, 24)');
  await page.locator('#openSampleDialog').click();assert.equal((await style('#applySampleDialog')).bg,'rgb(36, 92, 75)');await page.screenshot({path:path.join(OUT,'dialog-states.png')});await page.keyboard.press('Escape');assert.equal(await page.locator('#openSampleDialog').evaluate(e=>e===document.activeElement),true);
  await page.locator('#showSampleToast').click();assert.equal(await page.locator('#sampleToast').isVisible(),true);checks.push('sample tabs, associated input error, primary dialog action, Escape focus and feedback');
  const contrast=await page.evaluate(()=>{
   const tokens=getComputedStyle(document.documentElement),color=n=>tokens.getPropertyValue(n).trim();
   const luminance=h=>{const rgb=h.replace('#','').match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
   const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
   return ['--color-text-primary','--color-text-secondary','--color-text-muted','--color-brand','--color-danger'].map(token=>({token,color:color(token),onWhite:ratio(color(token),color('--color-surface')),onSubtle:ratio(color(token),color('--color-surface-subtle'))}));
  });assert.ok(contrast.every(c=>c.onWhite>=4.5&&c.onSubtle>=4.5));checks.push('specified text/brand/error token contrast >=4.5 on white and subtle surfaces (computed, not app-wide certification)');
  await page.goto(URL);await page.locator('#lib .item').first().waitFor();await page.locator('#langBtn').click();await page.setInputFiles('#fileIn','docs/verification/UI-000/baseline-project.json');await page.locator('#gFurn [data-fid="ui-bed"]').click();await page.locator('#fW').waitFor();
  assert.ok(Math.abs((await style('#fW')).height-40)<.01);assert.ok(Math.abs((await style('#zoomIn')).height-44)<.01);assert.equal((await style('#redo')).borderStyle,'dashed');
  await page.locator('#fW').focus();assert.equal(await page.locator('#projectUnits').isDisabled(),true);await page.locator('#fW').press('Escape');
  const before=await page.evaluate(()=>localStorage.getItem('floorplan-project-v2'));await page.locator('#fW').fill('bad');await page.locator('#fW').press('Tab');assert.equal(await page.locator('#fW').getAttribute('aria-invalid'),'true');assert.equal((await style('#fW')).border,'rgb(180, 35, 24)');assert.equal(await page.evaluate(()=>localStorage.getItem('floorplan-project-v2')),before);await page.screenshot({path:path.join(OUT,'real-field-error.png')});
  await page.locator('#fW').focus();await page.keyboard.press('Escape');checks.push('production field height, icon target, disabled history, unit lock and invalid input isolation');
  for(const width of [1440,1280,1024,390]){await page.setViewportSize({width,height:width===390?844:900});await page.waitForTimeout(350);const m=await page.evaluate(()=>({width:innerWidth,headerHeight:document.querySelector('header').getBoundingClientRect().height,canvasWidth:document.querySelector('#stage').clientWidth,overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(m.overflow,false);assert.ok(m.canvasWidth>0);metrics.push(m);}
  checks.push('1440/1280/1024/390 visible canvas and no page horizontal overflow; legacy wrapping remains');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'control-results.json'),JSON.stringify({date:new Date().toISOString(),browser:browser.version(),checks,contrast,metrics,errors},null,2)+'\n');console.log(checks.join('\n'));
 }catch(e){await page.screenshot({path:path.join(OUT,'control-failure.png')});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
