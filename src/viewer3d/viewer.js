import {passageSpace,nearestStandingPoint,pointInPolygon,segmentDistance,sweptCircleIntersectsPolygon} from '../core/spatial-clearance.js';
import {formatAreaM2,formatLengthMm} from '../core/units.js';
import {circleIntersectsPolygon} from '../core/polygons.js';
import {$} from '../ui/dom.js';
import {createNavigation} from './navigation.js';
import {createMaterials} from './materials.js';
import {createFurnitureFactory} from './furniture.js';
import {createArchitecture} from './architecture.js';
import {clearGroup} from './resources.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CSS2DRenderer,CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import {COARSE,TAP,esc,blocksModelShortcuts} from '../ui/dom.js';
import {tr,nm} from '../ui/i18n.js';
import {roomArea} from '../core/geometry.js';
import {rasterSize} from '../services/output-layout.js';
import {createScope} from '../ui/lifecycle.js';
export function createViewer3D({store,ui,view,actions,snapMove,closeDrawers,onChange,onFailure}){
const scope=createScope(),exportUrls=new Set();
const {getF,select}=actions; const snap=()=>store.begin(),commit=()=>store.commit();
const stage = $('#stage'), host = $('#view3d');
let [OX, OY] = store.getProject().geometry.origin, H = store.getProject().geometry.height/1000;
const FOV = 45;       // 原点与层高由当前项目提供
const wx = x => (x - OX) / 1000, wz = y => (y - OY) / 1000, M = v => v / 1000;
const SW = () => stage.clientWidth, SH = () => stage.clientHeight;
const opt = {cut:H, furn:true, labels:true, night:false, hour:10, mode:'orbit'};

let inited = false, active = false, raf = 0, anim = null, fly = null;
let cancelGesture=()=>{};
const modalOpen=()=>!!document.querySelector('dialog[open]');
let renderer, labelRenderer, scene, camera, orbit, walkCtl, hemi, sun, ground, glassMat, wallMat, capMat, frameMat;
let walkSpace,walkSignature,positionStamp=0;
let archFloor, archUp, furnG, labelG, lampG, colliders = [], selKey = null, selHelper = null;
let sigArch = '', sigFurn = '', sigLabels = '', grow = 1, furnGrow = 1;
const doors = [], keys = {};
const materials=createMaterials(()=>renderer),{mat,floorMat}=materials;
glassMat = new THREE.MeshPhysicalMaterial({color:0xcfe6ef, roughness:.05, transparent:true, opacity:.28, depthWrite:false, side:THREE.DoubleSide});
let primitives,buildFurniture;
const edgeMat=new THREE.LineBasicMaterial({color:0x6f675b}),skirtMat=new THREE.MeshStandardMaterial({color:'#8b7f6e',roughness:.6});
let environmentTarget;
function buildArch(){
  colliders.length=0;
  createArchitecture({store,opt,space:{wx,wz},groups:{archFloor,archUp,lampG,doors,colliders},materials:{mat,floorMat,wallMat,capMat,glassMat,frameMat,edgeMat,skirtMat},primitives}).build();
  applyLight();applyGrow();
}


/* ======================= 初始化 ======================= */
function init(){
  if (inited) return;
  try{renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});}
  catch(cause){throw Object.assign(new Error('WebGL initialization failed',{cause}),{kind:'webgl'});}
  scope.on(renderer.domElement,'webglcontextlost',e=>{e.preventDefault();onFailure(Object.assign(new Error('WebGL context lost'),{kind:'context'}));});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(SW(), SH());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.prepend(renderer.domElement);
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(SW(), SH());
  Object.assign(labelRenderer.domElement.style, {position:'absolute', inset:'0', pointerEvents:'none'});
  host.appendChild(labelRenderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, SW()/SH(), .05, 300);
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI*.495; orbit.minDistance = 1.5; orbit.maxDistance = 45;
  walkCtl = new PointerLockControls(camera, document.body);
  scope.on(walkCtl, 'lock', () => { if(scope.disposed || !active || opt.mode!=='walk'){walkCtl.unlock();return;} $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'block'; });
  scope.on(walkCtl, 'unlock', () => { if (opt.mode === 'walk'){ $('#walkOverlay').style.display = 'flex'; $('#cross').style.display = 'none'; } });

  hemi = new THREE.HemisphereLight(0xfff8ee, 0xb9a88f, 1.1);
  sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.setScalar(COARSE ? 2048 : 4096);   // 平板 GPU 用小一点的阴影贴图
  Object.assign(sun.shadow.camera, {left:-11, right:11, top:11, bottom:-11, near:1, far:60});
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({color:0xf2eee7, roughness:1}));
  ground.rotation.x = -Math.PI/2; ground.position.y = -0.015; ground.receiveShadow = true;
  scene.add(hemi, sun, sun.target, ground);

  const pm = new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment(); environmentTarget=pm.fromScene(environment,.04); materials.setEnvironment(environmentTarget.texture); environment.dispose(); pm.dispose();
  wallMat = mat('#f4f1eb', {roughness:.92}); capMat = mat('#34312d', {roughness:.9}); frameMat = mat('#5d6166', {roughness:.5, metalness:.4});
  primitives=createFurnitureFactory({mat,wx,wz,glassMat,frameMat});({buildFurniture}=primitives);

  archFloor = new THREE.Group(); archUp = new THREE.Group(); furnG = new THREE.Group(); labelG = new THREE.Group(); lampG = new THREE.Group();
  scene.add(archFloor, archUp, furnG, labelG, lampG);

  const cv = renderer.domElement; let downAt = null, look = null;
  scope.on(cv, 'pointerdown', e => {
    if(!active || anim || !stage.classList.contains('is3d') || modalOpen()) return;
    downAt = [e.clientX, e.clientY]; closeDrawers();
    if (touchWalk && !look){ look = {id:e.pointerId, x:e.clientX, y:e.clientY}; cv.setPointerCapture(e.pointerId); }
  });
  scope.on(cv, 'pointermove', e => {
    if (!look || e.pointerId !== look.id) return;
    lookBy(e.clientX - look.x, e.clientY - look.y); look.x = e.clientX; look.y = e.clientY;
  });
  scope.on(cv, 'pointercancel', e => { downAt=null; if (look?.id === e.pointerId) look = null; });

  // 按住已选中的家具拖动：沿地面摆放（与 2D 共用网格和贴墙吸附）。
  // 在父元素上用捕获阶段监听，赶在 OrbitControls 之前关掉它，避免同时旋转镜头
  let fdrag = null;
  scope.on(host, 'pointerdown', e => {
    if(fdrag && e.pointerId!==fdrag.pid){cancelGesture();return;}
    if (modalOpen() || e.target !== cv || e.button!==0 || !e.isPrimary || anim || opt.mode !== 'orbit' || ui.sel?.kind !== 'furn') return;
    const h = pick(e), f = h?.fid === ui.sel.id && getF(h.fid), g = f && groundAt(e.clientX, e.clientY);
    if (!g) return;
    fdrag = {id:f.id, pid:e.pointerId, sx:e.clientX, sy:e.clientY, ox:g.x - f.cx, oy:g.y - f.cy, before:snap(), moved:false};
    orbit.enabled = false; fly = null; cv.setPointerCapture(e.pointerId);
  }, true);
  scope.on(cv, 'pointermove', e => {
    if (!fdrag || e.pointerId !== fdrag.pid) return;
    if (!fdrag.moved && Math.hypot(e.clientX - fdrag.sx, e.clientY - fdrag.sy) < TAP) return;
    const f = getF(fdrag.id), g = groundAt(e.clientX, e.clientY); if (!f || !g) return;
    fdrag.moved = true; cv.style.cursor = 'grabbing';
    store.preview(()=>{[f.cx, f.cy] = snapMove(f, g.x - fdrag.ox, g.y - fdrag.oy);});
    furnG.children.find(o => o.userData.fid === f.id)?.position.set(wx(f.cx), 0, wz(f.cy));   // 拖动中只挪模型，松手再整体同步
  });
  const endF = e => {
    if (!fdrag || e.pointerId !== fdrag.pid) return;
    const d = fdrag; fdrag = null; orbit.enabled = opt.mode==='orbit'; cv.style.cursor = '';
    if(cv.hasPointerCapture(d.pid)) cv.releasePointerCapture(d.pid);
    if (e.type !== 'pointerup'){store.cancel();buildFurn();} else commit(d.before);
  };
  scope.on(cv, 'pointerup', endF); scope.on(cv, 'pointercancel', endF);
  scope.on(cv, 'lostpointercapture', endF);
  cancelGesture=()=>{
    if(fdrag) endF({pointerId:fdrag.pid,type:'pointercancel'});
    downAt=null;
    if(look && cv.hasPointerCapture(look.id)) cv.releasePointerCapture(look.id);
    look=null;joy.x=joy.y=0;joy.id=null;$('#joy i').style.transform='';
    for(const key of Object.keys(keys)) delete keys[key];
  };
  scope.on(window,'blur',cancelGesture);
  scope.on(window,'keydown',e=>{if(e.key==='Escape' && fdrag && !modalOpen()){e.preventDefault();e.stopImmediatePropagation();endF({pointerId:fdrag.pid,type:'pointercancel'});}},true);

  scope.on(cv, 'pointerup', e => {
    const tap = downAt && Math.hypot(e.clientX-downAt[0], e.clientY-downAt[1]) <= TAP;
    if (look?.id === e.pointerId){
      look = null;
      if (tap){ const h = pick(e); if (h?.door && h.dist < 3.5) h.door.open = !h.door.open; }   // 漫游时点门开关
      return;
    }
    if (!active || !stage.classList.contains('is3d') || anim || opt.mode !== 'orbit' || !tap) return;
    const h = pick(e);
    if (h?.door) h.door.open = !h.door.open;
    else if (h?.fid) select({kind:'furn', id:h.fid});
    else if (h?.room) select({kind:'room', id:h.room});
    else select(null);
  });
  scope.observe(stage, () => {
    renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH());
    camera.aspect = SW()/SH(); camera.updateProjectionMatrix();
  });
  bindUI(); inited=true;
}

