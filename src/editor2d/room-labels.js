import {furnitureLabel} from './furniture-labels.js';
import {bbox,aabb} from '../core/geometry.js';
const textWidth=(text,size)=>[...text].reduce((sum,c)=>sum+(/[\u0000-\u007f]/.test(c)?.62:1)*size,0);
const intersects=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
function contains(poly,x,y){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function placeRoomLabels(project,nameOf,areaOf){
 const used=[],furniture=project.view.layers.furn?project.furniture:[];
 const structural=(project.geometry.obstacles||[]).map(o=>o.rect);
 const footprints=furniture.map(f=>{const {hw,hh}=aabb(f);return [f.cx-hw-50,f.cy-hh-50,f.cx+hw+50,f.cy+hh+50];});
 const furnitureNames=furniture.flatMap(f=>{const label=furnitureLabel(f,nameOf(f.name));return label?[label.rect]:[];});
 return project.geometry.rooms.filter(r=>r.at&&!project.rooms[r.id].labelHidden).map(r=>{
  const b=bbox(r.poly),name=nameOf(project.rooms[r.id].name),area=areaOf(r.poly,r),font=Math.max(20,Math.min(250,(b[2]-b[0])*.8/(textWidth(name,1)||1),(b[3]-b[1])*.2)),small=font*.7,width=Math.max(textWidth(name,font),textWidth(area,small))+80,height=font*1.9;
  const candidates=[];for(let j=0;j<13;j++)for(let i=0;i<13;i++)candidates.push([b[0]+width/2+20+((b[2]-b[0])-width-40)*i/12,b[1]+font+20+((b[3]-b[1])-height-40)*j/12]);
  candidates.unshift(r.at);candidates.sort((a,c)=>Math.hypot(a[0]-r.at[0],a[1]-r.at[1])-Math.hypot(c[0]-r.at[0],c[1]-r.at[1]));
  const rectangle=([x,y])=>[x-width/2,y-font,x+width/2,y+font*.9];
  const fits=(position,obstacles)=>{const rect=rectangle(position);return [[rect[0],rect[1]],[rect[2],rect[1]],[rect[0],rect[3]],[rect[2],rect[3]]].every(([x,y])=>contains(r.poly,x,y))&&![...obstacles,...used].some(other=>intersects(rect,other));};
  const position=candidates.find(c=>fits(c,[...footprints,...structural]))||candidates.find(c=>fits(c,[...furnitureNames,...structural]))||r.at;
  const rect=rectangle(position);used.push(rect);return {id:r.id,name,area,font,small,x:position[0],y:position[1],rect};
 });
}
