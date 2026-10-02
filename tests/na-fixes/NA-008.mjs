const output=file=>(process.env.NA_TEST_OUT||'docs/verification/NA-fixes')+'/'+file;
export async function run({page,assert,project}){
 await page.locator('#newRoom').evaluate(b=>b.click());for(const [k,v]of Object.entries({name:'40 x 30 ft camera test',width:'40 ft',depth:'30 ft',height:'9 ft'}))await page.locator('#roomDialog [name='+k+']').fill(v);await page.locator('#roomDialog [type=submit]').click();await page.locator('#removeReference').evaluate(b=>b.click());await page.locator('#furnitureSearch').fill('queen');await page.locator('#lib .item').click();
 await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&!document.querySelector('body').classList.contains('busy'),{},{timeout:60000});await page.screenshot({path:output('NA-008-initial-3d.png')});assert(await page.locator('#fit3d').isVisible(),'3D fit missing');
 await page.locator('#vIso').evaluate(b=>b.click());await page.waitForTimeout(1100);await page.screenshot({path:output('NA-008-iso.png')});
 await page.locator('#fit3d').click();await page.waitForTimeout(1100);await page.screenshot({path:output('NA-008-fit.png')});await page.locator('[data-view="2d"]').click();await page.waitForFunction(()=>!document.body.classList.contains('busy'));
}
