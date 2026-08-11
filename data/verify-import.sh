#!/bin/bash
# T6b: import the feeds and assert the database is what the baseline says.
#
# The check the importer never had. Every claim made about it so far - B22 most
# of all, which rewrote how every generated id is assigned - was verified by
# importing zips by hand and reading two outputs side by side. This does it in
# one command and answers yes or no.
#
# Usage: data/verify-import.sh <baseline-dir> [feed.ZIP ...]
#   data/verify-import.sh data/snapshots/db-RJTTF918-C920 \
#     data/feeds/RJTTF918.ZIP data/feeds/RJTTC920.ZIP
set -euo pipefail

BASELINE="${1:?usage: verify-import.sh <baseline-dir> [feed.ZIP ...]}"
shift
FEEDS=("$@")

: "${DATABASE_NAME:=dtd2mysql_verify}"
: "${DATABASE_HOSTNAME:=127.0.0.1}"
: "${DATABASE_USERNAME:=root}"
: "${DATABASE_PASSWORD:=}"
export DATABASE_NAME DATABASE_HOSTNAME DATABASE_USERNAME DATABASE_PASSWORD

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "Importing ${#FEEDS[@]} feed(s) into $DATABASE_NAME"

for feed in "${FEEDS[@]}"; do
  case "$(basename "$feed")" in
    RJTT*) flag=--timetable ;;
    RJFA*) flag=--fares ;;
    RJRG*) flag=--routeing ;;
    nfm64*) flag=--nfm64 ;;
    *) echo "Cannot tell which feed $feed is"; exit 1 ;;
  esac

  echo "  $flag $(basename "$feed")"
  yarn tsx apps/dtd2mysql/src/index.ts "$flag" "$feed" > "$WORK/import.log" 2>&1 \
    || { tail -20 "$WORK/import.log"; exit 1; }
done

data/snapshot-db.sh "$WORK/actual"

# The row counts and hashes are the assertion; the schema is compared too, since
# a column that quietly changed type would not move a single row hash.
failed=0

for file in tables.tsv columns.tsv schema.sql; do
  if diff -u "$BASELINE/$file" "$WORK/actual/$file" > "$WORK/$file.diff"; then
    echo "  $file matches"
  else
    failed=1
    echo
    echo "$file differs from $BASELINE:"
    head -40 "$WORK/$file.diff"
    lines=$(wc -l < "$WORK/$file.diff")
    [ "$lines" -gt 40 ] && echo "  ... $((lines - 40)) more lines"
  fi
done

if [ "$failed" -ne 0 ]; then
  echo
  echo "The import changed. If that was the point, rebaseline under T8:"
  echo "  data/snapshot-db.sh $BASELINE"
  echo "and add an entry to apps/dtd2gtfs/fixtures/BASELINE.md saying which ticket and why."
  exit 1
fi

echo
echo "Import matches $BASELINE."
