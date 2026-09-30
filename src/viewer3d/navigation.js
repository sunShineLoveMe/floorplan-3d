import * as THREE from 'three';
export function createNavigation({view,space,size,getCamera,getOrbit,getHeight}){
const {wx,wz}=space;
const ease = t => t < .5 ? 4*t*t*t : 1 - (-2*t + 2)**3/2;
const clamp01 = t => Math.max(0, Math.min(1, t));
const pose = (t, p) => ({t, p});
// 与当前 2D 视口完全重合的正俯视位姿：透视相机在该高度下，地面可视高度 = 2D 视口高度
function planPose(){
  const cx = view.x0 + size.width()/2/view.s, cy = view.y0 + size.height()/2/view.s, visH = size.height()/view.s/1000;
  const dist = visH / 2 / Math.tan(45/2*Math.PI/180), t = new THREE.Vector3(wx(cx), 0, wz(cy));
  return pose(t, new THREE.Vector3(t.x, dist, t.z + 1e-4));
}
function isoFrom(P){
  const d = Math.max(P.p.y, getHeight()*3.8, 5), dir = new THREE.Vector3(.3, .82, .49).normalize();
  return pose(P.t.clone(), P.t.clone().addScaledVector(dir, d));
}
const isoWhole = () => isoFrom(planPose());
const topWhole = () => planPose();
const curPose = () => pose(getOrbit().target.clone(), getCamera().position.clone());
// 以目标点为中心做球坐标插值：镜头沿弧线倾斜环绕，而不是直线穿越
function camTween(A, B, e){
  const t = A.t.clone().lerp(B.t, e);
  const sa = new THREE.Spherical().setFromVector3(A.p.clone().sub(A.t)), sb = new THREE.Spherical().setFromVector3(B.p.clone().sub(B.t));
  let dth = sb.theta - sa.theta; dth = Math.atan2(Math.sin(dth), Math.cos(dth));
  const s = new THREE.Spherical(sa.radius + (sb.radius - sa.radius)*e, sa.phi + (sb.phi - sa.phi)*e, sa.theta + dth*e);
  getCamera().position.copy(t).add(new THREE.Vector3().setFromSpherical(s)); getCamera().lookAt(t); getOrbit().target.copy(t);
}
function setPose(P){ getCamera().position.copy(P.p); getOrbit().target.copy(P.t); getCamera().lookAt(P.t); }

return {ease,clamp01,pose,planPose,isoFrom,isoWhole,topWhole,curPose,camTween,setPose};
}
