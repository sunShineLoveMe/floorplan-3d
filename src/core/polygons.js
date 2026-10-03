/** Plan coordinates in millimetres. Convex clipping preserves exact sloping edges. */
export const signedPolygonArea=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
export const polygonArea=p=>Math.abs(signedPolygonArea(p));
export const rectPolygon=([x,y,x1,y1])=>[[x,y],[x1,y],[x1,y1],[x,y1]];
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
const ccw=p=>signedPolygonArea(p)<0?[...p].reverse():p;
function clean(poly){
 const p=poly.filter((v,i)=>!i||Math.hypot(v[0]-poly[i-1][0],v[1]-poly[i-1][1])>1e-7);
 if(p.length>1&&Math.hypot(p[0][0]-p.at(-1)[0],p[0][1]-p.at(-1)[1])<=1e-7)p.pop();
 return p.length>=3&&polygonArea(p)>1e-5?p:[];
}
/** Keep the left side of an oriented edge, offset by a signed distance in mm. */
export function clipHalfPlane(poly,a,b,distance=0){
 const threshold=distance*Math.hypot(b[0]-a[0],b[1]-a[1]),result=[];
 for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],dp=cross(a,b,p)-threshold,dq=cross(a,b,q)-threshold;
  if(dp>=-1e-7)result.push(p);
  if((dp>=-1e-7)!==(dq>=-1e-7)){const t=dp/(dp-dq);result.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
 }
 return clean(result);
}
export function intersectConvex(subject,clip){
 const edges=ccw(clip);let p=subject;
 for(let i=0;i<edges.length&&p.length;i++)p=clipHalfPlane(p,edges[i],edges[(i+1)%edges.length]);
 return p;
}
/** Disjoint convex pieces of subject outside a convex cutter. */
export function subtractConvex(subject,clip){
 const edges=ccw(clip),pieces=[];let inside=subject;
 for(let i=0;i<edges.length&&inside.length;i++){
  const a=edges[i],b=edges[(i+1)%edges.length],outside=clipHalfPlane(inside,b,a);
  if(outside.length)pieces.push(outside);inside=clipHalfPlane(inside,a,b);
 }
 return pieces;
}
export function convexPieces(input){
 const p=[...ccw(input)];if(p.every((v,i)=>cross(v,p[(i+1)%p.length],p[(i+2)%p.length])>=-1e-7))return [p];
 const result=[];
 while(p.length>3){
  const i=p.findIndex((b,i)=>{const a=p[(i+p.length-1)%p.length],c=p[(i+1)%p.length];return cross(a,b,c)>1e-7&&!p.some((v,j)=>j!==i&&j!==(i+p.length-1)%p.length&&j!==(i+1)%p.length&&[cross(a,b,v),cross(b,c,v),cross(c,a,v)].every(x=>x>=-1e-7));});
  if(i<0)throw new Error('Invalid simple floor polygon.');
  result.push([p[(i+p.length-1)%p.length],p[i],p[(i+1)%p.length]]);p.splice(i,1);
 }
 result.push(p);return result;
}
export function furniturePolygon(f){
 const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>[f.cx+x*f.w/2*c-y*f.d/2*s,f.cy+x*f.w/2*s+y*f.d/2*c]);
}
export function circleIntersectsPolygon(x,y,r,poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[j],b=poly[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
  if(Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<r-1e-7)return true;
  if((a[1]>y)!==(b[1]>y)&&x<dx*(y-a[1])/dy+a[0])inside=!inside;
 }
 return inside;
}
