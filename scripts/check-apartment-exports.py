"""Read-only QA of application print exports; requires PyMuPDF outside the app."""
from pathlib import Path
import hashlib
import json
import sys
import pymupdf

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/verification/NA-apartment-composition')
results = []
cases = [
    ('complete', out / 'complete-project.json', (1191.12, 841.92)),
    ('compact-bedroom', Path('docs/verification/NA-fixed-obstacles/bedroom-two-project.json'), (792, 612)),
]
for prefix, project_file, page_size in cases:
    file = out / f'{prefix}-print.pdf'
    project = json.loads(project_file.read_text())
    doc = pymupdf.open(file)
    assert len(doc) == 1, f'{prefix}: expected one page'
    page = doc[0]
    assert all(abs(a - b) < 1 for a, b in zip((page.rect.width, page.rect.height), page_size))
    text = ' '.join(page.get_text().split())
    assert 'exclude fixed footprints' in text
    assert f"Rooms: {len(project['geometry']['rooms'])}" in text
    assert f"Furniture: {len(project['furniture'])}" in text
    assert f"Fixed obstacles: {len(project['geometry']['obstacles'])}" in text
    net = 0
    for room in project['geometry']['rooms']:
        polygon = room['poly']
        area = room.get('usableAreaM2', abs(sum(a[0] * polygon[(i + 1) % len(polygon)][1]
                   - polygon[(i + 1) % len(polygon)][0] * a[1]
                   for i, a in enumerate(polygon))) / 2e6) / .3048 ** 2
        net += area
        assert f'{area:.2f}' in text
        assert project['rooms'][room['id']]['name'] in text
    assert f'{net:.2f}' in text
    # Chromium renders the CSS ruler border as a thin filled rectangle.
    candidates = [d['rect'].width for d in page.get_drawings()
                  if 0 < d['rect'].height <= 1 and d['rect'].y0 > page.rect.height * .8
                  and 200 < d['rect'].width < 350]
    ruler = min(candidates, key=lambda width: abs(width - 100 * 72 / 25.4))
    assert abs(ruler - 100 * 72 / 25.4) < 1
    if prefix == 'complete':
        footprint = sum((r[2] - r[0]) * (r[3] - r[1])
                        for r in project['geometry']['floorSlabs']) / 304.8 ** 2
        assert f'{footprint:.2f}' in text and 'includes walls' in text
    else:
        assert 'Twin XL · mattress footprint' in text
    page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6)).save(out / f'{prefix}-print-render.png')
    results.append(dict(case=prefix, pages=len(doc), widthPt=page.rect.width,
                        heightPt=page.rect.height, usableSqFt=net, rulerLengthPt=ruler,
                        sha256=hashlib.sha256(file.read_bytes()).hexdigest(),
                        physicalPrinterTested=False))
    doc.close()
(out / 'pdf-results.json').write_text(json.dumps(dict(passed=True, results=results), indent=2) + '\n')
print(json.dumps(results, indent=2))
