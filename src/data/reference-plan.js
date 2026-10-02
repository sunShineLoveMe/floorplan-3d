/** Calibrated raster reference. The first calibration point is the model origin. */
export function calibrateReference(image,a,b,distance){
 const pixels=Math.hypot(b.x-a.x,b.y-a.y);
 if(!Number.isFinite(distance)||distance<=0||pixels<2)throw Error('Choose two distinct points and enter a positive distance.');
 const scale=distance/pixels;
 return {...image,mmPerPixel:scale,x:-a.x*scale,y:-a.y*scale,visible:true,opacity:.6};
}
export function validateReference(r){
 const valid=r&&typeof r.name==='string'&&r.name.length<=500&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(r.src)&&r.src.length<=4*1024*1024
 &&['pixelWidth','pixelHeight','mmPerPixel'].every(k=>Number.isFinite(r[k])&&r[k]>0)&&r.pixelWidth<=3000&&r.pixelHeight<=3000
 &&['x','y','opacity'].every(k=>Number.isFinite(r[k]))&&Math.abs(r.x)<=1e7&&Math.abs(r.y)<=1e7&&r.opacity>=0&&r.opacity<=1&&typeof r.visible==='boolean';
 if(!valid){const e=Error('referencePlan');e.code='INVALID_PROJECT';throw e;}
 return r;
}
