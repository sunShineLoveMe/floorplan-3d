import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStorage,STORE,LEGACY_STORE} from '../src/services/storage.js';
import {importProject,prepareImport,readProject,serializeProject} from '../src/services/project-files.js';
import {defaultState} from '../src/data/default-project.js';
const memory=initial=>{const map=new Map(Object.entries(initial||{}));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('file rejection and legacy cancellation leave memory and saved data unchanged',()=>{
 const initial=defaultState(),adapter=memory({[STORE]:serializeProject(initial)});let current=initial,backups=[];
 const callbacks={confirmLegacy:()=>false,backup:r=>backups.push(r),replace:p=>{current=p;adapter.setItem(STORE,serializeProject(p));}};
 const legacy=JSON.stringify({furniture:initial.furniture,rooms:initial.rooms,demolished:[],measures:[]});
 assert.equal(prepareImport(legacy).status,'confirmation-required');assert.equal(importProject(legacy,callbacks).status,'cancelled');
 for(const raw of ['{',JSON.stringify({...initial,version:999})])assert.throws(()=>importProject(raw,callbacks));
 assert.equal(current,initial);assert.equal(adapter.getItem(STORE),serializeProject(initial));assert.deepEqual(backups,[]);
});
test('legacy backup happens before replacement and failed backup prevents replacement',()=>{
 const p=defaultState(),raw=JSON.stringify({furniture:p.furniture,rooms:p.rooms,demolished:[],measures:[]});const calls=[];
 importProject(raw,{confirmLegacy:()=>true,backup:r=>{assert.equal(r,raw);calls.push('backup')},replace:()=>calls.push('replace')});assert.deepEqual(calls,['backup','replace']);
 assert.throws(()=>importProject(raw,{confirmLegacy:()=>true,backup:()=>{throw Error('disk')},replace:()=>assert.fail('must not replace')}));
});
test('unreadable storage is backed up before overwrite, and legacy key is untouched',()=>{
 const adapter=memory({[STORE]:'broken',[LEGACY_STORE]:'old'}),service=createStorage(adapter,readProject,{now:()=>123});
 assert.equal(service.load().ok,false);assert.equal(service.save(defaultState()).ok,true);assert.equal(adapter.getItem(STORE+'-recovery-123'),'broken');assert.equal(adapter.getItem(LEGACY_STORE),'old');
});
test('backup failure blocks overwrite; quota failure is returned without false success',()=>{
 const adapter=memory({[STORE]:'broken'}),service=createStorage(adapter,readProject);service.load();
 adapter.setItem=()=>{throw Error('quota')};const result=service.save(defaultState());assert.equal(result.ok,false);assert.equal(adapter.getItem(STORE),'broken');
 const valid=memory({[STORE]:serializeProject(defaultState())}),saved=valid.getItem(STORE),s=createStorage(valid,readProject);s.load();valid.setItem=()=>{throw Error('quota')};assert.equal(s.save(defaultState()).ok,false);assert.equal(valid.getItem(STORE),saved);
});
test('existing recovery keys are not overwritten and serialization preserves decimals',()=>{
 const adapter=memory({[STORE]:'bad',[STORE+'-recovery-1']:'earlier'}),s=createStorage(adapter,readProject,{now:()=>1});s.load();assert.equal(s.save(defaultState()).ok,true);assert.equal(adapter.getItem(STORE+'-recovery-1'),'earlier');assert.equal(adapter.getItem(STORE+'-recovery-1-1'),'bad');
 const p=defaultState();p.furniture[0].w=1234.56;assert.deepEqual(readProject(serializeProject(p)).project,p);
});