/* ======================= 材质 ======================= */
/* ======================= 几何小工具（y = 底面高度） ======================= */
/* ======================= 建筑 ======================= */

function buildFurn(){
  if(selHelper){scene.remove(selHelper);selHelper.geometry.dispose();selHelper.material.dispose();selHelper=null;}
  clearGroup(furnG);
  store.getProject().furniture.forEach(f => furnG.add(buildFurniture(f)));
  furnG.visible = opt.furn; selKey = null; applyGrow();
}

function buildLabels(){
  labelG.children.slice().forEach(o => { o.element.remove(); labelG.remove(o); });
  store.getProject().geometry.rooms.filter(r => r.at&&!store.getProject().rooms[r.id].labelHidden).forEach(r => {
    const el = document.createElement('div'); el.className = 'rlabel'; el.dataset.roomId=r.id;
    el.innerHTML = `${esc(nm(store.getProject().rooms[r.id].name))}<small>${formatAreaM2(roomArea(r),store.getProject().units.display)}</small>`;
    const o = new CSS2DObject(el); o.position.set(wx(r.at[0]), opt.cut + .15, wz(r.at[1])); o.visible = labelG.visible; o.userData.roomId=r.id; o.userData.labelArea=roomArea(r); labelG.add(o);
  });

}

// 只重建变化的部分
function sync(force){
  if (!inited || (!active && !force)) return;
  const oldH=H, oldOrigin=[OX,OY]; [OX,OY]=store.getProject().geometry.origin; H=M(store.getProject().geometry.height);
  if(opt.cut===oldH) opt.cut=H; else opt.cut=Math.min(opt.cut,H);
  document.querySelector('[data-cut]').dataset.cut=String(H); syncCutBtns();
  const a = JSON.stringify([store.getProject().geometry,store.getProject().rooms, store.getProject().demolished, opt.cut]), f = JSON.stringify([store.getProject().geometry.origin,store.getProject().furniture]), l = JSON.stringify([store.getProject().geometry,store.getProject().rooms, opt.cut,store.getProject().units.display]);
  if (force || a !== sigArch){ sigArch = a; buildArch(); }
  if (force || f !== sigFurn){ sigFurn = f; buildFurn(); }
  if (force || l !== sigLabels){ sigLabels = l; buildLabels(); }
  const walkKey=JSON.stringify([store.getProject().geometry,store.getProject().furniture,store.getProject().demolished]);
  if(walkKey!==walkSignature){walkSignature=walkKey;walkSpace=passageSpace(store.getProject(),{includeDoors:false});}
  const moved=oldOrigin[0]!==OX || oldOrigin[1]!==OY || oldH!==H;
  if(moved && !anim){
    fly=null;
    if(opt.mode==='walk') setMode('walk'); else setPose(isoWhole());
  }
  const span=Math.max(...store.getProject().geometry.rooms.flatMap(r=>r.poly.map(([x,y])=>Math.max(Math.abs(wx(x)),Math.abs(wz(y))))),H);
  orbit.maxDistance=Math.max(45,span*6,planPose().p.y*3); camera.far=Math.max(300,orbit.maxDistance*2);camera.updateProjectionMatrix();
}

