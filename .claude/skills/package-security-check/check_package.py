#!/usr/bin/env python3
"""
check_package.py - Check whether a package is safe to install.

Data sources (all free, no API key):
  1. OSV.dev          -> known vulnerabilities (ground truth: CVEs/GHSAs)
  2. deps.dev         -> package metadata + OpenSSF Scorecard (health score 0-10)

Usage:
  python3 check_package.py <package-name> [version] [--ecosystem npm]

Examples:
  python3 check_package.py lodash 4.17.20
  python3 check_package.py express
  python3 check_package.py requests 2.19.0 --ecosystem PyPI

Exit codes:
  0 = SECURE   (no known vulnerabilities, acceptable health score)
  1 = WARNING  (known vulnerabilities and/or low health score)
  2 = ERROR    (network failure, package not found, etc.)
"""

import argparse
import json
import sys
import urllib.parse
import urllib.request

OSV_API = "https://api.osv.dev/v1/query"
DEPSDEV_API = "https://api.deps.dev/v3"
SCORECARD_WARN_THRESHOLD = 4.0  # warn if OpenSSF score is below this
TIMEOUT = 15


def http_json(url, payload=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Content-Type": "application/json",
                 "User-Agent": "package-security-check"},
        method="POST" if payload is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode())


def get_latest_version(name, ecosystem):
    """Resolve the default/latest version from deps.dev."""
    url = f"{DEPSDEV_API}/systems/{ecosystem}/packages/{urllib.parse.quote(name, safe='')}"
    data = http_json(url)
    for v in data.get("versions", []):
        if v.get("isDefault"):
            return v["versionKey"]["version"]
    versions = data.get("versions", [])
    return versions[-1]["versionKey"]["version"] if versions else None


def query_osv(name, version, ecosystem):
    """Return list of known vulnerabilities for this package version."""
    payload = {"package": {"name": name, "ecosystem": ecosystem}}
    if version:
        payload["version"] = version
    data = http_json(OSV_API, payload)
    return data.get("vulns", [])


def query_scorecard(name, version, ecosystem):
    """Return (score, repo) from deps.dev's OpenSSF Scorecard data, or (None, None)."""
    url = (
        f"{DEPSDEV_API}/systems/{ecosystem}/packages/"
        f"{urllib.parse.quote(name, safe='')}/versions/{urllib.parse.quote(version, safe='')}"
    )
    data = http_json(url)
    for project in data.get("relatedProjects", []):
        project_key = project.get("projectKey", {}).get("id")
        if not project_key:
            continue
        try:
            pdata = http_json(
                f"{DEPSDEV_API}/projects/{urllib.parse.quote(project_key, safe='')}")
        except Exception:
            continue
        scorecard = pdata.get("scorecard")
        if scorecard and "overallScore" in scorecard:
            return scorecard["overallScore"], project_key
    return None, None


def severity_label(vuln):
    """Best-effort severity extraction from an OSV record."""
    sev = vuln.get("database_specific", {}).get("severity")
    if sev:
        return sev.upper()
    for s in vuln.get("severity", []):
        if s.get("type", "").startswith("CVSS"):
            return f"CVSS {s.get('score', '?')}"
    return "UNKNOWN"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("package")
    parser.add_argument("version", nargs="?", default=None)
    parser.add_argument("--ecosystem", default="npm",
                        help="npm (default), PyPI, Go, Maven, NuGet, RubyGems, crates.io")
    parser.add_argument("--json", action="store_true",
                        help="machine-readable output")
    args = parser.parse_args()

    name, version, eco = args.package, args.version, args.ecosystem
    result = {"package": name, "ecosystem": eco, "version": version,
              "vulnerabilities": [], "scorecard": None, "verdict": None, "notes": []}

    # Resolve version if not given (needed for precise OSV + scorecard lookup)
    if not version:
        try:
            version = get_latest_version(name, eco)
            result["version"] = version
            result["notes"].append(
                f"No version specified; checked latest ({version}).")
        except Exception as e:
            result["notes"].append(f"Could not resolve latest version: {e}")

    # 1. Known vulnerabilities (OSV) — this is the authoritative check
    try:
        vulns = query_osv(name, version, eco)
        for v in vulns:
            result["vulnerabilities"].append({
                "id": v.get("id"),
                "summary": (v.get("summary") or v.get("details", ""))[:140],
                "severity": severity_label(v),
            })
    except Exception as e:
        result["notes"].append(f"OSV query failed: {e}")
        result["verdict"] = "ERROR"

    # 2. Health score (OpenSSF Scorecard via deps.dev) — heuristic signal
    if version:
        try:
            score, repo = query_scorecard(name, version, eco)
            if score is not None:
                result["scorecard"] = {"score": score, "repo": repo}
            else:
                result["notes"].append(
                    "No OpenSSF Scorecard available (no scored GitHub repo).")
        except Exception as e:
            result["notes"].append(f"Scorecard lookup failed: {e}")

    # Verdict
    if result["verdict"] != "ERROR":
        vuln_count = len(result["vulnerabilities"])
        low_score = (result["scorecard"] is not None
                     and result["scorecard"]["score"] < SCORECARD_WARN_THRESHOLD)
        result["verdict"] = "WARNING" if (
            vuln_count or low_score) else "SECURE"

    # Output
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        v = result["verdict"]
        icon = {"SECURE": "[OK]", "WARNING": "[!!]", "ERROR": "[??]"}[v]
        print(f"{icon} {v}: {name}@{result['version'] or '?'} ({eco})")
        if result["vulnerabilities"]:
            print(
                f"\nKnown vulnerabilities ({len(result['vulnerabilities'])}):")
            for vu in result["vulnerabilities"]:
                print(f"  - {vu['id']} [{vu['severity']}] {vu['summary']}")
        if result["scorecard"]:
            sc = result["scorecard"]
            flag = " (below threshold!)" if sc["score"] < SCORECARD_WARN_THRESHOLD else ""
            print(
                f"\nOpenSSF Scorecard: {sc['score']}/10{flag}  repo: {sc['repo']}")
        for note in result["notes"]:
            print(f"note: {note}")

    sys.exit({"SECURE": 0, "WARNING": 1, "ERROR": 2}[result["verdict"]])


if __name__ == "__main__":
    main()
