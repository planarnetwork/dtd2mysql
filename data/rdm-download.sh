#!/bin/bash
# Download the files behind a Rail Data Marketplace data product.
#
# RDM has no password grant - its portal client requires an interactive
# authorization code flow - so this takes a token you copy out of the browser.
# In the portal, open the product's data files page, then from devtools copy the
# `authorization: Bearer ...` header off any request. It lasts an hour.
#
# The durable answer is the product's own cloud delivery, which pushes files to
# a bucket you own on a schedule and needs nobody logged in. Use this to get
# started and to see what the files look like.
#
# Usage: RDM_TOKEN=... data/rdm-download.sh <dataProductCode> <dsCode> <prefix> [dir]
#
# The prefix matters. A product holds more than one family of file - this one
# carries 118 NLC snapshots and 3 passenger-consist logs - and they are dated
# independently, so the newest file overall is rarely the newest of the family
# you wanted.
set -euo pipefail

: "${RDM_TOKEN:?Set RDM_TOKEN to a Bearer token copied from the portal}"

PRODUCT="${1:?usage: rdm-download.sh <dataProductCode> <dsCode> <prefix> [dir]}"
DATASET="${2:?usage: rdm-download.sh <dataProductCode> <dsCode> <prefix> [dir]}"
PREFIX="${3:?usage: rdm-download.sh <dataProductCode> <dsCode> <prefix> [dir]}"
OUT="${4:-data/rdm}"
API=https://raildata.org.uk/ContractManagementService

mkdir -p "$OUT"

payload() {
  printf '{"dsCode":"%s","dataProductCode":"%s","dsStatus":"Active"%s}' "$DATASET" "$PRODUCT" "${1:-}"
}

call() {
  curl -sSf -m 120 -X POST "$API/$1" \
    -H "authorization: Bearer $RDM_TOKEN" \
    -H "content-type: application/json" \
    -d "$2"
}

echo "Listing files"
listing=$(call cloudstore/listfiles "$(payload)")

# Within one family the name sorts chronologically, because the date is in it.
# Across families it does not, which is why the prefix is required rather than
# optional - sorting the whole listing returns whichever family sorts last.
latest=$(printf '%s' "$listing" | PREFIX="$PREFIX" python3 -c "
import json, os, sys
prefix = os.environ['PREFIX']
names = sorted(f['fileName'] for f in json.load(sys.stdin) if f['fileName'].startswith(prefix))
if not names:
    sys.exit(f'No file starts with {prefix}')
print(names[-1])
")

echo "Latest is $latest"

if [ -f "$OUT/$latest" ]; then
  echo "Already have it"
  exit 0
fi

# The signed URL is good for 30 minutes and is not the file: it is a redirect
# into Google Cloud Storage that carries its own authorisation, so the token
# must not be sent with it.
signed=$(call cloudstore/generate/signedurl/download "$(payload ",\"fileName\":\"$latest\"")" | tr -d '"')

echo "Downloading"
curl -sSf -m 900 -o "$OUT/$latest.partial" "$signed"
mv "$OUT/$latest.partial" "$OUT/$latest"

ls -la "$OUT/$latest"
