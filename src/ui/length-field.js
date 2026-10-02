import {defaultLengthUnit,formatLengthMm,formatEditLengthMm,readLengthDraft} from '../core/units.js';
import {esc} from './dom.js';
import {tr} from './i18n.js';
export function lengthField(id,label,mm,display){
 const value=mm===undefined?'':display==='imperial'?formatLengthMm(mm,display).replace(/^≈ /,''):formatEditLengthMm(mm,display);
 return `<label>${label} (${defaultLengthUnit(display)})<input type="text" id="${id}" name="${id}" data-length autocomplete="off" placeholder="${display==='imperial'?esc(`12' 6" / 150 in`):'800 mm / 80 cm'}" aria-describedby="${id}-feedback" value="${esc(value)}">${display==='imperial'?`<small class="length-example">${tr('支持 12\' 6" 或 150 in。显示近似值，未改字段保留原精度。','Enter 12\' 6" or 150 in. Display is approximate; unchanged fields keep exact stored values.')}</small>`:''}<small id="${id}-feedback" class="length-feedback" aria-live="polite"></small></label>`;
}
export function bindLengthField(input,mm,display,limits=()=>[-Infinity,Infinity]){
 const original=input.value,feedback=document.getElementById(input.id+'-feedback');
 function guidance(){
  const [min,max]=limits();
  const example=display==='imperial'?`12' 6" / 30 1/2 in / 800 mm`:'800 mm / 80 cm / 0.8 m';
  const range=`${Number.isFinite(min)?formatLengthMm(min,display):'−∞'} … ${Number.isFinite(max)?formatLengthMm(max,display):'∞'}`;
  return tr('示例：','Examples: ')+example+' · '+tr('范围：','Range: ')+range;
 }
 function reject(message){input.setAttribute('aria-invalid','true');feedback.textContent=message+' '+guidance();}
 function read(){
  const result=readLengthDraft(input.value,original,mm,display),[min,max]=limits();
  const valid=result.ok&&result.mm>=min&&result.mm<=max;
  feedback.textContent=valid?formatLengthMm(result.mm,display):
   (result.code==='inches-overflow'?tr('组合英寸须小于 12；5\'12" 请改为 6 ft 或 72 in。','Combined inches must be below 12; use 6 ft or 72 in for 5\'12". '):tr('请输入有效长度。','Enter a valid length. '))+guidance();
  input.setAttribute('aria-invalid',String(!valid));
  return valid?result:{ok:false,code:'invalid-field'};
 }
 input.addEventListener('input',read);read();
 return {read,reject,reset(){input.value=original;read();}};
}
