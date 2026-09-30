export const STORE = 'floorplan-project-v1', LEGACY_STORE = 'huxing-design-v1';
export function createStorage(storage, parse, {now = () => Date.now()} = {}) {
  let recoveryRequired = false;
  return {
    load() {
      try {
        const raw = storage.getItem(STORE);
        if (raw !== null) {
          try { return {ok:true, project:parse(raw).project}; }
          catch (error) { recoveryRequired = true; return {ok:false, error}; }
        }
        return {ok:true, project:null, legacy:storage.getItem(LEGACY_STORE)};
      } catch (error) { recoveryRequired = true; return {ok:false, error}; }
    },
    save(project) {
      try {
        const raw = JSON.stringify(project);
        if (recoveryRequired) {
          const previous = storage.getItem(STORE);
          if (previous !== null) {
            let key = STORE + '-recovery-' + now(), suffix = 0;
            while (storage.getItem(key) !== null) key = STORE + '-recovery-' + now() + '-' + (++suffix);
            storage.setItem(key, previous);
          }
          recoveryRequired = false;
        }
        storage.setItem(STORE, raw);
        return {ok:true};
      } catch (error) { return {ok:false, error}; }
    }
  };
}
