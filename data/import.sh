#!/bin/bash
set -e
source ~/.nvm/nvm.sh && nvm use 26 >/dev/null
source .env.local
for f in RJTTF918 RJTTC919 RJTTC920; do
  echo "=== importing $f at $(date +%T) ==="
  npx tsx ./apps/dtd2mysql/src/index.ts --timetable ./data/feeds/$f.ZIP
done
echo "=== import complete at $(date +%T) ==="
