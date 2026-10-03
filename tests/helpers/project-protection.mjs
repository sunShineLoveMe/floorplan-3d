/** Exercise the visible product review instead of bypassing replacement protection. */
export async function uploadProject(page,file){
  await page.locator('#fileIn').setInputFiles(file);
  await page.locator('#protectionDialog [data-choice]').filter({hasText:'Continue replacement'}).waitFor();
  await page.locator('#protectionDialog [data-choice]').filter({hasText:'Continue replacement'}).click();
  await page.locator('#protectionDialog').waitFor({state:'hidden'});
  await page.waitForFunction(()=>!document.body.classList.contains('busy'));
}
