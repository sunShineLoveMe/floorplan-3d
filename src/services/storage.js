export const STORE = 'floorplan-project-v2', V1_STORE = 'floorplan-project-v1', LEGACY_STORE = 'huxing-design-v1';
/** Compare against the bytes this page loaded or last wrote before every save. */
export function createStorage(storage, parse, {now = () => Date.now()} = {}) {
  let expected = null, recovery = null;
  const read = () => storage.getItem(STORE);
  function backup(key, raw){
    const base=key+'-recovery-'+now();let target=base,suffix=0;
    while(storage.getItem(target)!==null)target=base+'-'+(++suffix);
    storage.setItem(target,raw);return target;
  }
  const service = {
    load() {
      recovery=null;
      let key=STORE,raw;
      try {
        expected=read();raw=expected;
        if(raw!==null)return {ok:true,project:parse(raw).project,source:STORE,persisted:true};
        key=V1_STORE;raw=storage.getItem(key);
        if(raw!==null){
          const project=parse(raw).project,result=service.save(project);
          return {ok:true,project,source:key,migrated:true,persisted:result.ok,...(!result.ok?{migrationError:result.error}:{})};
        }
        key=LEGACY_STORE;raw=storage.getItem(key);
        if(raw!==null)recovery={key,raw};
        return {ok:true,project:null,legacy:raw,source:raw!==null?key:null,persisted:false};
      } catch (error) {
        if(raw!==undefined&&raw!==null)recovery={key,raw};
        return {ok:false,error,source:key,persisted:false};
      }
    },
    get recovery(){return recovery;},
    external(){
      try {const raw=read();return {ok:true,raw,changed:raw!==expected};}
      catch(error){return {ok:false,error};}
    },
    archives(){
      const entries=[];
      try {for(let i=0;i<storage.length;i++){const key=storage.key(i);if([STORE,V1_STORE,LEGACY_STORE].some(prefix=>key.startsWith(prefix+'-recovery-')))entries.push({key,raw:storage.getItem(key)});}}
      catch(error){return {ok:false,error,entries};}
      return {ok:true,entries};
    },
    save(project, options={}) {
      try {
        const raw=JSON.stringify(parse(JSON.stringify(project)).project),current=read();
        const comparison=Object.hasOwn(options,'overwriteRaw')?options.overwriteRaw:expected;
        if(current!==comparison)return {ok:false,code:'conflict'};
        if(recovery&&!options.recover)return {ok:false,code:'recovery-required'};
        // Undo may return to the exact persisted revision while writes are denied.
        if(raw===current&&!recovery)return {ok:true,raw,backups:[]};
        const backups=[];
        if(recovery){
          if(storage.getItem(recovery.key)!==recovery.raw&&!Object.hasOwn(options,'overwriteRaw'))return {ok:false,code:'conflict'};
          backups.push(backup(recovery.key,recovery.raw));
        }
        if(current!==expected&&current!==null&&current!==recovery?.raw)backups.push(backup(STORE,current));
        // Backup writes may fail, or another page may write during this operation.
        if(read()!==comparison)return {ok:false,code:'conflict'};
        storage.setItem(STORE,raw);expected=raw;recovery=null;
        return {ok:true,raw,backups};
      } catch (error) { return {ok:false,code:'storage-error',error}; }
    }
  };
  return service;
}
