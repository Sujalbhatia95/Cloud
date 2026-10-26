#!/usr/bin/env bash
# Renders all demo imagery into public/demo (original CGI created for this project).
# Requires: python -m pip install bpy==5.2.3   (Blender as a Python module)
set -euo pipefail
PY="${BLENDER_PYTHON:-python3}"
OUT="$(cd "$(dirname "$0")/../.." && pwd)/public/demo"
mkdir -p "$OUT"
DIR="$(cd "$(dirname "$0")" && pwd)"
"$PY" "$DIR/scene_buildings.py" --out "$OUT"
"$PY" "$DIR/scene_interiors.py" --out "$OUT"
"$PY" "$DIR/scene_villa.py" --out "$OUT"
echo "All renders written to $OUT"