// CSS2DRenderer 只看标签自身的 visible，不继承父级，所以逐个设置
function showLabels(v){ labelG.visible = v; labelG.children.forEach(o => o.visible = v); }
// Projection changes with camera, viewport, names and units; keep readable labels in screen space.
function layoutLabels(){
  if(!labelG.visible)return;
  const viewport=host.getBoundingClientRect(),kept=[];
  const labels=[...labelG.children].sort((a,b)=>Number(ui.sel?.kind==='room'&&b.userData.roomId===ui.sel.id)-Number(ui.sel?.kind==='room'&&a.userData.roomId===ui.sel.id)||b.userData.labelArea-a.userData.labelArea);
  for(const label of labels){
    const el=label.element,r=el.getBoundingClientRect();
    const fits=label.visible&&el.style.display!=='none'&&r.width>0&&r.left>=viewport.left&&r.top>=viewport.top&&r.right<=viewport.right&&r.bottom<=viewport.bottom;
    const overlaps=kept.some(b=>r.left<b.right+4&&r.right>b.left-4&&r.top<b.bottom+4&&r.bottom>b.top-4);
    el.style.visibility=fits&&!overlaps?'visible':'hidden';
    if(fits&&!overlaps)kept.push(r);
  }
}
function applyGrow(){
  if (!inited) return;
  archUp.scale.y = Math.max(grow, .001);
  furnG.scale.y = Math.max(furnGrow, .001);
  lampG.visible = grow > .99;
}

