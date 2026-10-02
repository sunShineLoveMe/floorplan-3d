const esc=value=>String(value).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
import {area} from '../core/geometry.js';
import {formatAreaM2} from '../core/units.js';
import {doorConflicts} from '../core/door-clearance.js';
export function printLayout(bounds,{paper='letter',orientation='landscape',scale='fit'}={}){
 const sizes={letter:[215.9,279.4],a4:[210,297],a3:[297,420]};if(!sizes[paper]||!['portrait','landscape'].includes(orientation))throw Error('Invalid paper.');
 const [short,long]=sizes[paper],[width,height]=orientation==='landscape'?[long,short]:[short,long],availableWidth=width-20,availableHeight=height-60;
 const denominator=scale==='fit'?Math.max(bounds.w/availableWidth,bounds.h/availableHeight):Number(scale);
 if(!Number.isFinite(denominator)||denominator<=0)throw Error('Invalid scale.');
 const drawingWidth=bounds.w/denominator,drawingHeight=bounds.h/denominator;
 if(drawingWidth>availableWidth+.001||drawingHeight>availableHeight+.001)throw Error('The plan does not fit on this paper at 1:'+denominator+'. Choose larger paper, a smaller scale, or Fit page.');
 return {width,height,drawingWidth,drawingHeight,denominator,scale,paper,orientation};
}
export function printDocument(project,svg,options,name){
 const layout=printLayout(project.geometry.bounds,options),units=project.units.display,total=project.geometry.rooms.reduce((sum,r)=>sum+area(r.poly),0),conflicts=doorConflicts(project).length;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(name)}</title><style>@page{size:${layout.width}mm ${layout.height}mm;margin:10mm}*{box-sizing:border-box}body{margin:0;background:white;color:#222;font:10pt Arial,sans-serif}h1{font-size:15pt;margin:0 0 2mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meta{margin:0 0 3mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.drawing{width:${layout.drawingWidth}mm;height:${layout.drawingHeight}mm}.drawing svg{display:block;width:100%;height:100%}.legend{margin:3mm 0 2mm;font-size:8pt;line-height:1.25}.ruler{width:100mm;border-bottom:1pt solid #222;position:relative;padding-bottom:1mm;font-size:8pt;line-height:1.2;margin-top:2mm}.ruler:before,.ruler:after{content:'';position:absolute;bottom:-2mm;height:4mm;border-left:1pt solid #222}.ruler:before{left:0}.ruler:after{right:0}button{padding:8px;margin:8px 0}@media print{.controls{display:none}}</style></head><body><div class="controls"><button onclick="window.print()">Print / Save as PDF</button><p>Print at 100% / Actual size. Disable printer Fit-to-page and browser headers/footers. Check the 100 mm ruler after printing.</p></div><h1>${esc(project.name)}</h1><p class="meta">${esc(project.layout.name)} · ${esc(formatAreaM2(total,units))} · ${layout.scale==='fit'?'Fit page · ':''}1:${layout.denominator.toFixed(2)} · ${esc(name)}</p><div class="drawing">${svg}</div><p class="legend">Rooms: ${project.geometry.rooms.length} · Furniture: ${project.furniture.length} · Dashed arcs: door swings · Red sectors: ${conflicts} potential door conflicts · Areas use net room dimensions.${project.geometry.floorSlabs?' Footprint area (includes walls): '+esc(formatAreaM2(project.geometry.floorSlabs.reduce((sum,r)=>sum+(r[2]-r[0])*(r[3]-r[1])/1e6,0),units))+'.':''}</p><div class="ruler">Calibration ruler: 100 mm (3.937 in)</div></body></html>`;
}
