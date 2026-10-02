const output=file=>(process.env.NA_TEST_OUT||'docs/verification/NA-fixes')+'/'+file;
export async function run({page,context,assert,project,fs}){
 await page.locator('#newRoom').evaluate(b=>b.click());for(const [k,v] of Object.entries({name:'Living',width:'20 ft',depth:'15 ft',height:'9 ft'}))await page.locator('#roomDialog [name='+k+']').fill(v);await page.locator('#roomDialog [type=submit]').click();
 await page.locator('#editRoom').click();
 for(const name of ['Bedroom','Bathroom']){
  await page.locator('[data-room-add]').click();await page.locator('#roomDialog [name=name]').fill(name);await page.locator('#roomDialog [name=width]').fill(name==='Bedroom'?'12 ft':'8 ft');await page.locator('#roomDialog [name=depth]').fill(name==='Bedroom'?'10 ft':'8 ft');await page.locator('#roomDialog [type=submit]').click();await page.waitForSelector('#roomDialog',{state:'hidden'});
 }
 let p=await project();assert(p.geometry.rooms.length===3,'append failed');assert(!!p.referencePlan,'reference lost');
 await page.locator('#activeRoom').selectOption(p.roomEditor.rooms[0].id);await page.locator('#parentWall').selectOption('bottom');await page.locator('[data-add=door]').click();await page.locator('#roomDialog [type=submit]').click();await page.waitForSelector('#roomDialog',{state:'hidden'});
 p=await project();assert(p.geometry.doors.length===1,'door missing');assert(p.roomEditor.openings[0].roomId===p.roomEditor.rooms[0].id,'door parent wrong');
 await page.locator('#undo').click();assert((await project()).geometry.doors.length===0,'undo failed');await page.locator('#redo').click();assert((await project()).geometry.doors.length===1,'redo failed');
 await page.reload();await page.waitForSelector('#gRooms polygon');assert((await project()).geometry.rooms.length===3,'restore rooms failed');
 const download=page.waitForEvent('download');await page.locator('#exportJson').evaluate(b=>b.click());const d=await download;await d.saveAs(output('NA-002-project.json'));
 await page.locator('#fileIn').setInputFiles(output('NA-002-project.json'));await page.waitForTimeout(200);assert((await project()).geometry.rooms.length===3,'import failed');await page.screenshot({path:output('NA-002.png')});
}