/* ======================= 日照 / 夜景 ======================= */
function applyLight(){
  const t = (opt.hour - 6) / 12, az = Math.PI * (.15 + t*.7), el = Math.sin(Math.PI*t) * 1.05 + .15, warm = 1 - Math.sin(Math.PI*t);
  sun.position.set(Math.cos(az)*18, Math.sin(el)*20 + 3, -Math.sin(az)*10 + 8); sun.target.position.set(0, 0, 0);
  sun.color.setHSL(.09, .5 + warm*.4, .92 - warm*.12);
  sun.intensity = opt.night ? .05 : 1.4 + Math.sin(Math.PI*t)*1.6;
  hemi.intensity = opt.night ? .12 : 1.1;
  scene.background = new THREE.Color(opt.night ? 0x1c2130 : 0xf7f4ee);
  ground.material.color.set(opt.night ? 0x2a2e38 : 0xf2eee7);
  lampG.children.forEach(o => { if (o.isPointLight) o.intensity = opt.night ? 6 : 0; else o.material.emissiveIntensity = opt.night ? 2 : .3; });
  renderer.toneMappingExposure = opt.night ? 1.25 : 1.05;
  materials.setNight(opt.night);
  const h = Math.floor(opt.hour), m = Math.round((opt.hour - h)*60);
  $('#sunT').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

/* ======================= 相机位姿 / 动画 ======================= */
const {ease,clamp01,planPose,isoWhole,topWhole,fitPose,curPose,camTween,setPose}=createNavigation({view,space:{wx,wz},size:{width:SW,height:SH},getCamera:()=>camera,getOrbit:()=>orbit,getHeight:()=>H,getProject:()=>store.getProject()});
function animate(dur, fn){ if(matchMedia('(prefers-reduced-motion:reduce)').matches)dur=1; return new Promise(res => { anim = {t0:performance.now(), dur, fn, res}; }); }
const wait = ms => scope.wait(matchMedia('(prefers-reduced-motion:reduce)').matches?0:ms);
function flyTo(B, dur = 900){ if(matchMedia('(prefers-reduced-motion:reduce)').matches)dur=1; fly = {t0:performance.now(), dur, A:curPose(), B}; }
function flyToRoom(id){
  if(store.getProject().geometry.rooms.some(r=>r.id===id))flyTo(fitPose(id));
}

/* ======================= 进入 / 退出 3D ======================= */
let remembered=null;
async function enter(){
  init(); active = true;
  renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH()); camera.aspect = SW()/SH(); camera.updateProjectionMatrix();
  sync(true);
  opt.mode = 'orbit'; syncModeBtns(); orbit.enabled = false; showLabels(false);
  const A=planPose(),B=remembered?.geometry===JSON.stringify(store.getProject().geometry)?remembered.pose:isoWhole();
  grow = 0; furnGrow = 0; applyGrow(); setPose(A);
  stage.classList.add('animating');
  startLoop(); renderer.render(scene, camera);
  stage.classList.add('is3d');                       // 交叉淡入：此刻 3D 画面与 2D 平面完全重合
  await wait(420); if(scope.disposed)return;
  await animate(1700, t => {
    camTween(A, B, ease(clamp01(t/.85)));
    grow = ease(clamp01((t - .1)/.55));
    furnGrow = ease(clamp01((t - .45)/.5));
    applyGrow();
  });
  if(scope.disposed)return; orbit.enabled = true; showLabels(opt.labels);
  stage.classList.remove('animating');
}
async function exit(){
  if(opt.mode==='orbit')remembered={geometry:JSON.stringify(store.getProject().geometry),pose:curPose()};
  cancelGesture();
  if (opt.mode === 'walk'){ walkCtl.unlock(); stopTouchWalk(); $('#hint3d').textContent = HINT_ORBIT(); $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'none';
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir); orbit.target.copy(camera.position).addScaledVector(dir, 3).setY(0); opt.mode = 'orbit'; syncModeBtns(); }
  fly = null; orbit.enabled = false; showLabels(false); stage.classList.add('animating');
  const A = curPose(), B = planPose();
  await animate(1300, t => {
    camTween(A, B, ease(clamp01((t - .1)/.9)));
    furnGrow = 1 - ease(clamp01(t/.45));
    grow = 1 - ease(clamp01((t - .2)/.6));
    applyGrow();
  });
  if(scope.disposed)return; stage.classList.remove('is3d');                    // 此刻 3D 已压平为正俯视，与 2D 重合后淡出
  await wait(450);
  if(scope.disposed)return; active = false; cancelAnimationFrame(raf); raf = 0;
  stage.classList.remove('animating');
  grow = furnGrow = 1; applyGrow();
}

