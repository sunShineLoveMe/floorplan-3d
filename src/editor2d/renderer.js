import {placeRoomLabels} from './room-labels.js';
import {doorConflicts} from '../core/door-clearance.js';
import {formatLengthMm,formatAreaM2,gridSizeMm} from '../core/units.js';
import {$} from '../ui/dom.js';
import {COARSE,esc} from '../ui/dom.js';
import {tr,nm} from '../ui/i18n.js';
import {area,aabb} from '../core/geometry.js';
import {furnSVG} from './furniture-symbols.js';
export function createRenderer({store,ui,view}){
const length=(mm,style='feet')=>esc(formatLengthMm(mm,store.getProject().units.display,{style}));
const getF = id => store.getProject().furniture.find(f=>f.id===id);
const NOLABEL = ['plant','floorlamp','sidetable','barstool','beanbag'];
function renderRooms(){
  const reference=store.getProject().referencePlan;
  $('#gReference').innerHTML=reference?.visible?`<image href="${esc(reference.src)}" x="${reference.x}" y="${reference.y}" width="${reference.pixelWidth*reference.mmPerPixel}" height="${reference.pixelHeight*reference.mmPerPixel}" opacity="${reference.opacity}"/>`:'';
  let s = (store.getProject().geometry.floorSlabs||[]).map(([x0,y0,x1,y1])=>`<rect data-floor-slab x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="url(#m-${store.getProject().rooms[store.getProject().geometry.rooms[0].id].mat})" fill-opacity="${reference?.visible?.35:1}" pointer-events="none"/>`).join('');
  store.getProject().geometry.rooms.forEach(r => s += `<polygon class="room" data-room="${r.id}" points="${r.poly.map(p=>p.join(',')).join(' ')}" fill="url(#m-${store.getProject().rooms[r.id].mat})" fill-opacity="${store.getProject().referencePlan?.visible?.35:1}"/>`);
  const sill = ([a,b,c,d]) => `<rect x="${a}" y="${b}" width="${c-a}" height="${d-b}" fill="#e2dacb" stroke="#b9b0a0" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  store.getProject().geometry.doors.forEach(d => s += sill(d.rect)); store.getProject().geometry.slides.forEach(d => s += sill(d.rect));
  $('#gRooms').innerHTML = s;
}

function renderFurn(){
  const g = $('#gFurn');
  g.setAttribute('display', ui.layers.furn ? 'inline' : 'none');
  g.innerHTML = store.getProject().furniture.map(f => {
    const fs = Math.max(80, Math.min(170, Math.min(f.w,f.d)*.2));
    const label = Math.min(f.w,f.d) >= 380 && !NOLABEL.includes(f.type)
      ? `<text transform="rotate(${-f.rot})" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="#4a443c" opacity=".8" pointer-events="none">${esc(nm(f.name))}</text>` : '';
    return `<g class="furn" data-fid="${f.id}" transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">${furnSVG(f.type,f.w,f.d,f.color)}${label}</g>`;
  }).join('');
}

function renderWalls(){
  $('#gWalls').innerHTML = store.getProject().geometry.walls.map((w,i) => {
    const [x0,y0,x1,y1,k] = w, id = store.getProject().roomEditor ? store.getProject().geometry.wallIds[i] : 'w'+i, dem = store.getProject().demolished.includes(id);
    let fill = k==='b' ? (ui.layers.bearing ? '#b8412c' : '#26241f') : k==='low' ? '#e9e3d8' : k==='e' ? '#8f897d' : '#a7a195';
    let ex = k==='low' ? 'stroke="#8f897d" stroke-width="1" vector-effect="non-scaling-stroke"' : '';
    if (dem){ fill = 'rgba(198,91,58,.12)'; ex = 'stroke="#c65b3a" stroke-width="1.2" stroke-dasharray="5 3" vector-effect="non-scaling-stroke"'; }
    return `<rect class="wall" data-wall="${id}" style="${store.getProject().roomEditor ? 'pointer-events:all;cursor:pointer' : ''}" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${fill}" ${ex}/>`;
  }).join('');
}

