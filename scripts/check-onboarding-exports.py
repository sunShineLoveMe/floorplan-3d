"""Independently parse the actual T08 JSON and PNG downloads; never read browser state."""
import copy
import json
import math
import sys
from pathlib import Path
from PIL import Image

root = Path(sys.argv[1])
checks = []
for name in ['task-backup', 'task-1024', 'task-390', 'task-320']:
    p = json.loads((root / (name + '.json')).read_text())
    r, f, door = p['roomEditor'], p['furniture'][0], p['roomEditor']['openings'][0]
    assert p['format'] == 'floorplan-3d' and p['version'] == 2
    assert p['units'] == {'internal': 'mm', 'display': 'imperial'}
    for actual, expected in [(r['width'], 3657.6), (r['depth'], 3048), (p['geometry']['height'], 2438.4),
                             (door['width'], 914.4), (door['height'], 2133.6), (door['offset'], 609.6),
                             (f['w'], 1527.175), (f['d'], 2041.525), (f['cx'], 1981.2), (f['cy'], 1778)]:
        assert math.isclose(actual, expected, abs_tol=1e-9), (name, actual, expected)
    assert 'height' not in f
    assert len(p['furniture']) == 1 and len(r['openings']) == 1
    checks.append({'file': name + '.json', 'passed': True, 'unknownHeightRemainsAbsent': True})

for name in ['jacobsen', 'cmu', 'plan-f']:
    source = json.loads((Path('docs/verification/T06-use-zones') / name / 'complete-project.json').read_text())
    actual = json.loads((root / (name + '-roundtrip.json')).read_text())
    expected = copy.deepcopy(source)
    expected['updatedAt'] = actual['updatedAt']
    expected['view']['mode'] = '2d'
    assert actual == expected, name + ': unexpected source-data change'
    checks.append({'file': name + '-roundtrip.json', 'passed': True,
                   'allSourceFieldsPreservedExceptExplicit2dViewAndUpdatedAt': True})
    path = root / (name + '-2d.png')
    with Image.open(path) as image:
        image.load()
        width, height = image.size
        assert width > 300 and height > 300
        extrema = image.convert('RGB').getextrema()
        assert all(high - low > 100 for low, high in extrema)
        image.thumbnail((128, 128))
        colors = len(image.convert('RGB').getcolors(16384))
        assert colors > 50
    checks.append({'file': path.name, 'passed': True, 'decoded': True,
                   'width': width, 'height': height, 'sampleColors': colors})
assert (root / 'corrupt-original.json').read_text() == 'broken-saved-json'
checks.append({'file': 'corrupt-original.json', 'passed': True, 'originalBytesPreserved': True})
backup = json.loads((root / 'failed-save-backup.json').read_text())
assert len(backup['furniture']) == 2
checks.append({'file': 'failed-save-backup.json', 'passed': True, 'unsavedEditsIncluded': True})
result = {'passed': True, 'checks': checks}
(root.parent / 'independent-download-results.json').write_text(json.dumps(result, indent=2))
print('PASS', len(checks), 'independent disk JSON / PNG checks')
