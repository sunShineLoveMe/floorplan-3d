"""Decode actual T09 downloads and inspect the SVG consumed by rasterization."""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image, ImageChops

root = Path(sys.argv[1])
checks = []
for name in ['jacobsen-2d', 'cmu-2d', 'plan-f-2d', 'tall-2d',
             'jacobsen-3d', 'cmu-3d', 'plan-f-3d', 'label-on', 'label-off',
             'context-loss-2d', 'encoding-retry', 'mobile-2d']:
    with Image.open(root / (name + '.png')) as im:
        im.load()
        w, h = im.size
        assert 1 <= w <= 4800 and 1 <= h <= 4800 and w * h <= 12000000
        assert max(w, h) >= 3000
        assert all(hi - lo > 80 for lo, hi in im.convert('RGB').getextrema())
        assert im.convert('RGBA').getextrema()[3] == (255, 255)
        if name.endswith('-2d'):
            svg = ET.parse(root / (name + '.svg')).getroot()
            assert (w, h) == (int(svg.get('width')), int(svg.get('height')))
        checks.append({'file': name + '.png', 'width': w, 'height': h, 'passed': True})

svg = ET.parse(root / 'tall-2d.svg').getroot()
x, y, w, h = map(float, svg.get('viewBox').split())
for b in json.loads((root / 'tall-content-bounds.json').read_text()):
    if not b['w'] and not b['h']:
        continue
    assert x < b['x'] and y < b['y']
    assert x + w > b['x'] + b['w'] and y + h > b['y'] + b['h'], b
assert h > w * 5, 'Tall-room output must retain portrait aspect'
checks.append({'file': 'tall-2d.svg', 'allVisibleGlyphBoundsIncluded': True, 'passed': True})

with Image.open(root / 'label-on.png') as on, Image.open(root / 'label-off.png') as off:
    assert on.size == off.size
    diff = ImageChops.difference(on.convert('RGB'), off.convert('RGB'))
    box = diff.getbbox()
    assert box
    assert (box[2] - box[0]) * (box[3] - box[1]) < on.width * on.height * .05
    checks.append({'files': ['label-on.png', 'label-off.png'], 'localizedLabelDifference': box, 'passed': True})

result = {'passed': True, 'checks': checks}
(root / 'independent-image-results.json').write_text(json.dumps(result, indent=2))
print('PASS', len(checks), 'independent PNG / SVG checks')
