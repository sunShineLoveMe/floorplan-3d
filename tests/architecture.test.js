import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateRoomGeometry} from '../src/data/room-editor.js';

// Exercise the actual architecture builder without a DOM, CDN, or GPU. These
// doubles record scene construction and reject invalid box dimensions; browser
// regressions remain responsible for WebGL appearance and pointer interaction.
class Vector {
  set(x=0,y=0,z=0){Object.assign(this,{x,y,z});return this;}
  copy(v){return this.set(v.x,v.y,v.z);}
}
class Group {
  constructor(){this.children=[];this.position=new Vector();this.rotation={};this.userData={};this.scale={};}
  add(...objects){this.children.push(...objects);}
}
class Mesh extends Group {
  constructor(geometry,material){super();Object.assign(this,{geometry,material});}
}
class BoxGeometry {
  static count=0;
  constructor(width,height,depth){
    assert.ok([width,height,depth].every(v=>Number.isFinite(v)&&v>0),`Invalid box ${width}, ${height}, ${depth}`);
    this.parameters={width,height,depth};BoxGeometry.count++;
  }
}
class Shape {moveTo(){} lineTo(){}}
class Geometry {rotateX(){}}
const THREE={Group,Mesh,BoxGeometry,Shape,ShapeGeometry:Geometry,ExtrudeGeometry:Geometry,CylinderGeometry:Geometry,SphereGeometry:Geometry,EdgesGeometry:Geometry,LineSegments:Mesh,PointLight:Group};

async function loadArchitecture(){
  const source=await readFile(new URL('../src/viewer3d/architecture.js',import.meta.url),'utf8');
  const threeImport="import * as THREE from 'three';",resourceImport="import {clearGroup} from './resources.js';";
  assert.ok(source.includes(threeImport)&&source.includes(resourceImport),'Builder import wiring changed; update the test loader');
  // Inject only the external rendering/runtime dependencies, preserving every
  // geometry and direction calculation in the source under test.
  const transformed=source.replace(threeImport,'const THREE=dependencies.THREE;')
    .replace(resourceImport,'const clearGroup=dependencies.clearGroup;')
    .replace('export function createArchitecture','function createArchitecture');
  return new Function('dependencies',`${transformed}\nreturn createArchitecture;`)({THREE,clearGroup:g=>{g.children=[];}});
}

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} differs from ${b}`);

test('architecture builds positive meshes at opening boundaries and matches all door directions',async()=>{
  const createArchitecture=await loadArchitecture();let cases=0;
  for(const wallId of ['top','right','bottom','left'])
  for(const hinge of ['start','end'])
  for(const swing of ['inward','outward'])
  for(const width of [1,900])
  for(const height of [1,2799,2800])
  for(const sill of [0,1000])
  for(const windowHeight of [1,2800-sill])
  for(const cut of [.05,1,2.8]){
    const editor={kind:'rectangle',roomId:'r',width:4000,depth:3000,height:2800,wallThickness:120,openings:[
      {id:'door',type:'door',wallId,hinge,swing,width,height,offset:500},
      {id:'window',type:'window',wallId:({top:'bottom',bottom:'top',left:'right',right:'left'})[wallId],offset:500,width,sill,height:windowHeight}
    ]};
    const rooms={r:{name:'Room',mat:'wood'}},geometry=generateRoomGeometry(editor,rooms),project={geometry,rooms,demolished:[]};
    const groups={archFloor:new Group(),archUp:new Group(),lampG:new Group(),doors:[],colliders:[]};
    const box=(w,h,d,m,x=0,y=0,z=0)=>{
      const object=new Mesh(new BoxGeometry(w,h,d),m);object.position.set(x,y+h/2,z);return object;
    };
    createArchitecture({store:{getProject:()=>project},opt:{cut,mode:'orbit'},space:{wx:v=>(v-2000)/1000,wz:v=>(v-1500)/1000},groups,
      materials:{mat:()=>({}),floorMat:()=>({})},primitives:{box,metal:()=>({})}}).build();
    const opening=geometry.doors[0],door=groups.doors[0];
    assert.equal(groups.doors.length,1);assert.equal(door.length,width/1000);
    close(door.pivot.position.x,(opening.h[0]-2000)/1000);
    close(door.pivot.position.z,(opening.h[1]-1500)/1000);
    for(const [angle,vector] of [[door.a0,opening.c],[door.a1,opening.o]]){
      close(Math.cos(angle),vector[0]);close(-Math.sin(angle),vector[1]);
    }
    const ex=opening.h[0]+opening.c[0]*opening.len,ey=opening.h[1]+opening.c[1]*opening.len;
    assert.ok(ex>=opening.rect[0]&&ex<=opening.rect[2]&&ey>=opening.rect[1]&&ey<=opening.rect[3]);
    // Full-height doors have no upper wall; H-1 mm doors must retain their
    // valid 1 mm lintel. Identify the actual mesh from aperture bounds.
    if(cut===2.8){
      const [x0,y0,x1,y1]=opening.rect;
      const lintels=groups.archUp.children.filter(o=>o.geometry instanceof BoxGeometry
        &&Math.abs(o.position.x-((x0+x1)/2-2000)/1000)<1e-12
        &&Math.abs(o.position.z-((y0+y1)/2-1500)/1000)<1e-12
        &&Math.abs(o.geometry.parameters.width-(x1-x0)/1000)<1e-12
        &&Math.abs(o.geometry.parameters.depth-(y1-y0)/1000)<1e-12);
      assert.equal(lintels.length,height===2800?0:1);
      if(lintels.length) close(lintels[0].geometry.parameters.height,(2800-height)/1000);
    }
    cases++;
  }
  assert.equal(cases,1152);assert.ok(BoxGeometry.count>20000);
});
