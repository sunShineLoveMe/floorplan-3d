import fs from 'node:fs';import {createRequire} from 'node:module';
import {LIB} from '../src/data/catalogs.js';
import {createRectangleProject} from '../src/data/project-data.js';
import {uploadProject} from './helpers/project-protection.mjs';
const {chromium}=createRequire(import.meta.url)('/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='docs/verification/T04-furniture-dimensions/baseline';fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const p=await b.newPage({viewport:{width:1440,height:1000}});await p.goto('http://127.0.0.1:8095/');await p.locator('#lib .item').first().waitFor();
 const items=LIB.flatMap(c=>c.items).map(([type,name,w,d,color],i)=>({id:'audit-'+i,type,name,w,d,color,cx:1800,cy:2000,rot:0}));
 const types=[...new Map(items.map(f=>[f.type,f])).values()];
 for(const f of types)for(const rot of [0,90,37])items.push({...f,id:f.id+'-fraction-'+rot,w:731.123456,d:419.987654,height:87.654321,rot},{...f,id:f.id+'-small-'+rot,w:50,d:60,height:.125,rot});
 const results=await p.evaluate(async items=>{const {auditFurnitureMeshes}=await import('/tests/helpers/furniture-mesh-audit.js');return auditFurnitureMeshes(items);},items);
 const project=createRectangleProject({width:5000,depth:4000});project.units.display='metric';project.furniture=[{...types.find(f=>f.type==='bed'),w:1524,d:2032,height:900,rot:0}];fs.writeFileSync(out+'/project.json',JSON.stringify(project,null,2));
 await uploadProject(p,out+'/project.json');await p.locator('#gFurn [data-fid]').click();const hasHeight=await p.locator('#fH').count();await p.screenshot({path:out+'/missing-height.png'});
 await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>document.body.classList.contains('m3d')&&!document.body.classList.contains('busy'));await p.screenshot({path:out+'/bed-3d.png'});
 fs.writeFileSync(out+'/results.json',JSON.stringify({build:await p.locator('html').getAttribute('data-build'),hasHeight,measurements:results},null,2));
 console.log(JSON.stringify({samples:results.length,hasHeight,bed:results[3],failures:results.filter(r=>r.outside||r.negativeParameters||r.nonFinite||Math.abs(r.min[1])>1e-4).length},null,2));
}finally{await b.close();}
