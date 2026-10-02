import fs from 'node:fs';
import {createRectangleProject,updateRectangleProject,validate} from '../../src/data/project-data.js';
import {CATALOGS} from '../../src/data/catalogs.js';
export const FT=304.8;
export const SIDES=['top','right','bottom','left'];
export function fixture(id){return JSON.parse(fs.readFileSync(new URL('../fixtures/north-american/'+id+'.json',import.meta.url),'utf8'));}
export function fixtureProject(spec){
 const rooms=Object.fromEntries(spec.rooms.map(r=>[r.id,{name:r.name,mat:/Bath|Kitchen|Laundry/.test(r.name)?'tile600':'wood'}]));
 const e={kind:'house',floorSlab:true,height:8*FT,wallThickness:120,rooms:spec.rooms.map(r=>({id:r.id,x:r.x*FT,y:r.y*FT,width:r.width*FT,depth:r.depth*FT,...(r.notch?{notch:{corner:r.notch.corner,width:r.notch.width*FT,depth:r.notch.depth*FT}}:{}),wallWidths:Object.fromEntries(SIDES.map((s,i)=>[s,r.walls[i]*25.4])),...(r.segments?{wallSegments:Object.fromEntries(Object.entries(r.segments).map(([s,a])=>[s,a.map(([offset,length,height])=>({offset:offset*FT,length:length*FT,height:height*FT}))]))}:{})})),openings:spec.openings.map(o=>({id:o.id,roomId:o.room,wallId:o.room+'--'+o.side,type:o.type,offset:o.offset*FT,width:o.width*FT,...(o.pairedWith?{pairedWith:o.pairedWith}:{}),height:(o.height??(6+8/12))*FT,...(o.type==='window'?{sill:((6+8/12)-(o.height??4))*FT}:o.mode?{mode:o.mode,...(o.mode==='bifold'?{swing:o.swing}:{})}:{hinge:o.hinge,swing:o.swing})}))};
 const p=updateRectangleProject(createRectangleProject({name:spec.name}),e,rooms);p.units.display='imperial';
 p.furniture=(spec.furniture||[]).map((f,i)=>({id:spec.id+'-fixture-'+i,type:f.type,name:f.name,w:f.w*FT,d:f.d*FT,cx:f.x*FT,cy:f.y*FT,rot:f.rot||0,color:'#ddd6c8'}));
 return validate(p,CATALOGS);
}
