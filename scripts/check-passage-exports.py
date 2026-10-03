"""Read-only T06 audit using external Shapely and PyMuPDF, independent of JS geometry."""
import json
import math
import sys
from pathlib import Path
import pymupdf
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/verification/T06-clearance')
browser = json.loads((out / 'browser-results.json').read_text())
assert browser['passed']
results = []
for case in browser['results']:
    folder = out / case['name']
    project = json.loads((folder / 'complete-project.json').read_text())
    g, route = project['geometry'], case['configured']
    assert route['status'] == 'route-found' and route['targetMm'] == project['clearance']['targetMm']
    opening_polys = [box(*o['rect']) for o in g['doors'] + g['slides'] + [o for o in g['lintels'] if o.get('passage')] + g.get('passages', [])]
    floor = unary_union([Polygon(r['poly']) for r in g['rooms']] + opening_polys)
    trace = LineString(route['path']) if len(route['path']) > 1 else Point(route['path'][0])
    radius = route['targetMm'] / 2
    assert floor.covers(trace)
    edge_distance = trace.distance(floor.boundary)
    assert edge_distance >= radius - 1e-5, (case['name'], 'floor', edge_distance, radius)
    obstacles = [box(*w[:4]) for i, w in enumerate(g['walls']) if 'w' + str(i) not in project['demolished']]
    obstacles += [Polygon(w['poly']) for w in g.get('diagonalWalls', [])] + [box(*o['rect']) for o in g.get('obstacles', [])]
    for f in project['furniture']:
        mode = f.get('clearance', {}).get('mode')
        if mode == 'ground' or (mode != 'solid' and f['type'] == 'rug'):
            continue
        a = math.radians(f['rot'])
        obstacles.append(Polygon([(f['cx'] + x * f['w']/2 * math.cos(a) - y * f['d']/2 * math.sin(a),
                                   f['cy'] + x * f['w']/2 * math.sin(a) + y * f['d']/2 * math.cos(a))
                                  for x,y in [(-1,-1),(1,-1),(1,1),(-1,1)]]))
    for d in g['doors']:
        if route['doorState'] == 'closed':
            obstacles.append(box(*d['rect']))
        else:
            h = d['h']; end = [h[i]+d['o'][i]*d['len'] for i in range(2)]; half=min(20,d['len']*.1);n=[v*half for v in d['c']]
            obstacles.append(Polygon([[h[i]-n[i] for i in range(2)], [end[i]-n[i] for i in range(2)],
                                      [end[i]+n[i] for i in range(2)], [h[i]+n[i] for i in range(2)]]))
    obstacles += [box(*d['rect']) for d in g['slides'] if route['doorState'] == 'closed' or d.get('style') == 'bifold']
    obstacle_distance = min(trace.distance(o) for o in obstacles)
    assert obstacle_distance >= radius - 1e-5, (case['name'], 'solid', obstacle_distance, radius)
    pdf = pymupdf.open(folder / 'print.pdf')
    assert len(pdf) == 1
    page = pdf[0]
    assert abs(page.rect.width - 1191.12) < 1 and abs(page.rect.height - 841.92) < 1
    text = ' '.join(page.get_text().split())
    for expected in ['Passage target:', 'route-found', 'Bifold stack dimensions unknown', f"Rooms: {len(g['rooms'])}", f"Furniture: {len(project['furniture'])}"]:
        assert expected in text, (case['name'], expected)
    captions = page.search_for('Calibration ruler: 100 mm');assert len(captions) == 1
    lines = [d['rect'].width for d in page.get_drawings() if 0 < d['rect'].height <= 1 and captions[0].y1 <= d['rect'].y0 <= captions[0].y1+10 and abs(d['rect'].x0-captions[0].x0)<1 and 200<d['rect'].width<350]
    assert len(lines)==1 and abs(lines[0] - 100*72/25.4) < 1
    assert all(b[3] < page.rect.height - 10 for b in page.get_text('blocks'))
    page.get_pixmap(matrix=pymupdf.Matrix(1.2,1.2)).save(folder / 'print-render.png')
    results.append(dict(name=case['name'],continuousPathFloorDistanceMm=edge_distance,
                        continuousPathSolidDistanceMm=obstacle_distance,targetRadiusMm=radius,
                        pdfPages=len(pdf),rulerLengthPt=lines[0],physicalPrinterTested=False))
    pdf.close()
assert len(results)==3
(out / 'independent-results.json').write_text(json.dumps(dict(passed=True,library='Shapely + PyMuPDF',cases=results),indent=2)+'\n')
print(json.dumps(results,indent=2))
