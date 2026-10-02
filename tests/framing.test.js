import test from 'node:test';
import assert from 'node:assert/strict';
import {fitPerspectiveBox} from '../src/viewer3d/framing.js';
test('40x30ft room including wall height fits wide and narrow viewports',()=>{
 const b={min:[-6.216,0,-4.692],max:[6.216,2.7432,4.692]};
 for(const aspect of [.4,1,1.2,2.4])for(const dir of [[.3,.82,.49],[0,1,.0001]]){
  const fit=fitPerspectiveBox(b,aspect,45,dir),dot=(a,c)=>a.reduce((s,v,i)=>s+v*c[i],0),tan=Math.tan(Math.PI/8);
  for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]]){const q=[x,y,z].map((v,i)=>v-fit.target[i]),depth=fit.distance-dot(q,fit.dir);assert.ok(Math.abs(dot(q,fit.right))/depth/tan/aspect<1);assert.ok(Math.abs(dot(q,fit.up))/depth/tan<1);}
 }
});
