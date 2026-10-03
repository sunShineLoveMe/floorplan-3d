import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStorage,STORE,V1_STORE,LEGACY_STORE} from '../src/services/storage.js';
import {createProjectStore} from '../src/core/project-store.js';
import {starterState} from '../src/data/default-project.js';
import {readProject,serializeProject} from '../src/services/project-files.js';
const adapter=initial=>{const map=new Map(Object.entries(initial||{}));return {map,get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('persisted load has an exact source; initial and failed migration are not reported persisted',()=>{
 const raw=serializeProject(starterState()),a=adapter({[STORE]:raw}),s=createStorage(a,readProject);
 assert.deepEqual(s.load(),{ok:true,project:readProject(raw).project,source:STORE,persisted:true});
 assert.equal(createStorage(adapter(),readProject).load().persisted,false);
 a.map.delete(STORE);a.map.set(V1_STORE,raw);a.setItem=()=>{throw Error('quota');};const loaded=s.load();assert.equal(loaded.source,V1_STORE);assert.equal(loaded.persisted,false);assert.match(loaded.migrationError.message,/quota/);
});
test('corrupt high-priority source requires explicit recovery; backup failure blocks every write',()=>{
 const a=adapter({[STORE]:'broken',[V1_STORE]:serializeProject(starterState())}),s=createStorage(a,readProject);assert.equal(s.load().ok,false);
 assert.equal(s.save(starterState()).code,'recovery-required');assert.equal(a.map.size,2);
 const write=a.setItem;a.setItem=(key,value)=>{if(key.includes('recovery'))throw Error('quota');write(key,value);};
 assert.equal(s.save(starterState(),{recover:true}).ok,false);assert.equal(a.getItem(STORE),'broken');assert.equal(s.recovery.raw,'broken');
 a.setItem=write;assert.equal(s.save(starterState(),{recover:true}).ok,true);assert.equal(s.recovery,null);assert.equal(s.archives().entries[0].raw,'broken');
});
test('a corrupt v1 is preserved under its own recovery key before a v2 is created',()=>{
 const a=adapter({[V1_STORE]:'broken v1',[LEGACY_STORE]:'broken legacy'}),s=createStorage(a,readProject,{now:()=>1});s.load();
 assert.equal(s.recovery.key,V1_STORE);assert.equal(s.save(starterState()).code,'recovery-required');assert.equal(s.save(starterState(),{recover:true}).ok,true);
 assert.equal(a.getItem(V1_STORE),'broken v1');assert.equal(a.getItem(V1_STORE+'-recovery-1'),'broken v1');assert.equal(a.getItem(LEGACY_STORE),'broken legacy');
});
test('stale pages and deletion cannot silently overwrite; explicit overwrite archives the other bytes',()=>{
 const a=adapter(),one=createStorage(a,readProject,{now:()=>1}),two=createStorage(a,readProject);one.load();two.load();const first=starterState(),second=starterState();
 assert.equal(one.save(first).ok,true);const other=a.getItem(STORE);assert.equal(two.save(second).code,'conflict');assert.equal(a.getItem(STORE),other);
 assert.equal(two.save(second,{overwriteRaw:other}).ok,true);assert.equal(a.getItem(STORE+'-recovery-1')??two.archives().entries[0].raw,other);
 a.map.delete(STORE);assert.equal(two.save(second).code,'conflict');assert.equal(two.save(second,{overwriteRaw:null}).ok,true);
});
test('a third write during conflict backup blocks overwrite and preserves the newer bytes',()=>{
 const a=adapter(),s=createStorage(a,readProject);s.load();a.map.set(STORE,'other');const write=a.setItem;
 a.setItem=(k,v)=>{write(k,v);if(k.includes('recovery'))a.map.set(STORE,'newer');};assert.equal(s.save(starterState(),{overwriteRaw:'other'}).code,'conflict');assert.equal(a.getItem(STORE),'newer');
});
test('main save failure after recovery copy keeps source, allows retry and never deletes prior copies',()=>{
 const a=adapter({[STORE]:'broken'}),s=createStorage(a,readProject,{now:()=>1});s.load();const write=a.setItem;
 a.setItem=(k,v)=>{if(k===STORE)throw Error('quota');write(k,v);};assert.equal(s.save(starterState(),{recover:true}).ok,false);assert.equal(a.getItem(STORE),'broken');assert.equal(s.recovery.raw,'broken');assert.equal(a.getItem(STORE+'-recovery-1'),'broken');
 a.setItem=write;assert.equal(s.save(starterState(),{recover:true}).ok,true);assert.equal(s.archives().entries.length,2);
});
test('preference persistence during a drag excludes preview and cancellation preserves saved preferences',()=>{
 const store=createProjectStore(starterState()),before=structuredClone(store.getProject());store.begin();store.preview(p=>p.name='temporary drag');store.setView({mode:'3d'});
 const committed=store.getCommittedProject();assert.equal(committed.name,before.name);assert.equal(committed.view.mode,'3d');store.cancel();assert.deepEqual(store.getProject(),committed);
 store.begin();store.preview(p=>p.name='committed edit');store.commit();assert.equal(store.getCommittedProject().name,'committed edit');store.undo();assert.deepEqual(store.getProject(),committed);
});

test('reading another version retains its timestamp and does not trigger a write conflict in the writer',()=>{
 const initial=starterState(),store=createProjectStore(initial),next=starterState();next.updatedAt='2026-01-01T00:00:00.000Z';store.replaceProject(next,{touch:false});assert.deepEqual(store.getProject(),next);store.undo();assert.deepEqual(store.getProject(),initial);
});
test('explicit conflict overwrite after damaged-source recovery archives both captured original and current other version',()=>{
 const a=adapter({[STORE]:'damaged'}),s=createStorage(a,readProject,{now:()=>1});s.load();const other=serializeProject(starterState());a.map.set(STORE,other);assert.equal(s.save(starterState()).code,'conflict');assert.equal(s.save(starterState(),{overwriteRaw:other,recover:true}).ok,true);assert.deepEqual(s.archives().entries.map(e=>e.raw),['damaged',other]);
});

test('exact already persisted revision remains saved without a redundant blocked write',()=>{
 const p=starterState(),a=adapter(),s=createStorage(a,readProject);s.load();s.save(p);const persisted=a.getItem(STORE);a.setItem=()=>{throw Error('quota');};assert.equal(s.save(p).ok,true);assert.equal(a.getItem(STORE),persisted);p.name='changed';assert.equal(s.save(p).ok,false);assert.equal(a.getItem(STORE),persisted);
});
