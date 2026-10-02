// Optional artifact verification; pdf-lib is a development tool, not an app dependency.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
const {PDFDocument}=createRequire(import.meta.url)(process.env.PDF_LIB_MODULE||'pdf-lib');
const pdf=await PDFDocument.load(readFileSync('docs/verification/NA-fixes/NA-012-print-100.pdf')),page=pdf.getPage(0),streams=page.node.Contents();
const content=(streams.asArray?streams.asArray():[streams]).map(ref=>inflateSync(pdf.context.lookup(ref).getContents()).toString()).join('\n');
const rootScale=Number(content.match(/^([.\d]+) 0 0 -[.\d]+ /)[1]);
const modelScale=content.split('\n').map(line=>line.match(/^([.\d]+) 0 0 ([.\d]+) [^\n]+ cm$/)).filter(Boolean).map(m=>[Number(m[1]),Number(m[2])]).find(([x,y])=>x===y&&x<.5)[0];
const ruler=content.match(/0 (\d+) (\d+) 1 re\nf\nBT/),size=page.getSize();
const report={pages:pdf.getPageCount(),paperPoints:size,scale:100,measured40ftOnPaperMm:12192*rootScale*modelScale*25.4/72,expected40ftOnPaperMm:121.92,rulerOnPaperMm:Number(ruler[2])*3.125*rootScale*25.4/72};
if(report.pages!==1||size.width!==792||size.height!==612||Math.abs(report.measured40ftOnPaperMm-121.92)>.02||Math.abs(report.rulerOnPaperMm-100)>.02)throw Error(JSON.stringify(report));
writeFileSync('docs/verification/NA-fixes/NA-012-pdf-check.json',JSON.stringify(report,null,2));console.log(report);
