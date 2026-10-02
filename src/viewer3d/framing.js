import {aabb} from '../core/geometry.js';
export function sceneBox(project,roomId){
 const room=roomId&&project.geometry.rooms.find(r=>r.id===roomId),b=project.geometry.bounds;
 let xs=room?room.poly.map(p=>p[0]):[b.x,b.x+b.w],zs=room?room.poly.map(p=>p[1]):[b.y,b.y+b.h];let height=project.geometry.height;
 if(!roomId)for(const f of project.furniture){const {hw,hh}=aabb(f);xs.push(f.cx-hw,f.cx+hw);zs.push(f.cy-hh,f.cy+hh);height=Math.max(height,f.height||0);}
 return {min:[Math.min(...xs),0,Math.min(...zs)],max:[Math.max(...xs),height,Math.max(...zs)]};
}
/** Solve camera distance from all eight corners in camera coordinates. */
export function fitPerspectiveBox(box,aspect,verticalFov=45,direction=[.3,.82,.49]){
 const n=Math.hypot(...direction),dir=direction.map(v=>v/n),rlen=Math.hypot(dir[0],dir[2]),right=[dir[2]/rlen,0,-dir[0]/rlen],up=[-dir[1]*right[2],dir[2]*right[0]-dir[0]*right[2],dir[1]*right[0]];
 const target=box.min.map((v,i)=>(v+box.max[i])/2),tanV=Math.tan(verticalFov*Math.PI/360),tanH=tanV*Math.max(.01,aspect),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
 let distance=1;
 for(const x of [box.min[0],box.max[0]])for(const y of [box.min[1],box.max[1]])for(const z of [box.min[2],box.max[2]]){const q=[x-target[0],y-target[1],z-target[2]];distance=Math.max(distance,dot(q,dir)+1.18*Math.max(Math.abs(dot(q,right))/tanH,Math.abs(dot(q,up))/tanV));}
 return {target,position:target.map((v,i)=>v+dir[i]*distance),distance,right,up,dir};
}
