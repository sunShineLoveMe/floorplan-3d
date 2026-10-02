import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
async function files(dir){const entries=await readdir(path.join(root,dir),{withFileTypes:true});const groups=await Promise.all(entries.map(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]));return groups.flat().sort();}
const assets=(await Promise.all(['src','styles','vendor'].map(files))).flat().filter(f=>/\.(js|mjs|css)$/.test(f)).sort();
let html=await readFile(path.join(root,'index.html'),'utf8');
const original=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
const imports=Object.fromEntries(Object.entries(original.imports).filter(([key])=>!key.startsWith('./')));
const normalized=html.replace(/\?v=[a-f0-9]+/g,'').replace(/ data-build="[a-f0-9]+"/g,'').replace(/<script type="importmap">[\s\S]*?<\/script>/,JSON.stringify(imports));
const hash=createHash('sha256').update(normalized);for(const asset of assets)hash.update(asset).update(await readFile(path.join(root,asset)));
const version=hash.digest('hex').slice(0,16);
// Import maps resolve relative specifiers to the same version, including lazy imports.
for(const asset of assets.filter(f=>/\.(js|mjs)$/.test(f)))imports['./'+asset]='./'+asset+'?v='+version;
html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">\n'+JSON.stringify({imports},null,2)+'\n</script>');
html=html.replace(/((?:href|src)="(?:styles\/[^"?]+\.css|src\/main\.js))(?:\?v=[a-f0-9]+)?"/g,'$1?v='+version+'"');
html=html.replace(/<html([^>]*)>/,(_,attributes)=>'<html'+attributes.replace(/ data-build="[^"]*"/,'')+' data-build="'+version+'">');
await writeFile(path.join(root,'index.html'),html);console.log('Asset version: '+version);
