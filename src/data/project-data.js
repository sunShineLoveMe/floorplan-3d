import {USE_ZONE_KINDS,USE_ZONE_SIDES} from '../core/use-zones.js';
import {validateHouseEditor,generateHouseGeometry} from './house-editor.js';
import {validateReference} from './reference-plan.js';
import {validateRoomEditor,generateRoomGeometry,geometryMatches,GEOMETRY_TOLERANCE} from './room-editor.js';
  const FORMAT = 'floorplan-3d', VERSION = 2, TEMPLATE = 'three-bedroom-a03136c';
  const clone = value => JSON.parse(JSON.stringify(value));
  class ProjectError extends Error { constructor(code, detail=''){ super(detail || code); this.code = code; } }
  function check(ok, path){ if (!ok) throw new ProjectError('INVALID_PROJECT', path); }
  const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const num = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e7;
  const positive = v => num(v) && v > 0;
  const str = v => typeof v === 'string' && v.length <= 500;
  const id = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(v) && !['__proto__','constructor','prototype'].includes(v);
  function list(v, path, max=2000){ check(Array.isArray(v) && v.length <= max, path); return v; }
  function point(p){ return Array.isArray(p) && p.length===2 && p.every(num); }
  function rect(r){ return Array.isArray(r) && r.length===4 && r.every(num) && r[2]>r[0] && r[3]>r[1]; }
  function unique(xs, path){ const ids = xs.map(x=>x.id); check(ids.every(id) && new Set(ids).size===ids.length, path); }
  function validate(p, catalogs){
    check(obj(p), 'project');
    if (p.format !== FORMAT) throw new ProjectError('UNKNOWN_FORMAT');
    if (![1,VERSION].includes(p.version)) throw new ProjectError('UNSUPPORTED_VERSION');
    check(id(p.id) && str(p.name), 'project metadata');
    check(['createdAt','updatedAt'].every(k=>typeof p[k]==='string' && Number.isFinite(Date.parse(p[k]))), 'timestamps');
    check(obj(p.units) && p.units.internal==='mm' && ['metric','imperial'].includes(p.units.display), 'units');
    check(obj(p.layout) && id(p.layout.id) && str(p.layout.name), 'layout');
    check(obj(p.view) && ['2d','3d'].includes(p.view.mode), 'view');
    check(obj(p.view.layers) && ['dims','labels','furn','grid','bearing','wallSnap'].every(k=>typeof p.view.layers[k]==='boolean'), 'layers');
    const g=p.geometry; check(obj(g), 'geometry');
    check(positive(g.height) && point(g.origin), 'height/origin');
    check(obj(g.bounds) && ['x','y'].every(k=>num(g.bounds[k])) && ['w','h'].every(k=>positive(g.bounds[k])), 'bounds');
    const rooms=list(g.rooms,'rooms'); check(rooms.length>0,'rooms'); unique(rooms,'room IDs');
    rooms.forEach(r=>{
      check(str(r.name) && catalogs.materials.includes(r.mat), 'room metadata');
      check(list(r.poly,'polygon',500).length>=3 && r.poly.every(point), 'polygon');
      const area=r.poly.reduce((s,a,i)=>{const b=r.poly[(i+1)%r.poly.length];return s+a[0]*b[1]-b[0]*a[1];},0);
      check(Math.abs(area)>0,'polygon area');
      check(r.at===undefined || point(r.at),'room label');
      check(r.counted===undefined || typeof r.counted==='boolean','room counted');
      check(r.usableAreaM2===undefined || positive(r.usableAreaM2)&&r.usableAreaM2<=Math.abs(area)/2e6,'usable floor area');
    });
    if(g.obstacles!==undefined){
      const obstacles=list(g.obstacles,'fixed obstacles',300);unique(obstacles,'fixed obstacle IDs');
      check(p.version===2&&p.roomEditor?.kind==='house','Fixed obstacles require an editable house.');
      obstacles.forEach(o=>check(rect(o.rect)&&rooms.some(r=>r.id===o.roomId)&&str(o.name)&&o.name.trim()&&positive(o.height)&&o.height<=g.height,'fixed obstacle'));
    }
    list(g.walls,'walls').forEach(w=>check(Array.isArray(w) && w.length===5 && rect(w.slice(0,4)) && ['b','e','n','low'].includes(w[4]),'wall'));
    if(g.wallHeights!==undefined)check(Array.isArray(g.wallHeights)&&g.wallHeights.length===g.walls.length&&g.wallHeights.every(h=>positive(h)&&h<=g.height),'wall heights');
    if(g.floorSlabs!==undefined)list(g.floorSlabs,'floor slabs').forEach(r=>check(rect(r),'floor slab'));
    if(g.floorPolygons!==undefined||g.diagonalWalls!==undefined){
      check(p.version===2&&p.roomEditor?.kind==='house','Polygonal structures require an editable house.');
      const polygon=poly=>Array.isArray(poly)&&poly.length>=3&&poly.length<=20&&poly.every(point)&&Math.abs(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1];},0))>0;
      if(g.floorPolygons!==undefined){check(g.floorSlabs===undefined,'Use one footprint representation.');list(g.floorPolygons,'floor polygons').forEach(poly=>check(polygon(poly),'floor polygon'));}
      if(g.diagonalWalls!==undefined)list(g.diagonalWalls,'diagonal walls').forEach(w=>check(str(w.id)&&rooms.some(r=>r.id===w.roomId)&&polygon(w.poly)&&Array.isArray(w.inner)&&w.inner.length===2&&w.inner.every(point)&&positive(w.height)&&w.height<=g.height,'diagonal wall'));
    }
    if(g.passages!==undefined)list(g.passages,'passages').forEach(p=>check(rect(p.rect)&&rooms.some(r=>r.id===p.roomId),'passage'));
    list(g.windows,'windows').forEach(w=>check(rect(w.rect) && num(w.sill) && w.sill>=0 && positive(w.head) && w.head>w.sill && w.head<=g.height+GEOMETRY_TOLERANCE,'window'));
    list(g.doors,'doors').forEach(d=>{
      check(rect(d.rect) && point(d.h) && point(d.c) && point(d.o) && positive(d.len) && positive(d.height) && d.height<=g.height && str(d.name),'door');
      check(Math.abs(Math.hypot(...d.c)-1)<1e-8 && Math.abs(Math.hypot(...d.o)-1)<1e-8 && Math.abs(d.c[0]*d.o[0]+d.c[1]*d.o[1])<1e-8,'door directions');
    });
    list(g.slides,'sliding doors').forEach(d=>check(rect(d.rect) && typeof d.v==='boolean' && positive(d.height) && d.height<=g.height && (d.style===undefined||['sliding','bifold'].includes(d.style)) && (d.style!=='bifold'||['inward','outward'].includes(d.swing)),'sliding/folding door'));
    list(g.lintels,'lintels').forEach(l=>check(rect(l.rect) && positive(l.height) && l.height<=g.height,'lintel'));
    list(g.dimensions,'dimensions').forEach(d=>check(typeof d.horizontal==='boolean' && num(d.at) && num(d.start) && list(d.segments,'dimension segments',100).every(positive),'dimension'));
    check(g.walkStart===undefined || (obj(g.walkStart) && point(g.walkStart.position) && point(g.walkStart.target)), 'walk start');
    check(g.entry===null || (obj(g.entry) && point(g.entry.position)), 'entry');
    check(obj(p.rooms) && Object.keys(p.rooms).length===rooms.length, 'room settings');
    rooms.forEach(r=>check(Object.hasOwn(p.rooms,r.id) && obj(p.rooms[r.id]) && str(p.rooms[r.id].name) && catalogs.materials.includes(p.rooms[r.id].mat),'room settings'));
    Object.values(p.rooms).forEach(r=>check(r.labelHidden===undefined||typeof r.labelHidden==='boolean','room label visibility'));
    unique(list(p.furniture,'furniture'),'furniture IDs');
    p.furniture.forEach(f=>check(catalogs.types.includes(f.type) && str(f.name) && positive(f.w) && positive(f.d) && (f.height===undefined || positive(f.height)) && [f.cx,f.cy,f.rot].every(num) && typeof f.color==='string' && /^#[0-9a-f]{6}$/i.test(f.color),'furniture'));
    if(p.clearance!==undefined){
      const c=p.clearance;check(obj(c)&&num(c.targetMm)&&c.targetMm>=100&&c.targetMm<=3000&&['open','closed'].includes(c.doorState),'clearance settings');
      for(const key of ['fromRoomId','toRoomId'])check(c[key]===undefined||id(c[key]),'clearance room');
    }
    for(const f of p.furniture)if(f.clearance!==undefined){
      const c=f.clearance;check(obj(c)&&['solid','ground'].includes(c.mode),'furniture clearance mode');
      check(c.containerId===undefined||id(c.containerId)&&c.containerId!==f.id,'furniture container');
    }
    for(const f of p.furniture)if(f.useZones!==undefined){
      const zones=list(f.useZones,'furniture use zones',16);unique(zones,'use zone IDs');
      zones.forEach(z=>check(obj(z)&&USE_ZONE_KINDS.includes(z.kind)&&USE_ZONE_SIDES.includes(z.side)&&['widthMm','depthMm'].every(k=>num(z[k])&&z[k]>=1&&z[k]<=10000)&&num(z.offsetMm)&&Math.abs(z.offsetMm)<=10000,'use zone assumption'));
    }
    const walls=list(p.demolished,'demolished');
    check(new Set(walls).size===walls.length && walls.every(x=>typeof x==='string' && /^w\d+$/.test(x) && g.walls[+x.slice(1)] && g.walls[+x.slice(1)][4]!=='b'),'demolished walls');
    list(p.measures,'measures').forEach(m=>check(obj(m.a) && obj(m.b) && [m.a.x,m.a.y,m.b.x,m.b.y].every(num),'measurement'));
    if(p.version===2){
      check(p.roomEditor===null || obj(p.roomEditor),'roomEditor');
      if(p.roomEditor!==null){
        const house=p.roomEditor.kind==='house';
        const editor=house?validateHouseEditor(p.roomEditor):validateRoomEditor(p.roomEditor);
        check(house?rooms.length===editor.rooms.length&&editor.rooms.every(r=>Object.hasOwn(p.rooms,r.id)):rooms.length===1&&rooms[0].id===editor.roomId,'room settings');
        check(Object.values(p.rooms).every(r=>r.name.trim().length>0),'room name');
        check(!p.templateId,'rectangle templateId');
        check(p.demolished.length===0,'rectangle demolished');
        const ids=[p.id,p.layout.id,...Object.keys(p.rooms),...p.furniture.map(f=>f.id),...editor.openings.map(o=>o.id),...(house?editor.rooms.flatMap(r=>(r.obstacles||[]).map(o=>o.id)):[])];
        check(new Set(ids).size===ids.length,'project-wide IDs');
        check(geometryMatches(g,(house?generateHouseGeometry:generateRoomGeometry)(editor,p.rooms)),'roomEditor / geometry mismatch');
      }
    }
    if(p.referencePlan!==undefined)validateReference(p.referencePlan);
    const result=clone(p);
    if(result.version===1){result.version=VERSION;result.roomEditor=null;}
    return result;
  }
  function create(geometry, furniture){
    const now=new Date().toISOString(), rooms={};
    geometry.rooms.forEach(r=>rooms[r.id]={name:r.name,mat:r.mat});
    return {format:FORMAT,version:VERSION,id:'p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),name:'My floor plan',createdAt:now,updatedAt:now,templateId:TEMPLATE,
      units:{internal:'mm',display:'metric'},layout:{id:'layout-1',name:'Layout A'},
      view:{mode:'2d',layers:{dims:true,labels:true,furn:true,grid:false,bearing:false,wallSnap:true}},
      roomEditor:null,geometry:clone(geometry),furniture:clone(furniture),rooms,demolished:[],measures:[]};
  }
  function read(raw, template, catalogs, confirmLegacy=false){
    let data; try { data=JSON.parse(raw); } catch { throw new ProjectError('INVALID_JSON'); }
    check(obj(data),'project');
    if ('version' in data || 'format' in data) return {project:validate(data,catalogs),legacy:false};
    // Geometry-free files carry no reliable template identity. Never guess silently.
    if (!Array.isArray(data.furniture) || !obj(data.rooms) || !Array.isArray(data.demolished) || !Array.isArray(data.measures)) throw new ProjectError('UNKNOWN_FORMAT');
    if (!confirmLegacy) throw new ProjectError('LEGACY_CONFIRM_REQUIRED');
    const p=create(template, data.furniture);
    if(data.units!==undefined)p.units=clone(data.units);
    p.rooms={...p.rooms,...data.rooms}; p.demolished=data.demolished; p.measures=data.measures;
    p.migratedFrom={format:'legacy-unversioned',templateId:TEMPLATE};
    return {project:validate(p,catalogs),legacy:true};
  }

export {FORMAT,VERSION,TEMPLATE,ProjectError,create,validate,read,clone};

export function createRectangleProject({name='My room',width=4000,depth=3000,height=2800}={}){
  check(typeof name==='string'&&name.trim().length>0&&name.length<=500,'room name');
  const roomEditor=validateRoomEditor({kind:'rectangle',roomId:'room-1',width,depth,height,wallThickness:120,openings:[]});
  const rooms={'room-1':{name:name.trim(),mat:'wood'}};
  const p=create(generateRoomGeometry(roomEditor,rooms),[]);
  delete p.templateId;p.name=name.trim();p.layout={id:'layout-'+p.id,name:'Layout A'};p.roomEditor=roomEditor;
  return p;
}
export function updateRectangleProject(project,editor,rooms=project.rooms){
  const next=clone(project);next.roomEditor=editor.kind==='house'?validateHouseEditor(editor):validateRoomEditor(editor);next.rooms=clone(rooms);
  next.geometry=(next.roomEditor.kind==='house'?generateHouseGeometry:generateRoomGeometry)(next.roomEditor,next.rooms);next.demolished=[];delete next.templateId;
  return next;
}
