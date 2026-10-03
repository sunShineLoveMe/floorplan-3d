/** Native Three.js measurement of production meshes, in the item's rotated frame. */
export async function auditFurnitureMeshes(items){
 const THREE=await import('three');
 const {createFurnitureFactory}=await import('/src/viewer3d/furniture.js');
 const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,...options});
 const factory=createFurnitureFactory({mat,wx:v=>v/1000,wz:v=>v/1000,glassMat:mat('#eeeeee',{transparent:true,opacity:.3}),frameMat:mat('#888888')});
 return items.map(f=>{
  const g=factory.buildFurniture(f);g.updateMatrixWorld(true);
  const frame=new THREE.Matrix4().compose(new THREE.Vector3(f.cx/1000,0,f.cy/1000),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-f.rot*Math.PI/180,0)),new THREE.Vector3(1,1,1)).invert();
  const bounds=new THREE.Box3(),world=new THREE.Box3();let nonFinite=0,negativeParameters=0,vertices=0,outside=0,meshes=0;
  const point=new THREE.Vector3();
  g.traverse(o=>{if(!o.isMesh||!o.visible)return;meshes++;
   for(const key of ['width','height','depth','radius','radiusTop','radiusBottom'])if(o.geometry.parameters?.[key]<0)negativeParameters++;
   const p=o.geometry.attributes.position;
   for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);world.expandByPoint(point);point.applyMatrix4(frame);
    if(!point.toArray().every(Number.isFinite))nonFinite++;
    bounds.expandByPoint(point);vertices++;
    if(Math.abs(point.x)>f.w/2000+1e-8||Math.abs(point.z)>f.d/2000+1e-8)outside++;
   }
  });
  const result={input:f,min:bounds.min.toArray().map(v=>v*1000),max:bounds.max.toArray().map(v=>v*1000),size:bounds.getSize(new THREE.Vector3()).toArray().map(v=>v*1000),worldMin:world.min.toArray(),worldMax:world.max.toArray(),outside,nonFinite,negativeParameters,vertices,meshes};
  g.traverse(o=>{o.geometry?.dispose();});return result;
 });
}
