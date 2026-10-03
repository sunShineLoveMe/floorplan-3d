"""Independent Shapely audit of saved native walk sample points (not swept paths)."""
import argparse
import hashlib
import json
import runpy
import sys
from pathlib import Path

import shapely
from shapely.geometry import Point

INDEPENDENT = runpy.run_path(str(Path(__file__).with_name("check-use-zone-exports.py")))
RADIUS_MM = 219.99
NUMERIC_EPS_MM = 0.000001


def check_trace(name, input_kind, trace, project):
    floor, obstacles, _ = INDEPENDENT["plan_space"](project)
    solids = [poly for kind, _, poly in obstacles if kind != "door"]
    failures, floor_distances, solid_distances = [], [], []
    if len(trace) < 2:
        raise ValueError("Native walk trace must contain at least two sample points")
    for i, coordinates in enumerate(trace):
        point = Point(coordinates)
        floor_distance = point.distance(floor.boundary)
        solid_distance = min((point.distance(solid) for solid in solids), default=float("inf"))
        floor_distances.append(floor_distance)
        solid_distances.append(solid_distance)
        if not floor.covers(point) or min(floor_distance, solid_distance) + NUMERIC_EPS_MM < RADIUS_MM:
            failures.append({"index": i, "positionMm": coordinates,
                             "coveredByNetFloor": floor.covers(point),
                             "floorBoundaryDistanceMm": floor_distance,
                             "solidDistanceMm": solid_distance if solids else None})
    return {"name": name, "input": input_kind, "passed": not failures, "sampleCount": len(trace),
            "minimumFloorBoundaryDistanceMm": min(floor_distances),
            "minimumSolidDistanceMm": min(solid_distances) if solids else None,
            "failedSamples": failures}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", default="docs/verification/T06-use-zones")
    args = parser.parse_args()
    root = Path(args.directory)
    sources = [(root / "browser-results.json", "keyboard"),
               (root / "joystick-layouts/browser-results.json", "joystick"),
               (root / "walk-final/walk-results.json", "benchmark")]
    missing = [str(path) for path, _ in sources if not path.exists()]
    if missing:
        raise SystemExit("Wait for all native exports before final audit; missing: " + ", ".join(missing))
    cases, hashes, source_status, source_builds = [], {}, [], {}
    for source, input_kind in sources:
        content = json.loads(source.read_text())
        source_status.append(bool(content["passed"]))
        hashes[str(source.relative_to(root))] = hashlib.sha256(source.read_bytes()).hexdigest()
        source_builds[str(source.relative_to(root))] = content.get("builds", content.get("build"))
        for result in content["results"]:
            if input_kind == "benchmark":
                name, control = result["kind"], result["input"]
                model_path = source.parent / (name + "-input.json")
                trace = result["trace"]
            else:
                walk = result.get("walk", result)
                name, control = result["name"], input_kind
                model_path = root / name / "complete-project.json"
                trace = walk["trace"]
            project = json.loads(model_path.read_text())
            hashes[str(model_path.relative_to(root))] = hashlib.sha256(model_path.read_bytes()).hexdigest()
            case = check_trace(name, control, trace, project)
            case["source"] = str(source.relative_to(root))
            case["model"] = str(model_path.relative_to(root))
            case["build"] = result.get("build", content.get("build"))
            cases.append(case)
    result = {"passed": all(source_status) and all(case["passed"] for case in cases),
              "library": "Shapely " + shapely.__version__, "productionGeometryImported": False,
              "verification": "Native recorded sample points only; not a continuous swept-path audit",
              "radiusThresholdMm": RADIUS_MM, "numericToleranceMm": NUMERIC_EPS_MM,
              "caseCount": len(cases), "sampleCount": sum(case["sampleCount"] for case in cases),
              "cases": cases, "sourceSha256": hashes, "sourceBuilds": source_builds,
              "limits": ["Real-time door leaf angles are excluded here and checked by native benchmark expectedMax assertions.",
                         "Samples do not establish that the unrecorded path between them is collision-free.",
                         "Production continuous sweep and dedicated thin-obstacle automated tests verify segment collision.",
                         "This does not establish route planning, whole-home accessibility or code compliance."]}
    (root / "independent-walk-results.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: value for key, value in result.items() if key not in {"sourceSha256", "limits"}}, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
