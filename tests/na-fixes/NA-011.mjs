const output=file=>(process.env.NA_TEST_OUT||'docs/verification/NA-fixes')+'/'+file;
export async function run({page,assert,project}){
 for(const [language,units,show]of [['en','imperial',false],['en','metric',false],['zh-CN','imperial',false],['zh-CN','metric',true]]){
  if(await page.locator('html').getAttribute('lang')!==language)await page.locator('#langBtn').click();await page.locator('#projectUnits').selectOption(units);await page.locator('#projectDetails').evaluate(d=>d.open=true);const text=await page.locator('#projectDetails').innerText();assert(text.includes('¥')===show,'pricing mismatch '+language+' '+units);
 }
 await page.locator('#langBtn').click();await page.locator('#projectUnits').selectOption('imperial');await page.screenshot({path:output('NA-011.png')});
}