/* ======================= 选择 / 拾取 ======================= */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function isPickable(object){
  if(object.isLine || object.isLineSegments)return false;
  for(let node=object;node;node=node.parent)if(!node.visible)return false;
  return true;
}
function pick(e){
  if (!e) ptr.set(0, 0);
  else { const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left)/r.width*2 - 1, -(e.clientY - r.top)/r.height*2 + 1); }
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects([...(opt.furn ? [furnG] : []), archUp, archFloor], true);
  for (const h of hits){
    let o = h.object;
    if(!isPickable(o))continue;
    if (o.material === glassMat) continue;
    if (o.userData.door) return {door:o.userData.door, dist:h.distance};
    if (o.userData.room) return {room:o.userData.room};
    while (o && !o.userData.fid && o !== scene) o = o.parent;
    if (o?.userData.fid) return {fid:o.userData.fid};
    return null;                                     // 被墙体挡住
  }
  return null;
}
// 屏幕点 → 地面（y = 0）上的户型坐标 mm；s = 该处每 mm 对应的屏幕像素，用于拖放时的幽灵图大小
const ground0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function groundAt(x, y){
  if (!active || anim) return null;
  const r = renderer.domElement.getBoundingClientRect(), hit = new THREE.Vector3();
  ptr.set((x - r.left)/r.width*2 - 1, -(y - r.top)/r.height*2 + 1);
  ray.setFromCamera(ptr, camera);
  if (!ray.ray.intersectPlane(ground0, hit) || hit.distanceTo(camera.position) > 60) return null;
  // 视线先碰到墙体（或飘窗台）时，落点取碰到的位置，而不是穿过墙落到看不见的墙后
  const wall = ray.intersectObjects([archUp, archFloor], true).find(h => h.object.material !== glassMat && isPickable(h.object));
  if (wall && wall.distance < hit.distanceTo(camera.position) - .01) hit.set(wall.point.x, 0, wall.point.z);
  const px = v => new THREE.Vector2(v.x*r.width/2, v.y*r.height/2), a = px(hit.clone().project(camera));
  const s = Math.max(a.distanceTo(px(hit.clone().add(new THREE.Vector3(1, 0, 0)).project(camera))),
                     a.distanceTo(px(hit.clone().add(new THREE.Vector3(0, 0, 1)).project(camera)))) / 1000;
  return {x:hit.x*1000 + OX, y:hit.z*1000 + OY, s};
}
function updateSel(){
  const key = ui.sel?.kind === 'furn' ? ui.sel.id : '';
  if (key !== selKey){
    selKey = key;
    if (selHelper){ scene.remove(selHelper); selHelper.geometry.dispose(); selHelper.material.dispose(); selHelper = null; }
    const g = key && furnG.children.find(g => g.userData.fid === key);
    if (g){ selHelper = new THREE.BoxHelper(g, 0xb5653a); scene.add(selHelper); }
  }
  if (selHelper) selHelper.update();
}

/* ======================= 漫游 ======================= */
// 触屏漫游：左下虚拟摇杆移动，在画面上拖动转向（iPad 不支持鼠标指针锁定）
const HINT_ORBIT = () => (COARSE ? tr('单指旋转 · 双指缩放 / 平移 · 点选家具后可拖动摆放 · 点门开关', '1 finger orbits · 2 fingers zoom / pan · select furniture to drag it · tap doors to open')
  : tr('左键旋转 · 右键平移 · 滚轮缩放 · 选中家具后拖动可摆放 · 点击门开关', 'Left-drag orbits · right-drag pans · scroll zooms · select furniture to drag it · click doors to open'))+' · '+tr('放大可显示更多房间标签','Zoom in to see more room labels');
