const output=file=>(process.env.NA_TEST_OUT||'docs/verification/NA-fixes')+'/'+file;
export async function run({page,assert,project}){
 await page.locator('#newRoom').evaluate(b=>b.click());for(const [k,v]of Object.entries({name:'Center furniture test',width:'20 ft',depth:'15 ft',height:'9 ft'}))await page.locator('#roomDialog [name='+k+']').fill(v);await page.locator('#roomDialog [type=submit]').click();await page.locator('#furnitureSearch').fill('queen');await page.locator('#lib .item').click();
 const overlap=await page.evaluate(()=>{const a=document.querySelector('#gLabels').getBoundingClientRect(),b=document.querySelector('#gFurn text').getBoundingClientRect();return a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;});assert(!overlap,'room/furniture names overlap');
 const dl=page.waitForEvent('download');await page.locator('#exportPng').evaluate(b=>b.click());await (await dl).saveAs(output('NA-007-export.png'));await page.screenshot({path:output('NA-007.png')});
 await page.locator('#gRooms polygon').click({position:{x:20,y:20}});await page.locator('#hideRoomLabel').check();assert(await page.locator('#gLabels text').count()===0,'hide room label failed');await page.reload();await page.waitForSelector('#lib .item');assert(await page.locator('#gLabels text').count()===0,'label preference lost');
}
