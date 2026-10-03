const output=file=>(process.env.NA_TEST_OUT||'docs/verification/NA-fixes')+'/'+file;
export async function run({page,assert,project,fs}){
 const before=await project();await page.reload();await page.waitForSelector('#furnitureCategory option',{state:'attached'});assert(await page.locator('#furnitureCategory option').count()>2,'categories empty');
 assert(await page.locator('#structurePanel #activeRoom').count()===1&&await page.locator('#structurePanel [data-room-add]').count()===1&&await page.locator('#structurePanel #parentWall option').count()===4,'structure controls missing');assert(await page.locator('#projectDetails').count()===1,'advanced panel missing');
 const data=await page.evaluate(()=>({build:document.documentElement.dataset.build,imports:JSON.parse(document.querySelector('[type=importmap]').textContent).imports,entries:performance.getEntriesByType('resource').map(e=>e.name)}));
 assert(data.entries.filter(url=>url.includes('/src/')||url.includes('/styles/')).every(url=>url.includes('v='+data.build)),'mixed resources');assert(JSON.stringify((await project()).geometry)===JSON.stringify(before.geometry),'upgrade changed project');fs.writeFileSync(output('NA-004-resources.json'),JSON.stringify(data,null,2));await page.screenshot({path:output('NA-004.png')});
}
