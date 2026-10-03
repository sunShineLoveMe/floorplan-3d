import fs from 'node:fs';
import {asHouse} from '../../src/data/house-editor.js';
import {createRectangleProject,updateRectangleProject,validate} from '../../src/data/project-data.js';
import {CATALOGS} from '../../src/data/catalogs.js';
export const diagonalCases=JSON.parse(fs.readFileSync(new URL('../fixtures/north-american/diagonal-layouts.json',import.meta.url))).cases;
export function diagonalFixture(spec){
 const base=createRectangleProject({name:spec.name}),editor=asHouse(base.roomEditor);
 editor.rooms=structuredClone(spec.rooms);editor.openings=spec.openings.map((o,i)=>({id:'opening-'+i,roomId:o.room,wallId:o.room+'--'+o.side,type:o.type,offset:o.offset,width:o.width,height:o.type==='window'?1000:2000,...(o.type==='window'?{sill:900}:{hinge:o.hinge,swing:o.swing})}));
 const rooms=Object.fromEntries(spec.rooms.map(r=>[r.id,{name:r.name,mat:'wood'}]));
 const project=updateRectangleProject(base,editor,rooms);project.name=spec.name;project.units.display='imperial';
 project.furniture=spec.furniture.map((f,i)=>({...f,id:'furniture-'+i,color:'#ddd6c8'}));
 return validate(project,CATALOGS);
}