const HINT_TOUCHWALK = () => tr('左下摇杆移动 · 拖动画面转向 · 点门开关', 'Joystick moves · drag to look · tap doors to open');
const HINT_WALK = () => tr('WASD 移动 · 鼠标转向 · Shift 快走 · E 开关门 · Esc 暂停', 'WASD moves · mouse looks · Shift runs · E opens doors · Esc pauses');
function syncHint3d(){ $('#hint3d').textContent = opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk ? HINT_TOUCHWALK() : HINT_WALK(); }
let touchWalk = false;
const joy = {x:0, y:0, id:null}, eul = new THREE.Euler(0, 0, 0, 'YXZ');
function lookBy(dx, dy){
  eul.setFromQuaternion(camera.quaternion);
  eul.y += dx * .005; eul.x = THREE.MathUtils.clamp(eul.x + dy * .005, -1.35, 1.35);
  camera.quaternion.setFromEuler(eul);
}
function startTouchWalk(){
  touchWalk = true;
  $('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block'; $('#walkExit').style.display = 'block';
  syncHint3d();
}
function stopTouchWalk(){
  touchWalk = false; joy.x = joy.y = 0; joy.id = null; $('#joy i').style.transform = '';
  $('#joy').style.display = 'none'; $('#walkExit').style.display = 'none';
}
function bindJoystick(){
  const el = $('#joy'), knob = $('#joy i'), R = 50;
  const upd = e => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
    const L = Math.hypot(dx, dy); if (L > R){ dx *= R/L; dy *= R/L; }
    joy.x = dx/R; joy.y = dy/R; knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  scope.on(el, 'pointerdown', e => { e.preventDefault(); joy.id = e.pointerId; el.setPointerCapture(e.pointerId); upd(e); });
  scope.on(el, 'pointermove', e => { if (e.pointerId === joy.id) upd(e); });
  const end = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  scope.on(el, 'pointerup', end); scope.on(el, 'pointercancel', end); scope.on(el, 'lostpointercapture', end);
}
function setMode(m){
  if (anim) return;
  cancelGesture();
  opt.mode = m; syncModeBtns();
  if (m === 'walk'){
    $('#walkStartStatus').textContent='';
    select(null);
    if (opt.cut < H){ opt.cut = H; syncCutBtns(); sync(); }
    orbit.enabled = false; fly = null;
    const start={...(store.getProject().geometry.walkStart || {position:store.getProject().geometry.origin,target:[store.getProject().geometry.origin[0]+1000,store.getProject().geometry.origin[1]]})};
    const project=store.getProject(),space=walkSpace||passageSpace(project,{includeDoors:false}),preferred=start.position;
    const rooms=[...project.geometry.rooms].sort((a,b)=>Number(pointInPolygon(preferred,b.poly))-Number(pointInPolygon(preferred,a.poly)));
    let standing=null;
    for(const room of rooms){standing=nearestStandingPoint(space,room,220,preferred,50,p=>!blocked(wx(p[0]),wz(p[1])));if(standing)break;}
    if(!standing){opt.mode='orbit';orbit.enabled=true;syncModeBtns();$('#hint3d').textContent=tr('未找到安全漫游起点，请调整家具或空间。','No clear walk start found. Adjust furniture or space.');return;}
    const moved=Math.hypot(standing[0]-preferred[0],standing[1]-preferred[1])>1;
    $('#walkStartStatus').textContent=(moved?tr('已选择避开家具的漫游起点：','Clear walk start selected: '):tr('漫游起点：','Walk start: '))+standing.map(n=>formatLengthMm(n,project.units.display)).join(', ');
    const eye=Math.min(1.6,H*.8);
    start.position=standing;
    camera.position.set(wx(start.position[0]), eye, wz(start.position[1])); camera.lookAt(wx(start.target[0]), eye*.94, wz(start.target[1]));
    updateWalkPosition();
    $('#walkOverlay').style.display = 'flex';
    syncHint3d();
  } else {
    walkCtl.unlock(); stopTouchWalk(); orbit.enabled = true;
    $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'none';$('#walkPositionStatus').textContent='';
    syncHint3d();
    orbit.target.set(0, 0, 0); flyTo(isoWhole());
  }
  showLabels(opt.labels && m === 'orbit');
  archUp.traverse(o => { if (o.userData.walkOnly) o.visible = m === 'walk'; });
}
function blocked(x, z, r = .22){
  if(walkSpace&&!walkSpace.free([x*1000+OX,z*1000+OY],r*1000))return true;
  for (const collider of colliders){
    if(collider.poly){if(circleIntersectsPolygon(x,z,r,collider.poly))return true;}
    else{const [x0,z0,x1,z1]=collider;if(x>x0-r&&x<x1+r&&z>z0-r&&z<z1+r)return true;}
  }
  for (const d of doors){
    const a = d.pivot.rotation.y, px = d.pivot.position.x, pz = d.pivot.position.z, ex = px + Math.cos(a)*d.length, ez = pz - Math.sin(a)*d.length;
    const t = clamp01(((x-px)*(ex-px) + (z-pz)*(ez-pz)) / ((ex-px)**2 + (ez-pz)**2));
    if (Math.hypot(x - (px + t*(ex-px)), z - (pz + t*(ez-pz))) < r+.02) return true;
  }
  return false;
}
function updateWalkPosition(){
 const status=$('#walkPositionStatus'),point=[camera.position.x*1000+OX,camera.position.z*1000+OY];
 status.dataset.position=JSON.stringify(point);status.textContent=tr('位置：','Position: ')+point.map(n=>formatLengthMm(n,store.getProject().units.display)).join(', ');
}
function canWalkSegment(a,b,r=.22){
 if(!walkSpace.swept(a.map((n,i)=>n*1000+(i?OY:OX)),b.map((n,i)=>n*1000+(i?OY:OX)),r*1000))return false;
 for(const collider of colliders){const poly=collider.poly||[[collider[0],collider[1]],[collider[2],collider[1]],[collider[2],collider[3]],[collider[0],collider[3]]];if(sweptCircleIntersectsPolygon(a,b,r,poly))return false;}
 for(const d of doors){const angle=d.pivot.rotation.y,h=[d.pivot.position.x,d.pivot.position.z],e=[h[0]+Math.cos(angle)*d.length,h[1]-Math.sin(angle)*d.length];if(segmentDistance(a,b,h,e)<r+.02)return false;}
 return true;
}
function stepWalk(dt){
  if (modalOpen() || (!walkCtl.isLocked && !touchWalk)) return;
  const sp = (keys.ShiftLeft || keys.ShiftRight ? 2.6 : 1.4) * dt, fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x), mv = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) mv.add(fwd); if (keys.KeyS || keys.ArrowDown) mv.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) mv.add(right); if (keys.KeyA || keys.ArrowLeft) mv.sub(right);
  if (touchWalk){ mv.addScaledVector(fwd, -joy.y).addScaledVector(right, joy.x); }
  const mag = Math.min(1, mv.length());        // 摇杆推得越远走得越快
  if (mag < .05) return;
  mv.normalize().multiplyScalar(sp * mag);
  const p = camera.position;
  if (canWalkSegment([p.x,p.z],[p.x+mv.x,p.z])) p.x += mv.x;
  if (canWalkSegment([p.x,p.z],[p.x,p.z+mv.z])) p.z += mv.z;
}
scope.on(window, 'keydown', e => {
  if (!active || modalOpen() || blocksModelShortcuts(e)) return;
  keys[e.code] = true;
  if(opt.mode==='walk' && e.code==='Escape'){walkCtl.unlock();if(touchWalk){stopTouchWalk();$('#walkOverlay').style.display='flex';}}
  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist < 2.5) h.door.open = !h.door.open; }
});
scope.on(window, 'keyup', e => keys[e.code] = false);

