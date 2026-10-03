"""Check actual T07 downloads against their source JSON without production JS."""
import argparse
import hashlib
import json
from pathlib import Path


def stable(project):
    result = dict(project)
    result.pop("updatedAt", None)
    result["view"] = {key: value for key, value in result["view"].items() if key != "mode"}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", default="docs/verification/T07-save-recovery")
    root = Path(parser.parse_args().directory)
    browser = json.loads((root / "final/browser-results.json").read_text())
    cases = []
    for name, source in browser["sourceFiles"]:
        target = root / "final" / (name + "-roundtrip.json")
        original, downloaded = json.loads(Path(source).read_text()), json.loads(target.read_text())
        cases.append({"name": name, "passed": stable(original) == stable(downloaded),
                      "comparedKeys": sorted(stable(original)), "source": source,
                      "download": str(target.relative_to(root)),
                      "sourceSha256": hashlib.sha256(Path(source).read_bytes()).hexdigest(),
                      "downloadSha256": hashlib.sha256(target.read_bytes()).hexdigest()})
    for name, expected in [("corrupt-original.json", "{original damaged bytes"),
                           ("corrupt-v1-original.json", "damaged original v1")]:
        cases.append({"name": name, "passed": (root / "final" / name).read_bytes() == expected.encode()})
    result = {"passed": browser["passed"] and all(case["passed"] for case in cases),
              "build": browser["build"], "productionJavaScriptImported": False,
              "caseCount": len(cases), "cases": cases,
              "excludedChanges": ["updatedAt is refreshed on reviewed import", "view.mode changes during the explicit 2D/3D checks"],
              "limits": ["Byte and JSON parameter comparisons; native browser results establish recovery UI and file reimport behavior."]}
    (root / "independent-download-results.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"passed": result["passed"], "cases": len(cases), "build": result["build"]}))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
