#!/usr/bin/env bash

#Save this script as build-ego.sh inside your extension directory (~/.local/share/gnome-shell/extensions/clipboard-line-#cleaner@epiphanius.github.io/), (resides now in store ~/bin) make it executable (chmod +x build-ego.sh), and run it whenever you want to produce a clean EGO upload #package.
#It builds everything in a /tmp staging directory, sets "version": 8 and a valid "shell-version" in the staged metadata.json, excludes #schemas/gschemas.compiled (avoiding EGO-P-006), runs shexli on the staging folder before zipping, and leaves your local installation #untouched at "version": 999.


set -euo pipefail

UUID="clipboard-line-cleaner@epiphanius.github.io"
EGO_VERSION=8
SHELL_VERSIONS='["49", "50", "51"]'

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$(mktemp -d /tmp/ego-build.XXXXXX)"
OUT_ZIP="${HOME}/${UUID}.shell-extension.zip"

cleanup() {
    rm -rf "${BUILD_DIR}"
}
trap cleanup EXIT

echo "Staging files in ${BUILD_DIR}..."
mkdir -p "${BUILD_DIR}/schemas"

cp "${SRC_DIR}/extension.js" "${BUILD_DIR}/"
cp "${SRC_DIR}/prefs.js" "${BUILD_DIR}/"
cp "${SRC_DIR}/schemas/"*.gschema.xml "${BUILD_DIR}/schemas/"

# Generate clean metadata.json for EGO (version 8, no _generated, valid shell-version)
python3 - "${SRC_DIR}/metadata.json" "${BUILD_DIR}/metadata.json" "${EGO_VERSION}" "${SHELL_VERSIONS}" <<'PY'
import json
import sys

src_path, dst_path, version, shell_versions = sys.argv[1:]
with open(src_path, "r", encoding="utf-8") as f:
    meta = json.load(f)

meta.pop("_generated", None)
meta["version"] = int(version)
meta["shell-version"] = json.loads(shell_versions)

with open(dst_path, "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)
    f.write("\n")
PY

if command -v shexli >/dev/null 2>&1; then
    echo "Running shexli check on staged package..."
    shexli "${BUILD_DIR}" || true
fi

rm -f "${OUT_ZIP}"
(
    cd "${BUILD_DIR}"
    zip -rq "${OUT_ZIP}" .
)

# Ensure local schema stays compiled for the live installation
glib-compile-schemas "${SRC_DIR}/schemas/"

echo "Done! Clean EGO archive created at: ${OUT_ZIP}"
unzip -l "${OUT_ZIP}"
