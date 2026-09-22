#!/usr/bin/env python3
"""Verify direct Go imports without requiring a global linter installation."""
import json
import subprocess
import sys

module = "github.com/hofchurchng/church-backend"
result = subprocess.run(["go", "list", "-json", "./internal/...", "./cmd/..."], text=True, capture_output=True)
if result.returncode:
    sys.stderr.write(result.stderr)
    sys.exit(result.returncode)
decoder = json.JSONDecoder()
remaining = result.stdout
failures = []
while remaining.strip():
    package, end = decoder.raw_decode(remaining.lstrip())
    remaining = remaining.lstrip()[end:]
    path = package["ImportPath"]
    is_v2 = path.startswith(module + "/internal/v2/") or path in [module + "/cmd/" + name for name in ("server-v2", "migrate-v2", "seed-v2")]
    for dependency in package.get("Imports", []):
        if not dependency.startswith(module + "/internal/"):
            continue
        dependency_v2 = dependency.startswith(module + "/internal/v2/")
        if is_v2 != dependency_v2:
            failures.append(f"{path} crosses the V1/V2 boundary via {dependency}")
        if is_v2 and not path.endswith("/cmd/seed-v2") and dependency.endswith("/v2/fixtures"):
            failures.append(f"{path} imports synthetic fixtures outside the seed command")
if failures:
    sys.exit("\n".join(failures))
print("V1/V2 import boundaries passed; runtime packages do not import fixtures.")
