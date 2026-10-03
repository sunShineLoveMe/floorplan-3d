"""Read-only acceptance of browser exports. Requires PyMuPDF; no application dependency."""
from pathlib import Path
import hashlib
import json
import sys
import pymupdf

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/verification/NA-fixed-obstacles')
results = []
for prefix in ['studio', 'bedroom-two']:
    file = out / f'{prefix}-print.pdf'
    doc = pymupdf.open(file)
    assert len(doc) == 1, f'{prefix}: expected one page'
    page = doc[0]
    assert abs(page.rect.width - 792) < 1 and abs(page.rect.height - 612) < 1
    text = ' '.join(page.get_text().split())
    assert 'Fixed obstacles:' in text and 'exclude fixed footprints' in text
    # Chromium draws the CSS bottom border as a filled rectangle, not a line.
    candidates = [d['rect'].width for d in page.get_drawings()
                  if 0 < d['rect'].height <= 1 and d['rect'].y0 > page.rect.height * .8
                  and 200 < d['rect'].width < 350]
    ruler = min(candidates, key=lambda width: abs(width - 100 * 72 / 25.4))
    assert abs(ruler - 100 * 72 / 25.4) < 1, f'{prefix}: incorrect ruler'
    project = json.loads((out / f'{prefix}-project.json').read_text())
    net = project['geometry']['rooms'][0]['usableAreaM2'] / .3048 ** 2
    assert f'{net:.2f}' in text and f"Fixed obstacles: {len(project['geometry']['obstacles'])}" in text
    page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6)).save(out / f'{prefix}-print-render.png')
    results.append(dict(case=prefix, pages=len(doc), widthPt=page.rect.width,
                        heightPt=page.rect.height, rulerLengthPt=ruler, usableSqFt=net,
                        obstacles=len(project['geometry']['obstacles']),
                        sha256=hashlib.sha256(file.read_bytes()).hexdigest(),
                        physicalPrinterTested=False))
    doc.close()
(out / 'pdf-results.json').write_text(json.dumps(dict(passed=True, results=results), indent=2) + '\n')
print(json.dumps(results, indent=2))
