/** All model lengths remain millimetres. This module has no UI dependencies. */
export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;
export const M2_PER_SQFT = 0.09290304;
export const unitStepMm = (display, coarse=false) => display==='imperial' ? (coarse?25.4:6.35) : (coarse?100:10);
export const gridSizeMm = display => display==='imperial'?304.8:1000;
export const defaultLengthUnit = display => display==='imperial'?'in':'mm';
const decimals = /^\d+(?:\.\d+)?$|^\.\d+$/;
const denominators = [2,4,8,16,32,64];
function amount(s, fractions){
  if(decimals.test(s)) return Number(s);
  if(!fractions)return NaN;
  const m=s.match(/^(?:(\d+)[ -])?(\d+)\/(\d+)$/);
  if(!m)return NaN;
  const [,whole,n,d]=m;
  return denominators.includes(+d)&&+n>0&&+n<+d ? +(whole||0)+n/d : NaN;
}
export function parseLengthMm(input, display='metric'){
  const fail=(code='syntax')=>({ok:false,code});
  if(typeof input!=='string')return fail();
  const fractions={'½':'1/2','¼':'1/4','¾':'3/4','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'};
  let s=input.replace(/[½¼¾⅛⅜⅝⅞]/g,c=>' '+fractions[c]).replace(/[‘’′]/g,"'").replace(/[“”″]/g,'"').replace(/\u00a0/g,' ').trim().toLowerCase().replace(/\s+/g,' ');
  let sign=1;
  if(s.startsWith('-')){sign=-1;s=s.slice(1).trim();}
  if(!s)return fail();
  let value;
  const combo=s.match(/^(\d+)\s*(?:'|ft|foot|feet)\s*-?\s*(.+?)\s*(?:"|in|inch|inches)$/);
  if(combo){const inch=amount(combo[2],true);if(!Number.isFinite(inch))return fail();if(inch>=12)return fail('inches-overflow');value=(+combo[1]*12+inch)*MM_PER_INCH;}
  else {
    const m=s.match(/^(.*?)\s*(mm|cm|m|inches|inch|in|feet|foot|ft|'|")$/);
    const unit=m?m[2]:defaultLengthUnit(display),raw=m?m[1]:s;
    const imperial=['in','inch','inches','ft','foot','feet',"'",'"'].includes(unit);
    const n=amount(raw,imperial);
    if(!Number.isFinite(n))return fail();
    value=n*({mm:1,cm:10,m:1000,in:25.4,inch:25.4,inches:25.4,ft:304.8,foot:304.8,feet:304.8,"'":304.8,'"':25.4}[unit]);
  }
  if(!Number.isFinite(value))return fail();
  return {ok:true,mm:value===0?0:sign*value};
}
const clean=(n,d)=>String(Number(n.toFixed(d)));
const gcd=(a,b)=>b?gcd(b,a%b):a;
function fraction(ticks,denom){const whole=Math.floor(ticks/denom),n=ticks%denom,d=gcd(n,denom);return (whole||!n?String(whole):'')+(n?(whole?' ':'')+n/d+'/'+denom/d:'');}
export function formatLengthMm(mm,display='metric',{style='feet'}={}){
  if(display!=='imperial'){const v=Math.round(mm*1000)/1000;return (Math.abs(v-mm)>1e-8?'≈ ':'')+(mm!==0&&v===0?(mm<0?'−':'')+'<0.001':clean(v,3))+' mm';}
  const abs=Math.abs(mm),ticks=Math.round(abs/25.4*16),sign=mm<0?'-':'';
  if(abs>0&&ticks===0)return sign+'<1/16 in';
  const approx=Math.abs(ticks/16*25.4-abs)>1e-7?'≈ ':'';
  if(style==='inches')return approx+sign+fraction(ticks,16)+' in';
  const feet=Math.floor(ticks/192),rest=ticks%192;
  return approx+sign+feet+"' "+fraction(rest,16)+'"';
}
export function formatAreaM2(m2,display='metric'){
  const v=display==='imperial'?m2/M2_PER_SQFT:m2,unit=display==='imperial'?'sq ft':'m²';
  return (v>0&&v<.01?'<0.01':(Object.is(v,-0)?0:v).toFixed(2))+' '+unit;
}
export function formatEditLengthMm(mm,display='metric'){
  if(display!=='imperial')return clean(mm,6);
  const inches=Math.abs(mm)/25.4,ticks=Math.round(inches*64),sign=mm<0?'-':'';
  if(Math.abs(ticks/64*25.4-Math.abs(mm))<1e-9)return sign+fraction(ticks,64);
  return sign+clean(inches,8);
}
/** Unchanged text must retain the original float, even beyond editing precision. */
export function readLengthDraft(text,originalText,originalMm,display){
  if(text===originalText)return {ok:true,mm:originalMm};
  const result=parseLengthMm(text,display);
  // Equivalent unit expressions can differ by a few binary floating-point ULPs.
  // This is far below the editing precision; it is not a geometry tolerance.
  if(result.ok&&Math.abs(result.mm-originalMm)<=Number.EPSILON*Math.max(1,Math.abs(originalMm))*4)return {ok:true,mm:originalMm};
  return result;
}
