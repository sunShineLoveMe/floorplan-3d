import {convexPieces,polygonArea,furniturePolygon,rectPolygon,intersectConvex,subtractConvex} from './polygons.js';
import {doorIntersectsPolygon} from './door-clearance.js';
/** Editable floor geometry, independent of plan names, room sizes or cut directions. */
export function floorConflicts(project){
 if(!project.roomEditor)return [];
 const g=project.geometry,walls=g.diagonalWalls||[],floors=g.rooms.flatMap(r=>convexPieces(r.poly));
 floors.push(...[...g.doors,...g.slides,...g.lintels.filter(o=>o.passage),...(g.passages||[])].map(o=>rectPolygon(o.rect)));
 const result=[];
 for(const f of project.furniture){
  const footprint=furniturePolygon(f),wall=walls.find(w=>polygonArea(intersectConvex(footprint,w.poly))>1e-5);
  if(wall){result.push({kind:'wall',wall,furnitureId:f.id,name:f.name});continue;}
  let outside=[footprint];for(const floor of floors){outside=outside.flatMap(p=>subtractConvex(p,floor));if(!outside.length)break;}
  if(outside.reduce((sum,p)=>sum+polygonArea(p),0)>1e-3)result.push({kind:'floor',furnitureId:f.id,name:f.name});
 }
 for(const door of g.doors){const wall=walls.find(w=>doorIntersectsPolygon(door,w.poly));if(wall)result.push({kind:'door',wall,door,name:door.name});}
 return result;
}
