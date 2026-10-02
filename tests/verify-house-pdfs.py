# Optional QA dependency: PyMuPDF. Does not change application dependencies.
import pymupdf as f,json,hashlib
from pathlib import Path
root=Path('docs/verification/NA-complete-houses');out=[]
for id in ['plan-b','plan-a','plan-c','plan-f']:
 p=root/id/'complete-print.pdf';doc=f.open(p);assert len(doc)==1,(id,len(doc));page=doc[0];text=page.get_text();assert 'Footprint area' in text and 'Calibration ruler' in text
 # Chromium rounds CSS page dimensions to pixels (1 CSS pixel = .75 pt).
 assert abs(page.rect.width-420/25.4*72)<.75 and abs(page.rect.height-297/25.4*72)<.75
 page.get_pixmap(matrix=f.Matrix(1.7,1.7),alpha=False).save(str(root/id/'complete-print-render.png'));rulers=[]
 for d in page.get_drawings():
  rect=d['rect']
  if rect.height<2 and abs(rect.width-100/25.4*72)<.1 and rect.y0>page.rect.height*.8:rulers.append(rect.width)
 assert rulers,id+' missing ruler'
 out.append(dict(plan=id,pages=len(doc),paper='A3 landscape',widthPt=page.rect.width,heightPt=page.rect.height,rulerLengthPt=rulers[0],sha256=hashlib.sha256(p.read_bytes()).hexdigest(),passed=True))
(root/'pdf-results.json').write_text(json.dumps(dict(passed=True,files=out,physicalPrinterTested=False),indent=2)+'\n');print('4 one-page A3 PDFs; 100 mm vector rulers verified')
