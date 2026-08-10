#!/bin/bash
# Cross-reference the restructured tree against master.
#
# The restructure is meant to be a pure move: same GTFS feed, same CLI surface,
# same tests. This checks all three by running master and the working tree side
# by side against the same database, on the same day.
#
# The GTFS build filters on CURDATE(), so the two runs must happen on the same
# calendar day for the comparison to mean anything - ticket T1 removes that
# constraint. Two consecutive runs of the same code on the same day are
# byte-identical, so any difference here is a real one.
#
# Usage: scripts/verify-against-master.sh [master-ref]
#   Requires .env.local with the database settings and an imported timetable.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${1:-master}"
WORK="${VERIFY_WORKDIR:-$(mktemp -d)}"
OLD="$WORK/old"
NEW="$WORK/new"
TREE="$WORK/master-tree"

cd "$ROOT"
mkdir -p "$OLD" "$NEW"
set -a; source .env.local; set +a

fail=0
check() {
  if [ "$1" = 0 ]; then echo "  PASS  $2"; else echo "  FAIL  $2"; fail=1; fi
}

echo "== checking out $REF into $TREE"
git worktree add --detach "$TREE" "$REF" >/dev/null
cleanup() { cd "$ROOT"; git worktree remove --force "$TREE" >/dev/null 2>&1; }
trap cleanup EXIT

echo "== building the feed with $REF"
( cd "$TREE" && npm ci --silent && npx tsx ./src/index.ts --gtfs "$OLD" ) > "$WORK/old.log" 2>&1
check $? "$REF build completed"

echo "== building the feed with the working tree"
yarn build >/dev/null
( cd "$ROOT/apps/dtd2mysql" && npx tsx ./src/index.ts --gtfs "$NEW" ) > "$WORK/new.log" 2>&1
check $? "working tree build completed"

echo
echo "== GTFS output"
( cd "$OLD" && sha256sum *.txt | sort -k2 ) > "$WORK/old.sha256"
( cd "$NEW" && sha256sum *.txt | sort -k2 ) > "$WORK/new.sha256"
diff "$WORK/old.sha256" "$WORK/new.sha256" > "$WORK/gtfs.diff"
check $? "every output file is byte-identical"
[ -s "$WORK/gtfs.diff" ] && cat "$WORK/gtfs.diff"
sed 's/^/    /' "$WORK/new.sha256"

echo
echo "== CLI surface"
( cd "$TREE" && npx tsx ./src/index.ts --help ) > "$WORK/old.help" 2>&1
( cd "$ROOT/apps/dtd2mysql" && npx tsx ./src/index.ts --help ) > "$WORK/new.help" 2>&1
diff "$WORK/old.help" "$WORK/new.help"
check $? "--help output is identical"

grep -o -- 'case "--[a-z0-9-]*"' "$TREE/src/cli/Container.ts" | sort > "$WORK/old.flags"
grep -o -- 'case "--[a-z0-9-]*"' "$ROOT/apps/dtd2mysql/src/container.ts" | sort > "$WORK/new.flags"
diff "$WORK/old.flags" "$WORK/new.flags"
check $? "the same set of flags is handled ($(wc -l < "$WORK/new.flags") flags)"

echo
echo "== tests"
# Names only: the files they live in have moved, which is the point.
list_tests() {
  ( cd "$1" && npx vitest list --json ) \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s);if(!t.length)process.exit(1);console.log(t.map(x=>x.name).sort().join("\n"))})'
}
list_tests "$TREE" > "$WORK/old.tests"
check $? "$REF test list is not empty"
list_tests "$ROOT" > "$WORK/new.tests"
check $? "working tree test list is not empty"
diff "$WORK/old.tests" "$WORK/new.tests"
check $? "the same tests exist ($(grep -c . < "$WORK/new.tests") tests)"

echo
if [ "$fail" = 0 ]; then
  echo "ALL CHECKS PASSED - the restructure did not change behaviour"
else
  echo "CHECKS FAILED - see $WORK"
  trap - EXIT
fi
exit "$fail"
