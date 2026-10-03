/** Inspect actual rendered glyph bounds in model coordinates, independent of the label layout helper. */
export async function auditFurnitureLabels(page){
 return page.evaluate(()=>{
  const p=JSON.parse(localStorage.getItem('floorplan-project-v2')),svg=document.querySelector('#plan'),root=svg.getCTM().inverse();
  return p.furniture.flatMap(f=>{
   const text=document.querySelector(`#gFurn [data-fid="${f.id}"] text`);if(!text)return [];
   const b=text.getBBox(),m=root.multiply(text.getCTM()),a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
   const corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>{const q=new DOMPoint(x,y).matrixTransform(m),dx=q.x-f.cx,dy=q.y-f.cy;return [dx*c+dy*s,-dx*s+dy*c];});
   const within=corners.every(([x,y])=>Math.abs(x)<=f.w/2+.001&&Math.abs(y)<=f.d/2+.001);
   return [{id:f.id,name:f.name,rotation:f.rot,withinFootprint:within,corners,displayed:text.textContent,lines:text.querySelectorAll('tspan').length}];
  });
 });
}