function renderOpenings(){
  const WS = 'stroke="#4f7394" stroke-width="1" vector-effect="non-scaling-stroke"';
  let s = '';
  store.getProject().geometry.windows.forEach(opening => {
    const [x0,y0,x1,y1] = opening.rect;
    s += opening.id ? `<g data-opening="${esc(opening.id)}" style="cursor:pointer">` : '<g>';
    const w = x1-x0, h = y1-y0;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#f7fbfd" ${WS}/>`;
    if (opening.wallId ? ['top','bottom'].includes(String(opening.wallId).split('--').at(-1)) : w >= h) [1/3,2/3].forEach(t => s += `<line x1="${x0}" y1="${y0+h*t}" x2="${x1}" y2="${y0+h*t}" ${WS}/>`);
    else [1/3,2/3].forEach(t => s += `<line x1="${x0+w*t}" y1="${y0}" x2="${x0+w*t}" y2="${y1}" ${WS}/>`);
    s += '</g>';
  });
  const DS = 'stroke="#3d3a34" stroke-width="1" vector-effect="non-scaling-stroke"';
  store.getProject().geometry.doors.forEach(d => {
    const [hx,hy] = d.h, L = d.len, T = Math.min(40,L*.2);
    s += d.id ? `<g data-opening="${esc(d.id)}" style="cursor:pointer"><rect x="${d.rect[0]}" y="${d.rect[1]}" width="${d.rect[2]-d.rect[0]}" height="${d.rect[3]-d.rect[1]}" fill="transparent"/>` : '<g>';
    const ox = hx + d.o[0]*L, oy = hy + d.o[1]*L, cx = hx + d.c[0]*L, cy = hy + d.c[1]*L;
    const sweep = d.o[0]*d.c[1] - d.o[1]*d.c[0] > 0 ? 1 : 0;
    const col = d.entry ? '#b5653a' : '#3d3a34';
    s += `<polygon points="${hx},${hy} ${ox},${oy} ${ox+d.c[0]*T},${oy+d.c[1]*T} ${hx+d.c[0]*T},${hy+d.c[1]*T}" fill="#fff" stroke="${col}" stroke-width="${d.entry?1.8:1}" vector-effect="non-scaling-stroke"/>`;
    s += `<path d="M${ox} ${oy}A${L} ${L} 0 0 ${sweep} ${cx} ${cy}" fill="none" ${DS} stroke-dasharray="5 3" opacity=".7"/>`;
    s += '</g>';
  });
  store.getProject().geometry.slides.forEach(({rect:[x0,y0,x1,y1],v,id,style,wallId,swing}) => {
    s+=id?`<g data-opening="${esc(id)}" style="cursor:pointer"><rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="transparent"/>`:'<g>';
    if(style==='bifold'){
      const L=v?y1-y0:x1-x0,side=String(wallId).split('--').at(-1),normal=(['top','left'].includes(side)?1:-1)*(swing==='outward'?-1:1),face=v?(side==='left'?x1:x0):(side==='top'?y1:y0);
      for(const end of [0,1]){const start=v?(end?y1:y0):(end?x1:x0),sign=end?-1:1,point=(along,depth)=>v?`${face+normal*depth},${start+sign*along}`:`${start+sign*along},${face+normal*depth}`;s+=`<polyline points="${point(0,0)} ${point(L*.06,L*.24)} ${point(L*.12,0)}" fill="none" ${DS}/>`;}
    }else {
    if (v){ const L = y1-y0, m = (x0+x1)/2; s += `<rect x="${m-45}" y="${y0}" width="40" height="${L*.55}" fill="#fff" ${DS}/><rect x="${m+5}" y="${y1-L*.55}" width="40" height="${L*.55}" fill="#fff" ${DS}/>`; }
    else { const L = x1-x0, m = (y0+y1)/2; s += `<rect x="${x0}" y="${m-45}" width="${L*.55}" height="40" fill="#fff" ${DS}/><rect x="${x1-L*.55}" y="${m+5}" width="${L*.55}" height="40" fill="#fff" ${DS}/>`; }
    }s+='</g>';
  });
  store.getProject().geometry.lintels.filter(o=>o.passage).forEach(o=>{const [x0,y0,x1,y1]=o.rect;s+=`<g data-opening="${esc(o.id)}" style="cursor:pointer"><rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="#f9f6ef" stroke="#8f897d" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/></g>`;});
  // Entry annotation is template data, not a fixed drawing coordinate.
  if(store.getProject().geometry.entry){ const [x,y]=store.getProject().geometry.entry.position;
    s += `<g transform="translate(${x} ${y})"><path d="M0 0H1000M800 -155L1050 0L800 155" fill="none" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="30" y="-155" font-size="200" fill="#b5653a">${tr('入户','Entry')}</text></g>`;
  }
  $('#gOpen').innerHTML = s;
}

