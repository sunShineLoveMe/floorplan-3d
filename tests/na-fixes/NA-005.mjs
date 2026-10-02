const output=file=>(process.env.NA_TEST_OUT||'docs/verification/NA-fixes')+'/'+file;
export async function run({page,assert,project}){
 if(await page.locator('html').getAttribute('lang')!=='en')await page.locator('#langBtn').click();
 await page.locator('#furnitureSearch').fill('queen');assert(await page.locator('#lib .item').count()===1,'Queen not found');assert(await page.locator('#lib .item small').last().innerText().then(t=>t.includes('excludes frame')),'dimension scope missing');await page.locator('#lib .item').click();const p=await project(),bed=p.furniture.at(-1);assert(bed.w===1524&&bed.d===2032,'queen dimensions incorrect');await page.locator('#fW').fill('64 in');await page.locator('#fW').press('Tab');assert((await project()).furniture.at(-1).w===1625.6,'actual outer dimensions not editable');
 for(const query of ['Twin XL','Full','California King','cal king','couch']){await page.locator('#furnitureSearch').fill(query);assert(await page.locator('#lib .item').count()>0,query+' missing');}
 await page.locator('#furnitureSearch').fill('bed');assert(!await page.locator('#lib .item b').allTextContents().then(ns=>ns.includes('Chair')),'category overmatch');await page.locator('#furnitureSearch').fill('queen');await page.screenshot({path:output('NA-005.png')});
}