/* ======================= 工具栏 ======================= */
function syncModeBtns(){ stage.dataset.navigation=opt.mode; document.querySelectorAll('#modes3d .btn').forEach(b => {b.classList.toggle('on', b.dataset.mode === opt.mode);b.setAttribute('aria-pressed',String(b.dataset.mode===opt.mode));}); }
function syncCutBtns(){ document.querySelectorAll('[data-cut]').forEach(b => {b.classList.toggle('on', +b.dataset.cut === opt.cut);b.setAttribute('aria-pressed',String(+b.dataset.cut===opt.cut));}); }
function syncWalkTexts(){
  const t = COARSE
    ? [tr('点击开始，在房间内漫游', 'Tap to start inside the room'), tr('左下摇杆移动 · 在画面上拖动转向', 'Joystick moves · drag on screen to look'),
       tr('点门开关 · 点「退出漫游」回到鸟瞰', 'Tap doors to open · "Exit walk" returns to orbit')]
    : [tr('点击开始，在房间内漫游', 'Click to start inside the room'),
       tr('<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移动 · 鼠标转向 · <kbd>Shift</kbd> 快走', '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move · mouse looks · <kbd>Shift</kbd> runs'),
       tr('<kbd>E</kbd> 开关正前方的门 · <kbd>Esc</kbd> 暂停', '<kbd>E</kbd> opens the door ahead · <kbd>Esc</kbd> pauses')];
  t.forEach((h, i) => $('#wo' + (i + 1)).innerHTML = h);
  syncHint3d();
}
function bindUI(){
  document.querySelectorAll('#modes3d .btn').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  // 触屏设备用摇杆漫游；桌面端锁定鼠标，锁定失败时也退回到摇杆
  $('#walkOverlay').onclick = async () => {
    if(scope.disposed || !active || opt.mode!=='walk')return;
    if(COARSE){startTouchWalk();return;}
    try{
      // r160 controls do not return/catch the browser's asynchronous lock request.
      await document.body.requestPointerLock();
      if(scope.disposed || !active || opt.mode!=='walk') walkCtl.unlock();
    }catch{
      if(!scope.disposed && active && opt.mode==='walk'){
        $('#walkOverlay').style.display='flex';$('#cross').style.display='none';
        $('#hint3d').textContent=tr('未能锁定鼠标，请点击重试或返回鸟瞰。','Pointer lock unavailable. Click to retry or return to orbit.');
      }
    }
  };
  scope.on(document, 'pointerlockerror', () => { if (active && opt.mode === 'walk') startTouchWalk(); });
  $('#walkExit').onclick = () => setMode('orbit');
  bindJoystick();
  syncWalkTexts();
  $('#fit3d').onclick=()=>{if(opt.mode==='walk')setMode('orbit');flyTo(isoWhole());};
  $('#vIso').onclick = () => { if (opt.mode === 'walk') setMode('orbit'); else flyTo(isoWhole()); };
  $('#vTop').onclick = () => { if (opt.mode === 'walk') setMode('orbit'); flyTo(topWhole()); };
  document.querySelectorAll('[data-cut]').forEach(b => b.onclick = () => { if (opt.mode === 'walk') return; opt.cut = +b.dataset.cut; syncCutBtns(); sync(); });
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const k = b.dataset.t; opt[k] = !opt[k]; b.classList.toggle('on', opt[k]);b.setAttribute('aria-pressed',String(opt[k]));
    if (k === 'furn'){ furnG.visible = opt.furn; if (!opt.furn && ui.sel?.kind === 'furn') select(null); }
    if (k === 'labels') showLabels(opt.labels && opt.mode === 'orbit' && !anim);
    if (k === 'night') applyLight();
  });
  $('#sun').oninput = e => { opt.hour = +e.target.value; applyLight(); };
}