function renderWarnings(){
 const conflicts=doorConflicts(store.getProject()),doors=[...new Set(conflicts.map(c=>c.door))];
 $('#gWarnings').innerHTML=doors.map(d=>{const [x,y]=d.h,ox=x+d.o[0]*d.len,oy=y+d.o[1]*d.len,cx=x+d.c[0]*d.len,cy=y+d.c[1]*d.len,sweep=d.o[0]*d.c[1]-d.o[1]*d.c[0]>0?1:0;return `<path d="M${x} ${y}L${ox} ${oy}A${d.len} ${d.len} 0 0 ${sweep} ${cx} ${cy}Z" fill="#d7442633" stroke="#b5351b" stroke-width="2" vector-effect="non-scaling-stroke"/>`;}).join('');
}
function renderLabels(){
  const g = $('#gLabels');
  g.setAttribute('display', ui.layers.labels ? 'inline' : 'none');
  g.innerHTML = placeRoomLabels(store.getProject(),nm,poly=>formatAreaM2(area(poly),store.getProject().units.display)).map(label=>{
    const {x,y,font,small}=label,halo='stroke="#fbf9f4" stroke-width="35" paint-order="stroke" stroke-linejoin="round"';
    return `<g data-label-room="${label.id}"><text x="${x}" y="${y}" font-size="${font}" font-weight="600" text-anchor="middle" fill="#2b2824" ${halo}>${esc(label.name)}</text><text x="${x}" y="${y+font}" font-size="${small}" text-anchor="middle" fill="#7d7366" ${halo}>${esc(label.area)}</text></g>`;
  }).join('');
}

function renderDims(){
  const DC = '#7d7160', LS = `stroke="${DC}" stroke-width="1" vector-effect="non-scaling-stroke"`, TK = `stroke="${DC}" stroke-width="2" vector-effect="non-scaling-stroke"`;
  const txt = (x,y,v,rot) => `<text x="${x}" y="${y}" font-size="${Math.max(45,Math.min(200,v/(formatLengthMm(v,store.getProject().units.display).length*.65)))}" text-anchor="middle" fill="${DC}" ${rot?`transform="rotate(-90 ${x} ${y})"`:''}>${length(v)}</text>`;
  const chain = (horiz, at, start, segs) => {
    const pts = [start]; segs.forEach(v => pts.push(pts[pts.length-1]+v));
    let s = horiz ? `<line x1="${pts[0]}" y1="${at}" x2="${pts.at(-1)}" y2="${at}" ${LS}/>` : `<line x1="${at}" y1="${pts[0]}" x2="${at}" y2="${pts.at(-1)}" ${LS}/>`;
    pts.forEach(p => s += horiz
      ? `<line x1="${p}" y1="${at-170}" x2="${p}" y2="${at+170}" ${LS}/><line x1="${p-80}" y1="${at+80}" x2="${p+80}" y2="${at-80}" ${TK}/>`
      : `<line x1="${at-170}" y1="${p}" x2="${at+170}" y2="${p}" ${LS}/><line x1="${at-80}" y1="${p+80}" x2="${at+80}" y2="${p-80}" ${TK}/>`);
    segs.forEach((v,i) => { const mid = (pts[i]+pts[i+1])/2; s += horiz ? txt(mid, at-70, v) : txt(at-70, mid, v, true); });
    return s;
  };
  const g = $('#gDims');
  const geometry=store.getProject().geometry;let dimensions=geometry.dimensions;
  if(geometry.floorSlabs){const slabs=geometry.floorSlabs,x0=Math.min(...slabs.map(r=>r[0])),y0=Math.min(...slabs.map(r=>r[1])),x1=Math.max(...slabs.map(r=>r[2])),y1=Math.max(...slabs.map(r=>r[3]));dimensions=dimensions.filter(d=>d.at<=(d.horizontal?y0:x0)-150);dimensions=[...dimensions,{horizontal:true,at:y0-700,start:x0,segments:[x1-x0]},{horizontal:false,at:x0-700,start:y0,segments:[y1-y0]}];}
  g.innerHTML = dimensions.map(d=>chain(d.horizontal,d.at,d.start,d.segments)).join('');
  g.setAttribute('display', ui.layers.dims ? 'inline' : 'none');
}

