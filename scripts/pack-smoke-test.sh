#!/bin/bash
# Pack every workspace, install the dtd2mysql tarball into a clean directory and
# run the CLI from it.
#
# Tests execute against source, so main/types/bin/files breakage is invisible to
# them. This is the cheapest thing that is not.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cd "$ROOT"
yarn build

mkdir -p "$WORK/tarballs"
for pkg in @gb-rail/feed-parser @gb-rail/dtd-schema @gb-rail/dtd-source \
           @gb-rail/gtfs @gb-rail/gtfs-output dtd2mysql; do
  out="$WORK/tarballs/$(basename "$pkg").tgz"
  yarn workspace "$pkg" pack --out "$out" >/dev/null
done

# The @gb-rail packages are not on the registry yet, so point npm at the tarballs
# we just built rather than letting it try to resolve them.
mkdir -p "$WORK/install"
cd "$WORK/install"
cat > package.json <<EOF
{
  "name": "dtd2mysql-pack-smoke-test",
  "private": true,
  "version": "1.0.0",
  "overrides": {
    "@gb-rail/feed-parser": "file:$WORK/tarballs/feed-parser.tgz",
    "@gb-rail/dtd-schema": "file:$WORK/tarballs/dtd-schema.tgz",
    "@gb-rail/dtd-source": "file:$WORK/tarballs/dtd-source.tgz",
    "@gb-rail/gtfs": "file:$WORK/tarballs/gtfs.tgz",
    "@gb-rail/gtfs-output": "file:$WORK/tarballs/gtfs-output.tgz"
  }
}
EOF

npm install --no-audit --no-fund "$WORK/tarballs/dtd2mysql.tgz" >/dev/null

output="$(./node_modules/.bin/dtd2mysql --help)"

echo "$output" | head -2
echo "$output" | grep -q "Usage: dtd2mysql" || { echo "FAIL: --help did not print usage"; exit 1; }
echo "$output" | grep -q -- "--gtfs-zip" || { echo "FAIL: --help is missing flags"; exit 1; }

echo "PASS: packaged tarball installs and runs"
