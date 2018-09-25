#!/bin/sh
":" //# comment; exec /usr/bin/env node --max_old_space_size=4000 "$0" "$@"
require("../dist/src/cli.js");