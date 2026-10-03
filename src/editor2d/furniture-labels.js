const noLabel=new Set(['plant','floorlamp','sidetable','barstool','beanbag']);
const textWidth=(text,size)=>[...text].reduce((sum,c)=>sum+(/\s|·/.test(c)?.35:/[\u0000-\u007f]/.test(c)?.62:1)*size,0);
/** Compact upright labels; canonical names stay intact. Native glyph bounds are fitted by the renderer. */
export function furnitureLabel(f,name){
 if(Math.min(f.w,f.d)<380||noLabel.has(f.type))return null;
 const font=Math.max(80,Math.min(140,Math.min(f.w,f.d)*.2)),angle=f.rot*Math.PI/180;
 const available=Math.min(f.w,f.d)*.86/(Math.abs(Math.cos(angle))+Math.abs(Math.sin(angle)));
 const words=String(name).trim().split(/\s+/),lines=[];let line='';
 for(const word of words){
  if(textWidth(line+(line?' ':'')+word,font)<=available){line+=(line?' ':'')+word;continue;}
  if(line){lines.push(line);line='';}
  if(lines.length===3)break;
  if(textWidth(word,font)>available){
   let prefix='';for(const char of word){if(textWidth(prefix+char+'…',font)>available)break;prefix+=char;}
   line=prefix+'…';
  }else line=word;
 }
 if(line&&lines.length<3)lines.push(line);
 if(!lines.length)lines.push('…');
 const displayed=lines.join(' '),full=String(name).trim().replace(/\s+/g,' ');
 if(displayed!==full&&!lines.at(-1).endsWith('…')){
  let last=lines.at(-1);while(last&&textWidth(last+'…',font)>available)last=[...last].slice(0,-1).join('');lines[lines.length-1]=last+'…';
 }
 const width=Math.max(...lines.map(line=>textWidth(line,font))),height=font*(lines.length*1.2+.2);
 return {name:String(name),lines,font,rect:[f.cx-width/2-40,f.cy-height/2-40,f.cx+width/2+40,f.cy+height/2+40]};
}
