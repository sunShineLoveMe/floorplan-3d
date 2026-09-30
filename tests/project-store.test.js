import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createProjectStore} from '../src/core/project-store.js';
import {defaultState} from '../src/data/default-project.js';
const custom=JSON.parse(fs.readFileSync(new URL('./fixtures/custom-project.json',import.meta.url)));
test('mutation notifies once with the current project; unchanged operations do not commit',()=>{
 const store=createProjectStore(defaultState());const events=[];store.subscribe(e=>events.push(e));
 store.mutate(p=>p.furniture[0].w=1234.5);assert.equal(events.length,1);assert.equal(events[0].project,store.getProject());
 store.mutate(()=>{});assert.equal(events.length,1);assert.equal(store.getProject().furniture[0].w,1234.5);
});
test('drag previews have one history entry, cancellation restores without committing',()=>{
 const initial=defaultState(),store=createProjectStore(initial),events=[];store.subscribe(e=>events.push(e.reason));
 store.begin();for(let i=0;i<30;i++)store.preview(p=>p.furniture[0].cx++);assert.deepEqual(events,[]);store.commit();
 assert.equal(store.getProject().furniture[0].cx,initial.furniture[0].cx+30);assert.deepEqual(events,['commit']);
 assert.equal(store.undo(),true);assert.equal(store.undo(),false);assert.deepEqual(store.getProject(),initial);
 store.begin();store.preview(p=>p.furniture[0].w=999);store.cancel();assert.deepEqual(store.getProject(),initial);assert.equal(store.canUndo,false);
});
test('import undo/redo restores complete geometry and new edits clear redo',()=>{
 const initial=defaultState(),store=createProjectStore(initial);const projects=[];store.subscribe(e=>projects.push(e.project));
 store.replaceProject(custom);assert.equal(projects.at(-1),store.getProject());assert.deepEqual(store.getProject().geometry,custom.geometry);
 store.undo();assert.deepEqual(store.getProject(),initial);store.redo();assert.deepEqual(store.getProject().geometry,custom.geometry);
 store.undo();store.mutate(p=>p.furniture[0].rot=33.3);assert.equal(store.canRedo,false);assert.equal(store.redo(),false);
});
test('subscriptions can be removed; failed mutations roll back; render reads do not alter timestamps',()=>{
 const store=createProjectStore(defaultState());let count=0;const off=store.subscribe(()=>count++);off();
 const before=structuredClone(store.getProject());assert.throws(()=>store.mutate(p=>{p.name='wrong';throw Error('fail')}));assert.deepEqual(store.getProject(),before);
 store.mutate(p=>p.name='ok');assert.equal(count,0);const time=store.getProject().updatedAt;store.getProject();assert.equal(store.getProject().updatedAt,time);
 store.dispose();
});
test('stored 3D mode survives pending engine initialization and layer changes',()=>{
 const initial=defaultState();initial.view.mode='3d';const store=createProjectStore(initial);
 store.setView({layers:{...initial.view.layers,grid:true}});assert.equal(store.getProject().view.mode,'3d');
});
