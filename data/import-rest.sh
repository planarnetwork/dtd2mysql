#!/bin/bash
set -e
source ~/.nvm/nvm.sh && nvm use 26 >/dev/null
source .env.local
for f in RJFAF847 RJFAC848 RJFAC849; do
  echo "=== fares: $f at $(date +%T) ==="
  npx tsx ./apps/dtd2mysql/src/index.ts --fares ./data/feeds/$f.ZIP
done
echo "=== routeing: RJRG1057 at $(date +%T) ==="
npx tsx ./apps/dtd2mysql/src/index.ts --routeing ./data/feeds/RJRG1057.ZIP
echo "=== all imports complete at $(date +%T) ==="
