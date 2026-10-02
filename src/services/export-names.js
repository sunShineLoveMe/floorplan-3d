export function exportName(project,kind,extension,now=new Date()){
 const clean=v=>String(v||'Plan').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').replace(/[. ]+$/,'').slice(0,80)||'Plan';
 const two=v=>String(v).padStart(2,'0'),date=now.getFullYear()+'-'+two(now.getMonth()+1)+'-'+two(now.getDate()),time=[now.getHours(),now.getMinutes(),now.getSeconds()].map(two).join('');
 return `${clean(project.name)}-${clean(project.layout.name)}-${date}-${time}-${kind}.${extension}`;
}
