#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

$DIR/../uk-rail-import/node_modules/.bin/ts-node $DIR/../uk-rail-import/src/index.ts "$@"