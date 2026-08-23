#!/bin/bash
# Build a GTFS feed from the current database and fingerprint it.
# Usage: data/snapshot-gtfs.sh <output-dir>
#
# GTFS_TODAY pins the build date, so this is reproducible on any day. The
# raw feed is kept alongside the fingerprint so a later comparison does not have
# to rebuild - which is why data/snapshots/gtfs-* is gitignored and the
# db-* fingerprints are not.
set -euo pipefail

OUT="${1:?usage: snapshot-gtfs.sh <output-dir>}"
mkdir -p "$OUT/feed"

source ~/.nvm/nvm.sh && nvm use 26 >/dev/null
source .env.local

echo "building at $(date +%FT%T) with GTFS_RANGE=${GTFS_RANGE:-3 MONTH}"
yarn build

npx tsx ./apps/dtd2mysql/src/index.ts --gtfs "$OUT/feed"

{
  printf 'built_at\t%s\n' "$(date -u +%FT%TZ)"
  printf 'git_commit\t%s\n' "$(git rev-parse HEAD)"
  printf 'gtfs_range\t%s\n' "${GTFS_RANGE:-3 MONTH}"
} > "$OUT/build-info.tsv"

# Two hashes per file: raw (byte-exact) and sorted (order-independent), so a
# change in row ordering can be told apart from a change in content.
printf 'file\trows\tsha256_raw\tsha256_sorted\n' > "$OUT/files.tsv"
for f in "$OUT"/feed/*.txt; do
  n=$(basename "$f")
  rows=$(( $(wc -l < "$f") - 1 ))
  raw=$(sha256sum "$f" | cut -d' ' -f1)
  sorted=$( { head -1 "$f"; tail -n +2 "$f" | sort; } | sha256sum | cut -d' ' -f1)
  printf '%s\t%s\t%s\t%s\n' "$n" "$rows" "$raw" "$sorted" >> "$OUT/files.tsv"
done

column -t -s$'\t' "$OUT/files.tsv"
