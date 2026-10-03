"""Independently audit T06 use-zone exports with Shapely (no production JS).

Usage: /tmp/floorplan-audit-tools/bin/python scripts/check-use-zone-exports.py
       [new-verification-directory]
Only independent-use-zone-results.json is written; source exports remain intact.
"""
import argparse
import hashlib
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

import shapely
import pymupdf
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

AREA_EPS_MM2 = 0.001
KINDS = {"bed-side", "seating", "cabinet", "appliance"}
SIDES = {"top", "right", "bottom", "left"}


def polygon(points):
    shape = Polygon(points)
    if not shape.is_valid or shape.area <= 0:
        raise ValueError("Invalid or zero-area exported polygon")
    return shape


def transform_rect(furniture, x0, y0, x1, y1):
    angle = math.radians(furniture.get("rot", 0))
    c, s = math.cos(angle), math.sin(angle)
    return polygon([
        (furniture["cx"] + x * c - y * s,
         furniture["cy"] + x * s + y * c)
        for x, y in [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    ])


def footprint(furniture):
    return transform_rect(furniture, -furniture["w"] / 2, -furniture["d"] / 2,
                          furniture["w"] / 2, furniture["d"] / 2)


def use_zone(furniture, zone):
    if zone["kind"] not in KINDS or zone["side"] not in SIDES:
        raise ValueError("Unknown explicit zone kind or side")
    width, depth, offset = zone["widthMm"], zone["depthMm"], zone["offsetMm"]
    if not all(math.isfinite(value) for value in (width, depth, offset)) or min(width, depth) <= 0:
        raise ValueError("Invalid explicit zone dimensions")
    lo, hi = offset - width / 2, offset + width / 2
    half_w, half_d = furniture["w"] / 2, furniture["d"] / 2
    bounds = {
        "top": (lo, -half_d - depth, hi, -half_d),
        "right": (half_w, lo, half_w + depth, hi),
        "bottom": (lo, half_d, hi, half_d + depth),
        "left": (-half_w - depth, lo, -half_w, hi),
    }[zone["side"]]
    return transform_rect(furniture, *bounds)


def blocks_passage(furniture):
    mode = furniture.get("clearance", {}).get("mode")
    return mode == "solid" or (mode != "ground" and furniture.get("type") != "rug")


def plan_space(project):
    geometry = project["geometry"]
    removed = set(project.get("demolished", []))
    floors = [polygon(room["poly"]) for room in geometry["rooms"]]
    openings = (geometry.get("doors", []) + geometry.get("slides", [])
                + [opening for opening in geometry.get("lintels", []) if opening.get("passage")]
                + geometry.get("passages", []))
    floors += [box(*opening["rect"]) for opening in openings]
    floors += [box(*wall[:4]) for i, wall in enumerate(geometry["walls"]) if "w" + str(i) in removed]
    obstacles = [("wall", "wall-" + str(i), box(*wall[:4]))
                 for i, wall in enumerate(geometry["walls"]) if "w" + str(i) not in removed]
    obstacles += [("wall", wall["id"], polygon(wall["poly"]))
                  for wall in geometry.get("diagonalWalls", [])]
    obstacles += [("fixed", item["id"], box(*item["rect"]))
                  for item in geometry.get("obstacles", [])]
    obstacles += [("furniture", item["id"], footprint(item))
                  for item in project["furniture"] if blocks_passage(item)]
    door_state = project.get("clearance", {}).get("doorState", "open")
    if door_state not in {"open", "closed"}:
        raise ValueError("Unknown passage door planning state")
    for door in geometry.get("doors", []):
        if door_state == "closed":
            shape = box(*door["rect"])
        else:
            h, direction, closed, length = door["h"], door["o"], door["c"], door["len"]
            end = [h[i] + direction[i] * length for i in range(2)]
            n = [v * min(20, length * 0.1) for v in closed]
            shape = polygon([[h[i] - n[i] for i in range(2)], [end[i] - n[i] for i in range(2)],
                             [end[i] + n[i] for i in range(2)], [h[i] + n[i] for i in range(2)]])
        obstacles.append(("door", door["id"], shape))
    obstacles += [("door", door["id"], box(*door["rect"]))
                  for door in geometry.get("slides", [])
                  if door_state == "closed" or door.get("style") == "bifold"]
    return unary_union(floors), obstacles, door_state


def aggregate_conflicts(conflicts):
    """One diagonal wall may be represented by several disjoint solid pieces."""
    result = defaultdict(float)
    for conflict in conflicts:
        value = conflict["overlapMm2"]
        if not math.isfinite(value) or value <= AREA_EPS_MM2:
            raise ValueError("Reported conflict must have positive area above tolerance")
        result[(conflict["kind"], conflict["id"])] += value
    return dict(result)


def audit_pdf(path):
    with pymupdf.open(path) as document:
        if len(document) != 1:
            raise ValueError("Use-zone print export must be a single page")
        page = document[0]
        if abs(page.rect.width - 1191.12) > 1 or abs(page.rect.height - 841.92) > 1:
            raise ValueError("Use-zone print export is not A3 landscape")
        text = " ".join(page.get_text().split())
        for expected in ("use zones:", "explicit planning envelopes", "not hinge or height checks",
                         "zone visibility follows the 2d toggle", "calibration ruler: 100 mm"):
            if expected not in text.lower():
                raise ValueError("Missing PDF legend text: " + expected)
        captions = page.search_for("Calibration ruler: 100 mm")
        if len(captions) != 1:
            raise ValueError("Expected one calibration ruler caption")
        caption = captions[0]
        rulers = [drawing["rect"].width for drawing in page.get_drawings()
                  if 0 < drawing["rect"].height <= 1
                  and caption.y1 <= drawing["rect"].y0 <= caption.y1 + 10
                  and abs(drawing["rect"].x0 - caption.x0) < 1
                  and 200 < drawing["rect"].width < 350]
        if len(rulers) != 1 or abs(rulers[0] - 100 * 72 / 25.4) >= 1:
            raise ValueError("PDF calibration ruler does not represent 100 mm at actual scale")
        if not all(block[3] < page.rect.height - 10 for block in page.get_text("blocks")):
            raise ValueError("PDF text reaches the bottom page crop")
        return {"pages": len(document), "rulerLengthPt": rulers[0], "legendPresent": True,
                "physicalPrinterTested": False}


def audit_case(folder):
    project = json.loads((folder / "complete-project.json").read_text())
    report = json.loads((folder / "zone-report.json").read_text())
    floor, obstacles, door_state = plan_space(project)
    expected_zones = {}
    for furniture in project["furniture"]:
        for zone in furniture.get("useZones", []):
            key = furniture["id"], zone["id"]
            if key in expected_zones:
                raise ValueError("Duplicate owner/zone ID")
            expected_zones[key] = use_zone(furniture, zone)
    actual_zones = {}
    for entry in report["zones"]:
        key = entry["furnitureId"], entry["zoneId"]
        if key in actual_zones:
            raise ValueError("Duplicate report owner/zone ID")
        actual_zones[key] = entry
    if set(expected_zones) != set(actual_zones):
        raise ValueError("Report zone IDs do not match explicit saved zones")
    if not expected_zones:
        raise ValueError("Case has no explicit use zones to audit")
    errors, checked = [], []
    for key, zone in expected_zones.items():
        actual = actual_zones[key]
        geometry_delta = zone.symmetric_difference(polygon(actual["poly"])).area
        outside = zone.difference(floor).area
        expected_conflicts = defaultdict(float)
        if outside > AREA_EPS_MM2:
            expected_conflicts[("floor", "net-floor")] = outside
        for kind, identity, obstacle in obstacles:
            if kind == "furniture" and identity == key[0]:
                continue
            overlap = zone.intersection(obstacle).area
            if overlap > AREA_EPS_MM2:
                expected_conflicts[(kind, identity)] += overlap
        actual_conflicts = aggregate_conflicts(actual["conflicts"])
        expected_status = "conflict" if expected_conflicts or outside > AREA_EPS_MM2 else "clear"
        entry_errors = []
        if geometry_delta > AREA_EPS_MM2:
            entry_errors.append("polygon differs by %.9f mm²" % geometry_delta)
        if not math.isfinite(actual["outsideMm2"]) or abs(outside - actual["outsideMm2"]) > AREA_EPS_MM2:
            entry_errors.append("outside area differs: expected %.9f, actual %s mm²" % (outside, actual["outsideMm2"]))
        if actual["status"] != expected_status:
            entry_errors.append("status differs: expected %s, actual %s" % (expected_status, actual["status"]))
        if set(expected_conflicts) != set(actual_conflicts):
            entry_errors.append("conflict IDs differ: expected %s, actual %s" %
                                (sorted(expected_conflicts), sorted(actual_conflicts)))
        for conflict_key in set(expected_conflicts) & set(actual_conflicts):
            if abs(expected_conflicts[conflict_key] - actual_conflicts[conflict_key]) > AREA_EPS_MM2:
                entry_errors.append("overlap area differs for %s: expected %.9f, actual %.9f mm²" %
                                    (conflict_key, expected_conflicts[conflict_key], actual_conflicts[conflict_key]))
        checked.append({"furnitureId": key[0], "zoneId": key[1], "status": expected_status,
                        "polygonDifferenceMm2": geometry_delta, "outsideMm2": outside,
                        "conflicts": [{"kind": kind, "id": identity, "overlapMm2": area}
                                      for (kind, identity), area in sorted(expected_conflicts.items())],
                        "passed": not entry_errors})
        errors += [{"furnitureId": key[0], "zoneId": key[1], "message": message} for message in entry_errors]
    pdf_path = folder / "print.pdf"
    pdf_result = audit_pdf(pdf_path) if pdf_path.exists() else {"verified": False, "reason": "No print.pdf export"}
    inputs = [folder / "complete-project.json", folder / "zone-report.json"]
    if pdf_path.exists():
        inputs.append(pdf_path)
    return {"name": folder.name, "passed": not errors, "doorState": door_state,
            "zoneCount": len(checked), "zones": checked, "errors": errors, "pdf": pdf_result,
            "explicitKinds": sorted({zone["kind"] for item in project["furniture"] for zone in item.get("useZones", [])}),
            "explicitSides": sorted({zone["side"] for item in project["furniture"] for zone in item.get("useZones", [])}),
            "sourceSha256": {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in inputs}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", default="docs/verification/T06-use-zones")
    args = parser.parse_args()
    root = Path(args.directory)
    folders = sorted(path.parent for path in root.glob("*/zone-report.json"))
    if not folders:
        raise SystemExit("No per-model zone-report.json exports found; nothing written.")
    cases = []
    for folder in folders:
        try:
            cases.append(audit_case(folder))
        except (ValueError, KeyError, TypeError, OSError) as error:
            cases.append({"name": folder.name, "passed": False, "errors": [str(error)]})
    result = {"passed": all(case["passed"] for case in cases), "library": "Shapely " + shapely.__version__,
              "productionGeometryImported": False, "areaToleranceMm2": AREA_EPS_MM2,
              "caseCount": len(cases), "zoneCount": sum(case.get("zoneCount", 0) for case in cases),
              "cases": cases,
              "limits": ["Audits exported 2D planning rectangles and saved door assumptions only.",
                         "No height, cabinet hinge, real appliance travel or code compliance inference.",
                         "Does not validate native keyboard/joystick movement or rendering."]}
    (root / "independent-use-zone-results.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"passed": result["passed"], "cases": [
        {key: value for key, value in case.items() if key != "zones"} for case in cases]}, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
