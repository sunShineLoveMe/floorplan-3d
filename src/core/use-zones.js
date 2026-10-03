import {rectPolygon,convexPieces,subtractConvex,intersectConvex,polygonArea} from './polygons.js';
import {passageSpace} from './spatial-clearance.js';
export const USE_ZONE_KINDS=['bed-side','seating','cabinet','appliance'];
export const USE_ZONE_SIDES=['top','right','bottom','left'];
/** Explicit rectangular planning envelope, anchored to an item edge in local coordinates. */
export function useZonePolygon(f,z){
 const horizontal=['top','bottom'].includes(z.side),sign=['top','left'].includes(z.side)?-1:1;
 const local=horizontal?rectPolygon([z.offsetMm-z.widthMm/2,sign<0?-f.d/2-z.depthMm:f.d/2,z.offsetMm+z.widthMm/2,sign<0?-f.d/2:f.d/2+z.depthMm]):rectPolygon([sign<0?-f.w/2-z.depthMm:f.w/2,z.offsetMm-z.widthMm/2,sign<0?-f.w/2:f.w/2+z.depthMm,z.offsetMm+z.widthMm/2]);
 const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return local.map(([x,y])=>[f.cx+x*c-y*s,f.cy+x*s+y*c]);
}
/** Plan-only overlap checks. No inference of names, height, hinges or concurrent zone use. */
export function useZoneReport(p){
 const space=passageSpace(p),floors=space.floors.flatMap(convexPieces),zones=[];
 for(const f of p.furniture)for(const z of f.useZones||[]){
  const poly=useZonePolygon(f,z),conflicts=[];let outside=[poly];
  for(const floor of floors){outside=outside.flatMap(piece=>subtractConvex(piece,floor));if(!outside.length)break;}
  const outsideMm2=outside.reduce((n,piece)=>n+polygonArea(piece),0);
  if(outsideMm2>0.001)conflicts.push({kind:'floor',id:'net-floor',name:'Outside net floor',overlapMm2:outsideMm2});
  for(const o of space.obstacles){
   if(o.kind==='furniture'&&o.id===f.id)continue;
   const overlapMm2=convexPieces(o.poly).reduce((n,piece)=>n+polygonArea(intersectConvex(poly,piece)),0);
   if(overlapMm2>0.001)conflicts.push({kind:o.kind,id:o.id,name:o.name,overlapMm2});
  }
  zones.push({furnitureId:f.id,zoneId:z.id,kind:z.kind,side:z.side,widthMm:z.widthMm,depthMm:z.depthMm,offsetMm:z.offsetMm,poly,outsideMm2,status:conflicts.length?'conflict':'clear',conflicts});
 }
 return {zones};
}
