#! /usr/bin/env node

import CLI from "./command/CLI";

try {
    CLI.runCommand(process.argv);
}
catch (err) {
    console.error(err);
}