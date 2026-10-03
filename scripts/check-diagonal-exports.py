"""Read-only QA of application exports; uses external PyMuPDF, not an app dependency."""
import hashlib
import json
from pathlib import Path
import sys
import pymupdf

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/verification/NA-diagonal-cuts')
specs = json.loads(Path('tests/fixtures/north-american/diagonal-layouts.json').read_text())['cases']
results = []
area = lambda poly: abs(sum(a[0] * poly[(i + 1) % len(poly)][1]
                           - poly[(i + 1) % len(poly)][0] * a[1]
                           for i, a in enumerate(poly))) / 2e6
for spec in specs:
    directory = out / spec['id']
    project = json.loads((directory / 'project.json').read_text())
    assert [f['type'] for f in project['furniture']] == [f['type'] for f in spec['furniture']]
    pdf = directory / 'print.pdf'
    doc = pymupdf.open(pdf)
    assert len(doc) == 1
    page = doc[0]
    assert abs(page.rect.width - 792) < 1 and abs(page.rect.height - 612) < 1
    text = ' '.join(page.get_text().split())
    assert spec['name'] in text
    total = 0
    for room in spec['rooms']:
        notch = room.get('notch')
        cut = notch['width'] * notch['depth'] / 2 if notch else 0
        fixed = sum(o['width'] * o['depth'] for o in room.get('obstacles', []))
        net = (room['width'] * room['depth'] - cut - fixed) / 1e6
        total += net
        assert room['name'] in text and f'{net / .3048 ** 2:.2f}' in text
    footprint = sum(area(p) for p in project['geometry']['floorPolygons'])
    diagonal_walls = len({w['id'] for w in project['geometry']['diagonalWalls']})
    assert f'{total / .3048 ** 2:.2f}' in text
    assert f'{footprint / .3048 ** 2:.2f}' in text and 'includes walls' in text
    assert f"Rooms: {len(spec['rooms'])}" in text
    assert f"Furniture: {len(spec['furniture'])}" in text
    assert f'Diagonal walls: {diagonal_walls}' in text
    assert '0 potential floor/boundary conflicts' in text
    candidates = [d['rect'].width for d in page.get_drawings()
                  if 0 < d['rect'].height <= 1 and d['rect'].y0 > page.rect.height * .8
                  and 200 < d['rect'].width < 350]
    ruler = min(candidates, key=lambda width: abs(width - 100 * 72 / 25.4))
    assert abs(ruler - 100 * 72 / 25.4) < 1
    page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6)).save(directory / 'print-render.png')
    results.append(dict(id=spec['id'],pages=len(doc),widthPt=page.rect.width,
                        heightPt=page.rect.height,netM2=total,footprintM2=footprint,
                        diagonalWalls=diagonal_walls,rulerLengthPt=ruler,
                        sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),
                        sourceWholePlanAccepted=False,physicalPrinterTested=False))
    doc.close()
print(json.dumps(results,indent=2))

# Recheck the same floor-warning legend on existing rectangular/concave projects.
legacy = [
    ('plan-f-correction', out / 'plan-f-correction/project.json',
     out / 'plan-f-correction/print.pdf', (1191.12, 841.92)),
    ('cmu-regression', out / 'cmu-regression/complete-project.json',
     out / 'cmu-regression/complete-print.pdf', (1191.12, 841.92)),
    ('label-regression', Path('docs/verification/NA-fixed-obstacles/bedroom-two-project.json'),
     out / 'label-regression/compact-bedroom-print.pdf', (792, 612)),
]
legacy_results = []
for name, project_file, pdf, size in legacy:
    project = json.loads(project_file.read_text())
    doc = pymupdf.open(pdf)
    assert len(doc) == 1
    page = doc[0]
    assert all(abs(a - b) < 1 for a, b in zip((page.rect.width, page.rect.height), size))
    text = ' '.join(page.get_text().split())
    assert '0 potential floor/boundary conflicts' in text
    assert f"Rooms: {len(project['geometry']['rooms'])}" in text
    assert f"Furniture: {len(project['furniture'])}" in text
    net = 0
    for room in project['geometry']['rooms']:
        net += room.get('usableAreaM2', area(room['poly']))
        assert project['rooms'][room['id']]['name'] in text
    assert f'{net / .3048 ** 2:.2f}' in text
    candidates = [d['rect'].width for d in page.get_drawings()
                  if 0 < d['rect'].height <= 1 and d['rect'].y0 > page.rect.height * .8
                  and 200 < d['rect'].width < 350]
    ruler = min(candidates, key=lambda width: abs(width - 100 * 72 / 25.4))
    assert abs(ruler - 100 * 72 / 25.4) < 1
    page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6)).save(pdf.parent / 'regression-print-render.png')
    legacy_results.append(dict(id=name,pages=len(doc),widthPt=page.rect.width,
                               heightPt=page.rect.height,netM2=net,
                               rulerLengthPt=ruler,sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),
                               physicalPrinterTested=False))
    doc.close()
(out / 'pdf-results.json').write_text(json.dumps(dict(passed=True,cases=results,
                                                       legacyRegressions=legacy_results),indent=2)+'\n')
print(json.dumps(legacy_results,indent=2))
