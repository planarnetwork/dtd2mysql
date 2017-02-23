#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

$DIR/../node_modules/.bin/ts-node $DIR/../src/index.ts "$@"