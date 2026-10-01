const PX_MM = 25.4 / 96;                       // 1 CSS px = 0.2646 mm
const COARSE = matchMedia('(pointer:coarse)').matches;   // iPad / 手机等触屏为主的设备
const TAP = COARSE ? 9 : 4;                    // 手指按下后移动超过该像素才算拖动
const narrow = () => matchMedia('(max-width:1223px)').matches;
const paneOverlay = k => matchMedia(k === 'lib' ? '(max-width:899px)' : '(max-width:1223px)').matches;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));


export {$,COARSE,TAP,narrow,paneOverlay,PX_MM,esc};
