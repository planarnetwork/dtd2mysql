#!/bin/bash
# Download a feed into data/feeds.
# Usage: data/download.sh <flag> [timeout-seconds]
#
# The timeout used to be load bearing: the download command left its database
# pool open and hung once the transfer finished. B17 fixed that, so it is now
# only a bound on a slow transfer.
set -u

FLAG="${1:?usage: download.sh --download-fares 900}"
LIMIT="${2:-900}"

source ~/.nvm/nvm.sh && nvm use 26 >/dev/null
source .env.local

echo "=== $FLAG at $(date +%T) ==="
timeout "$LIMIT" npx tsx ./apps/dtd2mysql/src/index.ts "$FLAG" ./data/feeds/
echo "=== stopped at $(date +%T) (timeout is expected: the pool is never closed) ==="
