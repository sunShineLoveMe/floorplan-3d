const output=file=>(process.env.NA_TEST_OUT||'docs/verification/NA-fixes')+'/'+file;
export async function run({page,assert,project}){
 await page.locator('#newRoom').evaluate(b=>b.click());for(const [k,v] of Object.entries({name:'Clearance test',width:'40 ft',depth:'30 ft',height:'9 ft'}))await page.locator('#roomDialog [name='+k+']').fill(v);await page.locator('#roomDialog [type=submit]').click();await page.locator('#projectUnits').selectOption('imperial');
 await page.locator('#editRoom').click();await page.locator('#parentWall').selectOption('bottom');await page.locator('[data-add=door]').click();for(const [k,v]of Object.entries({offset:'36 in',width:'36 in',height:'80 in'}))await page.locator('#roomDialog [name='+k+']').fill(v);await page.locator('#roomDialog [type=submit]').click();
 await page.locator('#furnitureSearch').fill('3-seat sofa');await page.locator('#lib .item').click();for(const [k,v]of Object.entries({fW:'90 in',fD:'36 in',fX:'54 in',fY:'342 in'})){await page.locator('#'+k).fill(v);await page.locator('#'+k).press('Tab');}
 await page.waitForSelector('#clearanceStatus');assert(await page.locator('#gWarnings path').count()===1,'sweep not on top');await page.screenshot({path:output('NA-006-blocked.png')});
 await page.locator('#fX').fill('200 in');await page.locator('#fX').press('Tab');assert(await page.locator('#clearanceStatus').isHidden(),'moving away did not clear conflict');
 await page.locator('#fX').fill('54 in');await page.locator('#fX').press('Tab');await page.locator('#fR').fill('90');await page.locator('#fR').press('Tab');assert(await page.locator('#clearanceStatus').isVisible(),'rotation not checked');
 await page.reload();await page.waitForSelector('#clearanceStatus');await page.locator('#clearanceStatus').click();await page.waitForSelector('#fW');assert(await page.locator('#fR').inputValue()==='90','saved rotation lost');
}
