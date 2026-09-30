import {clone} from '../data/project-data.js';

/** Owns only serializable project data. Views keep their own runtime resources. */
export function createProjectStore(initial, {now = () => new Date().toISOString(), limit = 150} = {}) {
  let project = clone(initial), transaction = null;
  const past = [], future = [], listeners = new Set();
  const snapshot = () => JSON.stringify(project);
  const notify = reason => listeners.forEach(fn => fn({project, reason}));
  function begin() {
    if (transaction !== null) throw new Error('A project transaction is already active');
    transaction = snapshot();
    return transaction;
  }
  function commit(before = transaction) {
    if (before === null) return false;
    transaction = null;
    if (before === snapshot()) return false;
    past.push(before); if (past.length > limit) past.shift(); future.length = 0;
    project.updatedAt = now(); notify('commit'); return true;
  }
  function cancel() {
    if (transaction === null) return false;
    project = JSON.parse(transaction); transaction = null; notify('cancel'); return true;
  }
  function mutate(fn) {
    cancel(); begin();
    try { fn(project); return commit(); } catch (error) { cancel(); throw error; }
  }
  function replaceProject(next) {
    cancel(); begin(); project = clone(next); return commit();
  }
  function travel(from, to, reason) {
    cancel(); if (!from.length) return false;
    to.push(snapshot()); project = JSON.parse(from.pop()); notify(reason); return true;
  }
  return {
    getProject: () => project,
    get canUndo() { return past.length > 0; }, get canRedo() { return future.length > 0; },
    get inTransaction() { return transaction !== null; },
    begin, commit, cancel, mutate, replaceProject,
    preview(fn) { if (transaction === null) throw new Error('Preview requires a transaction'); fn(project); },
    undo: () => travel(past, future, 'undo'), redo: () => travel(future, past, 'redo'),
    setView(patch) {
      const before = JSON.stringify(project.view);
      Object.assign(project.view, clone(patch));
      if (before !== JSON.stringify(project.view)) { project.updatedAt = now(); notify('preferences'); }
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dispose() { listeners.clear(); transaction = null; }
  };
}
