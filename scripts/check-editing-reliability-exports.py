"""Independently inspect T05 disk downloads against the preserved T04 inputs."""
import copy
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/verification/T05-editing-reliability')
final = root / 'final-02'
source = Path('docs/verification/T04-furniture-dimensions/final-02')
checks = []

def differences(a, b, path=''):
    if type(a) != type(b):
        return [path]
    if isinstance(a, dict):
        return [path + '.' + k for k in a.keys() ^ b.keys()] + [
            p for k in a.keys() & b.keys() for p in differences(a[k], b[k], path + '.' + k)]
    if isinstance(a, list):
        return [path + '.length'] if len(a) != len(b) else [
            p for i, (v, w) in enumerate(zip(a, b)) for p in differences(v, w, path + '[' + str(i) + ']')]
    return [path] if a != b else []

for unit in ['metric', 'imperial']:
    original = json.loads((source / 'independent-true.json').read_text())
    expected = copy.deepcopy(original)
    actual = json.loads((final / ('precise-' + unit + '.json')).read_text())
    expected['units']['display'] = unit
    expected['furniture'][0].update(cx=2111.123456789, cy=1888.987654321, name='Precise item center')
    expected['updatedAt'] = actual['updatedAt']
    assert actual == expected, differences(expected, actual)
    checks.append({'file': 'precise-' + unit + '.json', 'passed': True, 'wholeProjectEqualExceptExplicitEdits': True})

for name in ['jacobsen', 'cmu', 'plan-f']:
    original = json.loads((source / (name + '-roundtrip.json')).read_text())
    actual = json.loads((final / (name + '-roundtrip.json')).read_text())
    room_id = original['roomEditor']['rooms'][0]['id']
    paths = differences(original, actual)
    allowed = {'.updatedAt', '.rooms.' + room_id + '.name', '.geometry.rooms[0].name',
               '.furniture[' + str(len(original['furniture']) - 1) + '].cx',
               '.furniture[' + str(len(original['furniture']) - 1) + '].cy'}
    assert set(paths) == allowed, (name, paths)
    assert actual['rooms'][room_id]['name'] == actual['geometry']['rooms'][0]['name'] == 'T05 association test'
    checks.append({'file': name + '-roundtrip.json', 'passed': True, 'changedPaths': sorted(paths),
                   'allOtherValuesRetained': True})
    for mode in ['2d', '3d']:
        path = final / (name + '-' + mode + '.png')
        with Image.open(path) as image:
            image.load()
            width, height = image.size
            assert width > 300 and height > 300
            extrema = image.convert('RGB').getextrema()
            assert all(high - low > 100 for low, high in extrema)
            image.thumbnail((128, 128))
            colors = len(image.convert('RGB').getcolors(16384))
            assert colors > 50
        checks.append({'file': path.name, 'passed': True, 'decoded': True, 'width': width,
                       'height': height, 'sampleColors': colors, 'extrema': extrema})

(root / 'independent-download-results.json').write_text(json.dumps({'passed': True, 'checks': checks}, indent=2))
print('PASS ' + str(len(checks)) + ' independent full-project comparisons and decoded PNG downloads')
