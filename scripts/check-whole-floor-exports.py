"""Read-only PDF QA for reusable whole-floor scenarios. External PyMuPDF only."""
from pathlib import Path
import hashlib
import json
import sys
import pymupdf

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/verification/NA-whole-floor-reuse')
results = []
for directory in sorted(p for p in out.iterdir() if p.is_dir() and (p / 'browser-results.json').exists() and (p / 'complete-project.json').exists() and (p / 'complete-print.pdf').exists()):
    browser = json.loads((directory / 'browser-results.json').read_text())
    assert browser['passed'] and browser['sourceWholePlanAccepted'] is False
    spec = json.loads(Path('tests/fixtures/north-american', browser['fixture'] + '.json').read_text())
    project = json.loads((directory / 'complete-project.json').read_text())
    pdf = directory / 'complete-print.pdf'
    doc = pymupdf.open(pdf)
    assert len(doc) == 1
    page = doc[0]
    assert abs(page.rect.width - 1191.12) < 1 and abs(page.rect.height - 841.92) < 1
    text = ' '.join(page.get_text().split())
    assert spec['name'] in text
    assert f"Rooms: {len(spec['rooms'])}" in text
    assert f"Furniture: {len(spec['furniture'])}" in text
    assert '0 potential floor/boundary conflicts' in text
    total = 0
    for room in spec['rooms']:
        notch = room.get('notch')
        cut = (notch['width'] * notch['depth'] * (.5 if notch.get('shape') == 'diagonal' else 1)) if notch else 0
        fixed = sum(o['width'] * o['depth'] for o in room.get('obstacles', []))
        net = room['width'] * room['depth'] - cut - fixed
        total += net
        assert room['name'] in text and f'{net:.2f}' in text
    assert f'{total:.2f}' in text
    assert f"{browser['audit']['scenarioFootprintSqFt']:.2f}" in text and 'includes walls' in text
    captions = page.search_for('Calibration ruler: 100 mm')
    assert len(captions) == 1
    candidates = [d['rect'].width for d in page.get_drawings()
                  if 0 < d['rect'].height <= 1
                  and captions[0].y1 <= d['rect'].y0 <= captions[0].y1 + 10
                  and abs(d['rect'].x0 - captions[0].x0) < 1
                  and 200 < d['rect'].width < 350]
    assert len(candidates) == 1
    ruler = candidates[0]
    assert abs(ruler - 100 * 72 / 25.4) < 1
    page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6)).save(directory / 'print-render.png')
    results.append(dict(id=browser['fixture'],build=browser['build'],pages=len(doc),widthPt=page.rect.width,
                        heightPt=page.rect.height,netSqFt=total,rulerLengthPt=ruler,
                        sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),
                        sourceWholePlanAccepted=False,physicalPrinterTested=False))
    doc.close()
assert len(results) >= 2
(out / 'pdf-results.json').write_text(json.dumps(dict(passed=True,cases=results),indent=2)+'\n')
print(json.dumps(results,indent=2))
