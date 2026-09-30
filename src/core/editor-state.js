export function createEditorState(store) {
  return {tool:'select', sel:null, mA:null, mCur:null,
    get layers() { return store.getProject().view.layers; }
  };
}
