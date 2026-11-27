#!/usr/bin/env python3
"""
SafeHER Software Bill of Materials (SBOM) Generator
===================================================
Generates a standard CycloneDX v1.5 compliant JSON SBOM covering both:
1. Python Backend Dependencies (FastAPI, PyCryptodome, Torch, C2PA, etc.)
2. Node.js Frontend Dependencies (React, Vite, Lucide, Tailwind, etc.)
"""

import argparse
import datetime
import json
import os
import sys
import uuid
from typing import Any, Dict, List


def parse_python_requirements(req_path: str) -> List[Dict[str, Any]]:
    components = []
    if not os.path.exists(req_path):
        return components

    raw_content = ""
    for enc in ("utf-8", "utf-16", "utf-8-sig", "latin-1"):
        try:
            with open(req_path, "r", encoding=enc) as f:
                raw_content = f.read()
                break
        except UnicodeError:
            continue

    for line in raw_content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "==" in line:
                name, version = line.split("==", 1)
                components.append({
                    "type": "library",
                    "bom-ref": f"pkg:pypi/{name.strip()}@{version.strip()}",
                    "name": name.strip(),
                    "version": version.strip(),
                    "purl": f"pkg:pypi/{name.strip()}@{version.strip()}",
                    "scope": "required",
                    "description": f"Python dependency for SafeHER backend: {name.strip()}",
                })
            elif ">=" in line:
                name, version = line.split(">=", 1)
                components.append({
                    "type": "library",
                    "bom-ref": f"pkg:pypi/{name.strip()}@{version.strip()}",
                    "name": name.strip(),
                    "version": version.strip(),
                    "purl": f"pkg:pypi/{name.strip()}@{version.strip()}",
                    "scope": "required",
                    "description": f"Python dependency for SafeHER backend: {name.strip()}",
                })
    return components


def parse_frontend_package_json(pkg_path: str) -> List[Dict[str, Any]]:
    components = []
    if not os.path.exists(pkg_path):
        return components

    with open(pkg_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    deps = data.get("dependencies", {})
    dev_deps = data.get("devDependencies", {})

    for name, ver in deps.items():
        clean_ver = ver.lstrip("^~>=<")
        components.append({
            "type": "library",
            "bom-ref": f"pkg:npm/{name}@{clean_ver}",
            "name": name,
            "version": clean_ver,
            "purl": f"pkg:npm/{name}@{clean_ver}",
            "scope": "required",
            "description": f"Production npm dependency for SafeHER UI: {name}",
        })

    for name, ver in dev_deps.items():
        clean_ver = ver.lstrip("^~>=<")
        components.append({
            "type": "library",
            "bom-ref": f"pkg:npm/{name}@{clean_ver}",
            "name": name,
            "version": clean_ver,
            "purl": f"pkg:npm/{name}@{clean_ver}",
            "scope": "optional",
            "description": f"Development build tool for SafeHER UI: {name}",
        })

    return components


def generate_sbom(req_path: str, pkg_path: str, output_path: str) -> Dict[str, Any]:
    py_components = parse_python_requirements(req_path)
    npm_components = parse_frontend_package_json(pkg_path)

    all_components = py_components + npm_components
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    sbom = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": f"urn:uuid:{uuid.uuid4()}",
        "version": 1,
        "metadata": {
            "timestamp": now_iso,
            "tools": [
                {
                    "vendor": "SafeHER Architecture Team",
                    "name": "SafeHER SBOM Generator",
                    "version": "3.0.0",
                }
            ],
            "component": {
                "type": "application",
                "bom-ref": "pkg:generic/safeher@3.0.0",
                "name": "SafeHER Digital Safety Platform",
                "version": "3.0.0",
                "description": "AI-Powered Digital Safety and Abuse Mitigation Platform for Survivors of Abuse",
                "licenses": [
                    {
                        "license": {
                            "id": "MIT",
                            "name": "MIT License",
                        }
                    }
                ],
            },
        },
        "components": all_components,
        "summary": {
            "total_components": len(all_components),
            "python_backend_components": len(py_components),
            "frontend_npm_components": len(npm_components),
        },
    }

    if output_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(sbom, f, indent=2)

    return sbom


def main():
    parser = argparse.ArgumentParser(description="Generate SafeHER CycloneDX SBOM")
    parser.add_argument("--req", default=os.path.join("backend", "requirements.txt"), help="Path to backend requirements.txt")
    parser.add_argument("--pkg", default=os.path.join("frontend", "package.json"), help="Path to frontend package.json")
    parser.add_argument("--out", default="sbom.json", help="Output path for sbom.json")
    args = parser.parse_args()

    sbom = generate_sbom(args.req, args.pkg, args.out)
    print(f"[OK] CycloneDX SBOM successfully generated at: {args.out}")
    print(f"     Total components: {sbom['summary']['total_components']}")
    print(f"     Backend Python packages: {sbom['summary']['python_backend_components']}")
    print(f"     Frontend npm packages: {sbom['summary']['frontend_npm_components']}")


if __name__ == "__main__":
    main()
