import { promisify } from "util";
import { Transform, TransformCallback } from "stream";
import parse = require("csv-parse");
import stringify = require("csv-stringify");
import * as fs from "fs";

const exec = promisify(require("child_process").exec);
const input = process.argv[2];

async function main() {
    await exec("unzip -uo " + input + " -d /tmp/", { maxBuffer: Number.MAX_SAFE_INTEGER });

    const transform = new Transform({
        objectMode: true,
        transform: (chunk: any, encoding: string, callback: TransformCallback) => {
            callback(null, [chunk[0], chunk[1], chunk[4], chunk[10], chunk[14], chunk[18], chunk[19], chunk[29], chunk[30]]);
        }
    });

    fs
        .createReadStream("/tmp/Stops.csv", "utf8")
        .pipe(parse()).on("error", e => console.error(e))
        .pipe(transform).on("error", e => console.error(e))
        .pipe(stringify()).on("error", e => console.error(e))
        .pipe(fs.createWriteStream("resource/Stops.csv")).on("error", e => console.error(e))
        .on("finish", () => {
            exec("zip -jm resource/Stops.zip resource/Stops.csv", { maxBuffer: Number.MAX_SAFE_INTEGER });
        });

}

main().catch(e => console.log(e));