function renderGrid(){
  const size=gridSizeMm(store.getProject().units.display),grid=$('#grid');
  grid.setAttribute('width',size);grid.setAttribute('height',size);
  grid.innerHTML=`<path d="M${size/2} 0V${size}M0 ${size/2}H${size}" stroke="#e5dfd3" stroke-width="${size*.008}"/><path d="M0 0V${size}M0 0H${size}" stroke="#d8d0c1" stroke-width="${size*.014}"/>`;
  $('#gGrid').innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid ? 'url(#grid)' : 'transparent'}" data-bg="1"/>`;
}

function renderMeasure(){
  const k = 1/view.s, fs = 12*k;
  const one = (a,b,tmp) => {
    const L = Math.hypot(b.x-a.x, b.y-a.y); if (L === 0) return '';
    let ang = Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI; if (ang > 90 || ang < -90) ang += 180;
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2, nx = -(b.y-a.y)/L*5*k, ny = (b.x-a.x)/L*5*k;
    const col = tmp ? '#2f5d62' : '#b5653a', S = `stroke="${col}" stroke-width="1.5" vector-effect="non-scaling-stroke"`;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${S}/>
      <line x1="${a.x-nx}" y1="${a.y-ny}" x2="${a.x+nx}" y2="${a.y+ny}" ${S}/><line x1="${b.x-nx}" y1="${b.y-ny}" x2="${b.x+nx}" y2="${b.y+ny}" ${S}/>
      <text x="${mx}" y="${my-5*k}" font-size="${fs}" text-anchor="middle" fill="${col}" font-weight="600" transform="rotate(${ang} ${mx} ${my})"
        stroke="#fff" stroke-width="${3.5*k}" paint-order="stroke">${length(L)}</text>`;
  };
  let s = store.getProject().measures.map(m => one(m.a,m.b)).join('');
  if (ui.mA && ui.mCur) s += one(ui.mA, ui.mCur, true);
  if (ui.mA) s += `<circle cx="${ui.mA.x}" cy="${ui.mA.y}" r="${3*k}" fill="#2f5d62"/>`;
  $('#gMeasure').innerHTML = s;
}

function renderSel(){
  const k = 1/view.s; let s = '';
  if (ui.sel?.kind === 'furn'){
    const f = getF(ui.sel.id);
    if (f){
      // 触屏上手柄更大、离家具更远，并各带一圈透明的大热区
      const p = 5*k, A = 'stroke="#b5653a" vector-effect="non-scaling-stroke"', hs = COARSE ? 1.7 : 1, ro = (COARSE ? 40 : 26)*k, hit = (COARSE ? 24 : 11)*k;
      const sx = f.w/2+p, sy = f.d/2+p;
      s += `<g transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">
        <rect x="${-f.w/2-p}" y="${-f.d/2-p}" width="${f.w+2*p}" height="${f.d+2*p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>
        <line x1="0" y1="${-f.d/2-p}" x2="0" y2="${-f.d/2-ro}" ${A} stroke-width="1" pointer-events="none"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${hit}" fill="transparent"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${6*hs*k}" fill="#fff" ${A} stroke-width="1.5"><title>${tr('拖动旋转（Shift 自由角度）','Drag to rotate (Shift for free angle)')}</title></circle>
        <circle data-handle="size" cx="${sx}" cy="${sy}" r="${hit}" fill="transparent"/>
        <rect data-handle="size" x="${sx-5*hs*k}" y="${sy-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" fill="#b5653a"><title>${tr('拖动调整尺寸','Drag to resize')}</title></rect></g>`;
      const {hh} = aabb(f);
      s += `<text x="${f.cx}" y="${f.cy+hh+24*k}" font-size="${12*k}" text-anchor="middle" fill="#b5653a" font-weight="600" pointer-events="none"
        stroke="#fff" stroke-width="${3*k}" paint-order="stroke">${length(f.w,'inches')} × ${length(f.d,'inches')}</text>`;
    }
  } else if (ui.sel?.kind === 'room'){
    const r = store.getProject().geometry.rooms.find(r => r.id === ui.sel.id);
    if(r) s += `<polygon points="${r.poly.map(p=>p.join(',')).join(' ')}" fill="rgba(181,101,58,.08)" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  const editor = store.getProject().roomEditor;
  if (editor && ['opening','wall'].includes(ui.sel?.kind)) {
    const opening = editor.openings.find(o => o.id === ui.sel.id);
    const wallId = ui.sel.kind === 'wall' ? ui.sel.id : opening?.wallId;
    const room=editor.kind==='house'?editor.rooms.find(r=>r.id===wallId?.split('--')[0]):editor;
    const {width:w,depth:d}=room||{},origin=editor.kind==='house'?[room?.x||0,room?.y||0]:[0,0];
    const endpoints = {top:[0,0,w,0], right:[w,0,w,d], bottom:[0,d,w,d], left:[0,0,0,d]}[wallId?.split('--').at(-1)]?.map((v,i)=>v+origin[i%2]);
    if (endpoints) {
      const [x0,y0,x1,y1] = endpoints, dx = x1===x0 ? 0 : 1, dy = y1===y0 ? 0 : 1, a=10*k;
      s += `<g pointer-events="none" fill="#b5653a" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke">
        <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" vector-effect="non-scaling-stroke"/>
        <circle cx="${x0}" cy="${y0}" r="${4*k}" stroke="none"/>
        <path d="M${x1-dx*a-dy*a/2},${y1-dy*a+dx*a/2}L${x1},${y1}L${x1-dx*a+dy*a/2},${y1-dy*a-dx*a/2}" fill="none" vector-effect="non-scaling-stroke"/>
        <text x="${(x0+x1)/2+dy*14*k}" y="${(y0+y1)/2-dx*14*k}" font-size="${12*k}" text-anchor="middle" stroke="white" stroke-width="${3*k}" paint-order="stroke">${tr('起点 → 终点','Start → End')}</text></g>`;
    }
    if(opening) {
      const g = [...store.getProject().geometry.doors,...store.getProject().geometry.windows].find(o=>o.id===opening.id);
      if(g) s += `<rect x="${g.rect[0]}" y="${g.rect[1]}" width="${g.rect[2]-g.rect[0]}" height="${g.rect[3]-g.rect[1]}" fill="rgba(181,101,58,.15)" stroke="#b5653a" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    }
  }
  $('#gSel').innerHTML = s;
}


return {update(){renderOpenings();renderDims();renderGrid();renderRooms();renderFurn();renderWalls();renderWarnings();renderLabels();renderMeasure();renderSel();},renderFurn,renderSel,renderMeasure,renderOpenings,renderDims};
}
