/** Millimetres, unrounded. Bounds are practical editor limits, not building rules. */
export const ROOM_LIMITS = Object.freeze({minSize:100,maxSize:100000,minHeight:100,maxHeight:20000,gap:1,wallThickness:120,maxOpenings:200});
export const WALL_IDS = Object.freeze(['top','right','bottom','left']);
export const GEOMETRY_TOLERANCE = 1e-6;
const copy = v => JSON.parse(JSON.stringify(v));
const object = v => v && typeof v==='object' && !Array.isArray(v);
const identifier = v => typeof v==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(v) && !['__proto__','constructor','prototype'].includes(v);
function check(ok,path){ if(!ok){const error=new Error(path);error.code='INVALID_PROJECT';throw error;} }
function number(v,min,max,path){check(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,path);}
export function validateRoomEditor(editor){
 check(object(editor)&&editor.kind==='rectangle','roomEditor.kind');
 check(identifier(editor.roomId),'roomEditor.roomId');
 number(editor.width,100,100000,'roomEditor.width (100–100000 mm)');
 number(editor.depth,100,100000,'roomEditor.depth (100–100000 mm)');
 number(editor.height,100,20000,'roomEditor.height (100–20000 mm)');
 check(editor.wallThickness===120,'roomEditor.wallThickness (120 mm)');
 check(Array.isArray(editor.openings)&&editor.openings.length<=200,'roomEditor.openings');
 const ids=new Set();
 editor.openings.forEach(o=>{
  check(object(o),'opening');const path='opening '+(o.id||'?')+' ';
  check(identifier(o.id)&&!ids.has(o.id)&&o.id!==editor.roomId,path+'unique id');ids.add(o.id);
  check(['door','window'].includes(o.type),path+'type');check(WALL_IDS.includes(o.wallId),path+'wallId');
  const length=['top','bottom'].includes(o.wallId)?editor.width:editor.depth;
  number(o.offset,1,length-1,path+'offset');number(o.width,1,length-2,path+'width');
  check(o.offset+o.width<=length-1+GEOMETRY_TOLERANCE,path+'outside parent wall');number(o.height,1,editor.height,path+'height');
  if(o.type==='door'){
   check(['start','end'].includes(o.hinge),path+'hinge');check(['inward','outward'].includes(o.swing),path+'swing');check(!('sill' in o),path+'door cannot have sill');
  } else {number(o.sill,0,editor.height,path+'sill');check(o.sill+o.height<=editor.height+GEOMETRY_TOLERANCE,path+'window head exceeds room height');check(!('hinge' in o)&&!('swing' in o),path+'window cannot have door fields');}
 });
 WALL_IDS.forEach(w=>{const os=editor.openings.filter(o=>o.wallId===w).sort((a,b)=>a.offset-b.offset);for(let i=1;i<os.length;i++)check(os[i].offset-os[i-1].offset-os[i-1].width>=1-GEOMETRY_TOLERANCE,'opening '+os[i].id+' overlaps or is less than 1 mm from '+os[i-1].id);});
 return copy(editor);
}
export function generateRoomGeometry(input,rooms,wallWidths){
 const e=validateRoomEditor(input),{width:W,depth:D,height,wallThickness:T}=e;
 check(object(rooms)&&object(rooms[e.roomId]),'room settings');const room=rooms[e.roomId];
 const thickness=w=>wallWidths?.[w]??T;
 const walls=[],wallIds=[],doors=[],windows=[];
 const rect=(wall,start,end)=>wall==='top'?[start,-thickness(wall),end,0]:wall==='bottom'?[start,D,end,D+thickness(wall)]:wall==='left'?[-thickness(wall),start,0,end]:[W,start,W+thickness(wall),end];
 WALL_IDS.forEach(w=>{
  if(thickness(w)===0)return;
  const horizontal=['top','bottom'].includes(w),length=horizontal?W:D;
  const openings=e.openings.filter(o=>o.wallId===w).sort((a,b)=>a.offset-b.offset);
  let cursor=horizontal?-thickness('left'):0;
  for(const o of openings){
   walls.push([...rect(w,cursor,o.offset),'n']);wallIds.push(w);cursor=o.offset+o.width;
   const base={id:o.id,wallId:w,rect:rect(w,o.offset,cursor)};
   if(o.type==='window')windows.push({...base,sill:o.sill,head:o.sill+o.height});
   else {
    const at=o.hinge==='start'?o.offset:cursor,sign=o.hinge==='start'?1:-1;
    const h=horizontal?[at,w==='top'?0:D]:[w==='left'?0:W,at];
    const inside=w==='top'?[0,1]:w==='bottom'?[0,-1]:w==='left'?[1,0]:[-1,0];
    doors.push({...base,h,c:horizontal?[sign,0]:[0,sign],o:inside.map(x=>x*(o.swing==='inward'?1:-1)||0),len:o.width,height:o.height,name:o.id});
   }
  }
  walls.push([...rect(w,cursor,horizontal?length+thickness('right'):length),'n']);wallIds.push(w);
 });
 // Include the whole quarter-circle door sweep, dimension lines and text padding.
 let minX=-thickness('left')-600,minY=-thickness('top')-600,maxX=W+thickness('right')+600,maxY=D+thickness('bottom')+600;
 doors.forEach(d=>{for(const v of [d.c,d.o]){const x=d.h[0]+v[0]*d.len,y=d.h[1]+v[1]*d.len;minX=Math.min(minX,x-150);maxX=Math.max(maxX,x+150);minY=Math.min(minY,y-150);maxY=Math.max(maxY,y+150);}});
 return {height,origin:[W/2,D/2],bounds:{x:minX,y:minY,w:maxX-minX,h:maxY-minY},rooms:[{id:e.roomId,name:room.name,mat:room.mat,poly:[[0,0],[W,0],[W,D],[0,D]],at:[W/2,D/2]}],walls,wallIds,doors,windows,slides:[],lintels:[],dimensions:[{horizontal:true,at:-thickness('top')-300,start:0,segments:[W]},{horizontal:false,at:-thickness('left')-300,start:0,segments:[D]}],walkStart:{position:[W/2,D*.7],target:[W/2,D*.3]},entry:null};
}
/** Structural comparison has one absolute tolerance (one millionth of a mm). */
export function geometryMatches(actual,expected){
 if(typeof actual==='number'&&typeof expected==='number')return Number.isFinite(actual)&&Math.abs(actual-expected)<=GEOMETRY_TOLERANCE;
 if(Array.isArray(expected))return Array.isArray(actual)&&actual.length===expected.length&&expected.every((v,i)=>geometryMatches(actual[i],v));
 if(object(expected))return object(actual)&&Object.keys(actual).length===Object.keys(expected).length&&Object.keys(expected).every(k=>Object.hasOwn(actual,k)&&geometryMatches(actual[k],expected[k]));
 return actual===expected;
}
