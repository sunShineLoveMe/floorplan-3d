import {doorIntersectsFurniture} from './door-clearance.js';
export const obstacleFootprint=o=>({type:'obstacle',cx:(o.rect[0]+o.rect[2])/2,cy:(o.rect[1]+o.rect[3])/2,w:o.rect[2]-o.rect[0],d:o.rect[3]-o.rect[1],rot:0});
/** Separating-axis test: rotated furniture against a fixed rectangular footprint. Contact is allowed. */
export function furnitureIntersectsObstacle(f,o){
 const b=obstacleFootprint(o),a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=f.cx-b.cx,dy=f.cy-b.cy;
 return [[1,0],[0,1],[c,s],[-s,c]].every(([x,y])=>{
  const reach=(f.w*Math.abs(x*c+y*s)+f.d*Math.abs(-x*s+y*c)+b.w*Math.abs(x)+b.d*Math.abs(y))/2;
  return Math.abs(dx*x+dy*y)<reach-1e-6;
 });
}
export function obstacleConflicts(project){
 return (project.geometry.obstacles||[]).flatMap(obstacle=>[
  ...project.furniture.filter(f=>furnitureIntersectsObstacle(f,obstacle)).map(f=>({kind:'furniture',obstacle,furnitureId:f.id,name:f.name})),
  ...project.geometry.doors.filter(d=>doorIntersectsFurniture(d,obstacleFootprint(obstacle))).map(door=>({kind:'door',obstacle,door,name:door.name}))
 ]);
}
