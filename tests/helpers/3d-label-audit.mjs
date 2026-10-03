import assert from 'node:assert/strict';
export async function audit3dLabels(page){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=await page.evaluate(()=>{const host=document.querySelector('#view3d'),b=host.getBoundingClientRect();return {bounds:{left:b.left,top:b.top,right:b.right,bottom:b.bottom},labels:[...host.querySelectorAll('.rlabel')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {id:el.dataset.roomId,name:el.textContent,visible:s.display!=='none'&&s.visibility!=='hidden'&&r.width>0,left:r.left,top:r.top,right:r.right,bottom:r.bottom};})};});
 const visible=state.labels.filter(l=>l.visible);assert.ok(visible.length>0);
 for(const a of visible){assert.ok(a.id&&a.name);assert.ok(a.left>=state.bounds.left-.5&&a.right<=state.bounds.right+.5&&a.top>=state.bounds.top-.5&&a.bottom<=state.bounds.bottom+.5);}
 for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){const a=visible[i],b=visible[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${a.name} obscures ${b.name}`);}
 return {visible:visible.map(l=>l.id),hidden:state.labels.filter(l=>!l.visible).map(l=>l.id),labels:state.labels};
}
