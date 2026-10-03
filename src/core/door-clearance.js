/** Potential plan-view conflicts between a quarter-circle swing and rotated footprints. */
export function doorIntersectsFurniture(door,f){
 if(f.type==='rug')return false;
 const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return doorIntersectsPolygon(door,[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>[f.cx+x*f.w/2*c-y*f.d/2*s,f.cy+x*f.w/2*s+y*f.d/2*c]));
}
export function doorIntersectsPolygon(door,footprint){
 let poly=footprint.map(([x,y])=>{const dx=x-door.h[0],dy=y-door.h[1];return [dx*door.c[0]+dy*door.c[1],dx*door.o[0]+dy*door.o[1]];});
 for(const axis of [0,1]){
  const clipped=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],inside=p[axis]>=0,next=q[axis]>=0;if(inside)clipped.push(p);if(inside!==next){const t=p[axis]/(p[axis]-q[axis]);clipped.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}poly=clipped;
 }
 if(!poly.length)return false;
 let distance=Infinity;
 for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],dx=q[0]-p[0],dy=q[1]-p[1],t=Math.max(0,Math.min(1,-(p[0]*dx+p[1]*dy)/(dx*dx+dy*dy||1)));
  distance=Math.min(distance,Math.hypot(p[0]+t*dx,p[1]+t*dy));
 }
 return distance<door.len-1e-6;
}
export function doorConflicts(project){
 return project.geometry.doors.flatMap((door,i)=>project.furniture.filter(f=>doorIntersectsFurniture(door,f)).map(f=>({doorId:door.id||'door-'+i,door,furnitureId:f.id,name:f.name})));
}
