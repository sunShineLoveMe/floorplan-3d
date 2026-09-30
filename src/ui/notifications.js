import {$} from '../ui/dom.js';
export function createNotifications(){
let toastT;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }


return {toast,dispose(){clearTimeout(toastT);$("#toast").classList.remove("show");}};
}
