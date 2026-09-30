export function clearGroup(group){
  const geometries=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.element)o.element.remove();});
  geometries.forEach(g=>g.dispose());group.clear();
}
