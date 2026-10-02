import test from 'node:test';
import assert from 'node:assert/strict';
import {printLayout} from '../src/services/print-plan.js';
import {exportName} from '../src/services/export-names.js';
test('physical print dimensions respect scale and reject cropped pages',()=>{
 const b={w:13632,h:10584};const page=printLayout(b,{paper:'letter',orientation:'landscape',scale:'100'});assert.equal(page.drawingWidth,136.32);assert.equal(page.drawingHeight,105.84);assert.equal(page.width,279.4);
 assert.throws(()=>printLayout(b,{paper:'letter',scale:'50'}),/does not fit/);const fit=printLayout(b,{paper:'a4',orientation:'portrait',scale:'fit'});assert.ok(fit.drawingWidth<=fit.width-20+.001&&fit.drawingHeight<=fit.height-48+.001);
});
test('export names distinguish project, layout, date and representation with safe characters',()=>{
 const date=new Date(2026,9,2,1,2,3),p={name:'House / A',layout:{name:'Layout: B'}};assert.equal(exportName(p,'2D','png',date),'House - A-Layout- B-2026-10-02-010203-2D.png');assert.notEqual(exportName(p,'2D','png',date),exportName({...p,layout:{name:'Layout C'}},'2D','png',date));
});
