/** Bound canvas allocation while retaining the entire aspect ratio. */
export function rasterSize(bounds,longEdge=3200){
 if(![bounds.w,bounds.h,longEdge].every(n=>Number.isFinite(n)&&n>0))throw Error('Invalid image bounds.');
 const edge=Math.min(longEdge,4800),scale=Math.min(edge/Math.max(bounds.w,bounds.h),Math.sqrt(12000000/(bounds.w*bounds.h)));
 return {width:Math.max(1,Math.floor(bounds.w*scale)),height:Math.max(1,Math.floor(bounds.h*scale))};
}
export function contentBounds(base,boxes){
 const valid=boxes.filter(b=>[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.width>=0&&b.height>=0&&(b.width||b.height));
 const x=Math.min(base.x,...valid.map(b=>b.x)),y=Math.min(base.y,...valid.map(b=>b.y));
 const right=Math.max(base.x+base.w,...valid.map(b=>b.x+b.width)),bottom=Math.max(base.y+base.h,...valid.map(b=>b.y+b.height));
 const pad=Math.max(60,Math.max(right-x,bottom-y)*.012);
 return {x:x-pad,y:y-pad,w:right-x+2*pad,h:bottom-y+2*pad};
}