/* ======================= 主循环 ======================= */
const clock = new THREE.Clock();
function startLoop(){ if (!raf){ clock.getDelta(); raf = requestAnimationFrame(loop); } }
function loop(){
  raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05), now = performance.now();
  if (anim){ const t = clamp01((now - anim.t0)/anim.dur); anim.fn(t); if (t >= 1){ const r = anim.res; anim = null; r(); } }
  else if (fly){ const t = clamp01((now - fly.t0)/fly.dur); camTween(fly.A, fly.B, ease(t)); if (t >= 1) fly = null; }
  else if (opt.mode === 'orbit') orbit.update();
  else stepWalk(dt);
  if(opt.mode==='walk'&&now-positionStamp>100){positionStamp=now;updateWalkPosition();}
  doors.forEach(d => { const tg = d.open ? d.a1 : d.a0; d.cur += (tg - d.cur) * Math.min(1, dt*6); d.pivot.rotation.y = d.cur; });
  updateSel();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  layoutLabels();
}

async function shot(name,longEdge=3200){
  if(!active||renderer.getContext().isContextLost())throw Error('3D unavailable');
  const size=renderer.getSize(new THREE.Vector2()),pixelRatio=renderer.getPixelRatio(),{width,height}=rasterSize({w:size.x,h:size.y},longEdge);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
  // Reuse this renderer and camera; restore its display size even when export fails.
  const selectionVisible=selHelper?.visible;
  try{
    if(selHelper)selHelper.visible=false;
    renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.render(scene,camera);
    ctx.drawImage(renderer.domElement,0,0);
  }finally{
    if(selHelper)selHelper.visible=selectionVisible;
    renderer.setPixelRatio(pixelRatio);renderer.setSize(size.x,size.y,false);renderer.render(scene,camera);
  }
  labelRenderer.render(scene,camera);layoutLabels();
  const hostRect=host.getBoundingClientRect();ctx.save();ctx.scale(width/size.x,height/size.y);
  for(const label of labelG.children){
    const el=label.element,r=el.getBoundingClientRect(),style=getComputedStyle(el);
    if(!label.visible||style.visibility==='hidden'||style.display==='none'||!r.width)continue;
    const x=r.left-hostRect.left,y=r.top-hostRect.top;
    ctx.fillStyle=style.backgroundColor;ctx.fillRect(x,y,r.width,r.height);
    ctx.strokeStyle=style.borderTopColor;ctx.lineWidth=1;ctx.strokeRect(x,y,r.width,r.height);
    const textX=x+parseFloat(style.paddingLeft)+1,textY=y+r.height/2;
    ctx.textBaseline='middle';ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.fillStyle=style.color;
    const text=el.firstChild.textContent;ctx.fillText(text,textX,textY);
    const small=el.querySelector('small'),smallStyle=getComputedStyle(small),smallX=textX+ctx.measureText(text).width+parseFloat(smallStyle.marginLeft);
    ctx.font=`${smallStyle.fontWeight} ${smallStyle.fontSize} ${smallStyle.fontFamily}`;ctx.fillStyle=smallStyle.color;ctx.fillText(small.textContent,smallX,textY);
  }
  ctx.restore();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG generation failed')),'image/png'));
  if(scope.disposed)throw Error('3D unavailable');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=name;a.href=url;exportUrls.add(url);a.click();scope.timeout(()=>{URL.revokeObjectURL(url);exportUrls.delete(url);},1000);
}


function relang(){ syncWalkTexts(); if (inited) buildLabels(); }

function dispose(){
  if(scope.disposed)return;
  cancelGesture();active=false;scope.dispose();exportUrls.forEach(url=>URL.revokeObjectURL(url));exportUrls.clear();cancelAnimationFrame(raf);raf=0;
  if(anim){const resolve=anim.res;anim=null;resolve();}fly=null;
  store.cancel();walkCtl?.unlock();walkCtl?.dispose();orbit?.dispose();stopTouchWalk();
  if(scene){const geometries=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.element)o.element.remove();});geometries.forEach(g=>g.dispose());scene.clear();}
  // Shared cache materials are released once here, never while rebuilding a mesh.
  materials.dispose();glassMat?.dispose();edgeMat.dispose();skirtMat.dispose();ground?.material.dispose();selHelper?.material.dispose();sun?.shadow?.map?.dispose();environmentTarget?.dispose();
  renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();labelRenderer?.domElement.remove();
  for(const id of ['walkOverlay','walkExit','vIso','vTop','fit3d']) $('#'+id).onclick=null;
  $('#sun').oninput=null;document.querySelectorAll('#modes3d button,[data-cut],[data-t]').forEach(b=>b.onclick=null);
  $('#walkOverlay').style.display='none';$('#cross').style.display='none';
}

return {enter, exit, cancel:()=>cancelGesture(), relang, sync:() => sync(), shot, groundAt, flyToRoom:id => { if(active && !anim){if(opt.mode==='walk')setMode('orbit');id==='__all'?flyTo(isoWhole()):flyToRoom(id);}}, walking:() => active && opt.mode === 'walk',dispose};

}
