import * as THREE from 'three';
import {clearGroup} from './resources.js';
export function createArchitecture({store,opt,space,groups,materials,primitives}){
const {wx,wz}=space, M=v=>v/1000, H=store.getProject().geometry.height/1000;
const {archFloor,archUp,lampG,doors,colliders}=groups;
const {mat,floorMat,wallMat,capMat,glassMat,frameMat,edgeMat,skirtMat}=materials;
const {box,metal}=primitives;
function wallBox([x0, y0, x1, y1], yb, yt, m){
  if (yt <= yb || x1 <= x0 || y1 <= y0) return;
  const o = new THREE.Mesh(new THREE.BoxGeometry(M(x1-x0), yt-yb, M(y1-y0)), m || [wallMat, wallMat, capMat, wallMat, wallMat, wallMat]);
  o.position.set(wx((x0+x1)/2), (yb+yt)/2, wz((y0+y1)/2)); o.castShadow = o.receiveShadow = true; archUp.add(o);
  // 漫游辅助：墙体棱线 + 踢脚线，让相邻墙面、墙角一眼可分（仅漫游模式显示）
  const ln = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), edgeMat); ln.position.copy(o.position); ln.userData.walkOnly = true; ln.visible = opt.mode === 'walk'; archUp.add(ln);
  if (yb <= .001){
    const p = o.geometry.parameters, sh = Math.min(.12, yt), sk = new THREE.Mesh(new THREE.BoxGeometry(p.width + .02, sh, p.depth + .02), skirtMat);
    sk.position.set(o.position.x, sh/2, o.position.z); sk.userData.walkOnly = true; sk.visible = opt.mode === 'walk'; archUp.add(sk);
  }
  return o;
}
function shapeOf(poly, flip){ const s = new THREE.Shape(); poly.forEach(([x, y], i) => s[i ? 'lineTo' : 'moveTo'](wx(x), flip ? wz(y) : -wz(y))); return s; }

