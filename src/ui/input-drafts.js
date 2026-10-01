/** Preserve only the current object's inputs; never apply drafts to a new object. */
export function captureInputs(root){
  const active=document.activeElement;
  return [...root.querySelectorAll('input')].filter(input=>input.id).map(input=>({
    id:input.id,value:input.value,dirty:input.value!==input.defaultValue,
    focused:input===active,start:input.selectionStart,end:input.selectionEnd
  }));
}
export function restoreInputs(root,drafts,canRestore){
  for(const draft of drafts){
    const input=root.querySelector('#'+draft.id);if(!input||!canRestore(draft.id))continue;
    if(draft.dirty){input.value=draft.value;input.dispatchEvent(new Event('input'));}
    if(draft.focused){input.focus({preventScroll:true});if(draft.start!==null)input.setSelectionRange(draft.start,draft.end);}
  }
}