function build(){
  clearGroup(archFloor); clearGroup(archUp); clearGroup(lampG); doors.length = 0; colliders.length = 0;
  const top = Math.min(opt.cut,H);
  (store.getProject().geometry.floorSlabs||[]).forEach(([x0,y0,x1,y1])=>{
    const slab=new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([[x0,y0],[x1,y0],[x1,y1],[x0,y1]])).rotateX(-Math.PI/2),floorMat(store.getProject().rooms[store.getProject().geometry.rooms[0].id].mat));slab.receiveShadow=true;archFloor.add(slab);
  });
  (store.getProject().geometry.floorPolygons||[]).forEach(poly=>{
    const slab=new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(poly)).rotateX(-Math.PI/2),floorMat(store.getProject().rooms[store.getProject().geometry.rooms[0].id].mat));slab.receiveShadow=true;archFloor.add(slab);
  });
  store.getProject().geometry.rooms.forEach(r => {
    const m = floorMat(store.getProject().rooms[r.id].mat), bay = r.counted === false;
    const geo = bay ? new THREE.ExtrudeGeometry(shapeOf(r.poly), {depth:.45, bevelEnabled:false}) : new THREE.ShapeGeometry(shapeOf(r.poly));
    geo.rotateX(-Math.PI/2);
    const fl = new THREE.Mesh(geo, bay ? [m, mat('#e9e4da')] : m);
    fl.receiveShadow = true;if(store.getProject().geometry.floorSlabs||store.getProject().geometry.floorPolygons)fl.position.y=.001; fl.userData.room = r.id;
    if (bay){ fl.castShadow = true; archUp.add(fl); } else archFloor.add(fl);
    // 天花：法线朝下，只在室内仰视时可见
    const cg = new THREE.ShapeGeometry(shapeOf(r.poly, true)); cg.rotateX(Math.PI/2);
    const ceil = new THREE.Mesh(cg, mat('#fbfaf7', {roughness:1})); ceil.position.y = H; ceil.visible = top >= H; archUp.add(ceil);
    if (r.at){
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .02, 32), mat('#fff', {emissive:'#fff2d6', emissiveIntensity:.3}));
      lamp.position.set(wx(r.at[0]), H - .012, wz(r.at[1])); lamp.visible = top >= H; lampG.add(lamp);
      const pl = new THREE.PointLight(0xffd9a8, 0, 7, 1.6); pl.position.set(wx(r.at[0]), H - .25, wz(r.at[1])); lampG.add(pl);
    }
  });
  [...store.getProject().geometry.doors, ...store.getProject().geometry.slides,...store.getProject().geometry.lintels.filter(o=>o.passage)].forEach(d => { const [x0, y0, x1, y1] = d.rect; const s = box(M(x1-x0), .012, M(y1-y0), mat('#d8d0c0', {roughness:.3}), wx((x0+x1)/2), 0, wz((y0+y1)/2)); s.castShadow = false; archFloor.add(s); });
  (store.getProject().geometry.passages||[]).forEach(({rect:[x0,y0,x1,y1],roomId})=>archFloor.add(box(M(x1-x0),.012,M(y1-y0),floorMat(store.getProject().rooms[roomId].mat),wx((x0+x1)/2),0,wz((y0+y1)/2))));
  store.getProject().geometry.walls.forEach((w, i) => {
    if (store.getProject().demolished.includes('w'+i)) return;
    wallBox(w, 0, Math.min(top, M(store.getProject().geometry.wallHeights?.[i] ?? (w[4] === 'low' ? 1000 : H*1000))));
    colliders.push([wx(w[0]), wz(w[1]), wx(w[2]), wz(w[3])]);
  });
  (store.getProject().geometry.diagonalWalls||[]).forEach(w=>{
    const yt=Math.min(top,M(w.height));
    if(yt>0){
      const geometry=new THREE.ExtrudeGeometry(shapeOf(w.poly),{depth:yt,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
      const mesh=new THREE.Mesh(geometry,[capMat,wallMat]);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.diagonalWallId=w.id;mesh.userData.room=w.roomId;archUp.add(mesh);
      const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),edgeMat);edges.userData.walkOnly=true;edges.visible=opt.mode==='walk';archUp.add(edges);
    }
    colliders.push({poly:w.poly.map(([x,y])=>[wx(x),wz(y)])});
  });
  (store.getProject().geometry.obstacles||[]).forEach(o=>{
    const mesh=wallBox(o.rect,0,Math.min(top,M(o.height)));if(mesh){mesh.userData.obstacleId=o.id;mesh.userData.room=o.roomId;}
    colliders.push([wx(o.rect[0]),wz(o.rect[1]),wx(o.rect[2]),wz(o.rect[3])]);
  });
  // 门洞、飘窗洞口上方过梁
  [...store.getProject().geometry.doors, ...store.getProject().geometry.slides, ...store.getProject().geometry.lintels].map(d=>[d.rect,M(d.height)])
    .forEach(([r, h]) => { if (top > h) wallBox(r, h, top); });
  store.getProject().geometry.windows.map(w=>w.rect).forEach((r, i) => {
    const sill = M(store.getProject().geometry.windows[i].sill), head = M(store.getProject().geometry.windows[i].head);
    wallBox(r, 0, Math.min(sill, top)); if (top > head) wallBox(r, head, top);
    colliders.push([wx(r[0]), wz(r[1]), wx(r[2]), wz(r[3])]);
    const gTop = Math.min(head, top); if (gTop <= sill) return;
    const [x0, y0, x1, y1] = r, hz = store.getProject().geometry.windows[i].wallId ? ['top','bottom'].includes(String(store.getProject().geometry.windows[i].wallId).split('--').at(-1)) : (x1-x0) >= (y1-y0), L = M(hz ? x1-x0 : y1-y0), gh = gTop - sill, cx = wx((x0+x1)/2), cz = wz((y0+y1)/2);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(hz ? L : .01, gh, hz ? .01 : L), glassMat); pane.position.set(cx, sill + gh/2, cz); archUp.add(pane);
    const n = Math.max(1, Math.round(L/.9)), fw=Math.min(.04,L/2), fh=Math.min(.04,gh/2);
    for (let k = 0; k <= n; k++){ const t = -L/2 + fw/2 + k*(L-fw)/n, mu = new THREE.Mesh(new THREE.BoxGeometry(hz ? fw : .06, gh, hz ? .06 : fw), frameMat);
      mu.position.set(cx + (hz ? t : 0), sill + gh/2, cz + (hz ? 0 : t)); mu.castShadow = true; archUp.add(mu); }
    [sill + fh/2, gTop - fh/2].forEach(y => { const tr = new THREE.Mesh(new THREE.BoxGeometry(hz ? L : .06, fh, hz ? .06 : L), frameMat); tr.position.set(cx, y, cz); archUp.add(tr); });
  });
  store.getProject().geometry.doors.forEach(d => {
    const pivot = new THREE.Group(), L = M(d.len), dh = Math.min(M(d.height)*.98, top);
    pivot.position.set(wx(d.h[0]), 0, wz(d.h[1]));
    const leaf = box(L, dh, Math.min(.04,L*.2), mat(d.entry ? '#6b4f3a' : '#efe6d8', {roughness:.5}), L/2);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(Math.min(.03,L*.1,dh*.1), 12, 8), metal()); knob.position.set(Math.max(L*.5,L - .07), Math.min(1, dh*.5), 0); knob.scale.z = 2.2;
    pivot.add(leaf, knob);
    const ang = v => Math.atan2(-v[1], v[0]), door = {pivot, length:L, id:d.id, a0:ang(d.c), a1:ang(d.o), open:true};
    if (door.a1 - door.a0 > Math.PI) door.a1 -= Math.PI*2; if (door.a0 - door.a1 > Math.PI) door.a1 += Math.PI*2;
    door.cur = door.a1; pivot.rotation.y = door.cur; leaf.userData.door = knob.userData.door = door;
    doors.push(door); archUp.add(pivot);
  });
  store.getProject().geometry.slides.forEach(({rect:[x0, y0, x1, y1], v, height, style, wallId, swing}) => {
    const L = M(v ? y1-y0 : x1-x0), ph = Math.min(M(height), top), pl = L*.55;
    if(style==='bifold'){
      const side=String(wallId).split('--').at(-1),normal=(['top','left'].includes(side)?1:-1)*(swing==='outward'?-1:1),face=M(v?(side==='left'?x1:x0):(side==='top'?y1:y0)),origin=M(v?y0:x0);
      for(const end of [0,1])for(const panel of [0,1]){
        const sign=end?-1:1,along=origin+(end?L:0)+sign*L*(panel ? .09 : .03),depth=normal*L*.12;
        const leaf=box(L/4,ph,.025,mat('#efe6d8', {roughness:.5}));leaf.position.set(v?wx(face*1000+depth*1000):wx(along*1000),ph/2,v?wz(along*1000):wz(face*1000+depth*1000));leaf.rotation.y=(v?0:-Math.PI/2)+(panel?-.245:.245)*sign*normal;leaf.castShadow=true;archUp.add(leaf);
      }
      return;
    }
    [[-1, -.02], [1, .02]].forEach(([s, off]) => {
      const c = s < 0 ? -L/2 + pl/2 : L/2 - pl/2, x = v ? wx((x0+x1)/2) + off : wx(x0) + L/2 + c, z = v ? wz(y0) + L/2 + c : wz((y0+y1)/2) + off;
      const p = new THREE.Mesh(new THREE.BoxGeometry(v ? .02 : pl, ph, v ? pl : .02), style==='sliding'?mat('#efe6d8', {roughness:.5}):glassMat); p.position.set(x, ph/2, z); archUp.add(p);
      [ph - .03, .03].forEach(y => { const fr = new THREE.Mesh(new THREE.BoxGeometry(v ? .04 : pl, .05, v ? pl : .04), frameMat); fr.position.set(x, y, z); archUp.add(fr); });
      [-1, 1].forEach(e => { const fr = new THREE.Mesh(new THREE.BoxGeometry(.04, ph, .04), frameMat); fr.position.set(v ? x : x + e*pl/2, ph/2, v ? z + e*pl/2 : z); archUp.add(fr); });
    });
  });

}


return {build};
}
